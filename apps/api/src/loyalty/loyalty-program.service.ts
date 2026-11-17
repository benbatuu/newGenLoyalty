import { Inject, Injectable, Logger, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import { ProgramType, Prisma } from '@prisma/client';
import { validateMultiStampWalletCapacity } from '@ngl/shared';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { mergeProgramConfig } from './wallet-template';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { PlanLimitsService } from './plan-limits.service';
import { BranchPolicyService } from '../branches/branch-policy.service';
import {
  DEFAULT_STAMP_CARD_CONFIG,
  DEFAULT_POINT_CARD_CONFIG,
  DEFAULT_CASHBACK_CARD_CONFIG,
  DEFAULT_DISCOUNT_CARD_CONFIG,
  DEFAULT_EVENT_CARD_CONFIG,
  DEFAULT_STAFF_CARD_CONFIG,
  DEFAULT_MEMBERSHIP_CARD_CONFIG,
  type LoyaltyProgramDto,
  type StampCardConfig,
  type MultiStampConfig,
} from './loyalty.types';

const DEFAULT_PROGRAM_NAMES: Record<ProgramType, string> = {
  [ProgramType.STAMP_CARD]: 'Sadakat kartı',
  [ProgramType.MULTI_STAMP]: 'Multi damga kartı',
  [ProgramType.POINT_CARD]: 'Puan kartı',
  [ProgramType.DISCOUNT_CARD]: 'İndirim kartı',
  [ProgramType.EVENT_CARD]: 'Etkinlik kartı',
  [ProgramType.MEMBERSHIP_CARD]: 'Üyelik kartı',
  [ProgramType.STAFF_CARD]: 'Personel kartı',
  [ProgramType.CASHBACK_CARD]: 'Cashback kartı',
};

const DEFAULT_MULTI_STAMP_CONFIG = {
  mode: 'MULTIPLIER',
  productGroups: [
    { id: 'coffee', label: 'Kahve', multiplier: 1, stampTheme: 'COFFEE' },
    { id: 'dessert', label: 'Tatlı', multiplier: 2, stampTheme: 'DESSERT' },
  ],
  dailyCapUnit: 'STAMPS',
};

@Injectable()
export class LoyaltyProgramService {
  private readonly logger = new Logger(LoyaltyProgramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
    private readonly branchPolicy: BranchPolicyService,
    @Inject(forwardRef(() => WalletService))
    private readonly wallet: WalletService,
  ) {}

  /** Tenant başına birincil STAMP_CARD programını döner; yoksa RewardRule'dan oluşturur. */
  async ensurePrimaryProgram(tenantId: string) {
    const existing = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isPrimary: true, isActive: true },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
    });
    if (existing) {
      return existing;
    }
    return this.syncFromRewardRule(tenantId);
  }

  /** RewardRule → LoyaltyProgram + tek ProgramTier (V1 ile uyumlu) */
  async syncFromRewardRule(tenantId: string) {
    const rule = await this.prisma.rewardRule.findUnique({
      where: { tenantId },
    });
    const stampsRequired = rule?.stampsRequired ?? 10;
    const rewardLabel = rule?.rewardLabel ?? '1 bedava kahve';
    const config = DEFAULT_STAMP_CARD_CONFIG as unknown as Prisma.InputJsonValue;

    const program = await this.prisma.loyaltyProgram.upsert({
      where: {
        id: `lp_${tenantId}`,
      },
      create: {
        id: `lp_${tenantId}`,
        tenantId,
        type: ProgramType.STAMP_CARD,
        name: 'Sadakat kartı',
        isPrimary: true,
        isActive: true,
        config,
      },
      update: {
        type: ProgramType.STAMP_CARD,
        isPrimary: true,
        isActive: true,
      },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.prisma.programTier.upsert({
      where: { id: `pt_${tenantId}` },
      create: {
        id: `pt_${tenantId}`,
        programId: program.id,
        sortOrder: 0,
        threshold: stampsRequired,
        rewardLabel,
        redeemCost: stampsRequired,
      },
      update: {
        threshold: stampsRequired,
        rewardLabel,
        redeemCost: stampsRequired,
      },
    });

    return this.prisma.loyaltyProgram.findUniqueOrThrow({
      where: { id: program.id },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async getPrimaryProgramDto(tenantId: string): Promise<LoyaltyProgramDto> {
    const program = await this.ensurePrimaryProgram(tenantId);
    return this.toDto(program);
  }

  /** Müşteri için CustomerProgram kaydı; balance Customer ile sync */
  async ensureCustomerProgram(
    tenantId: string,
    customerId: string,
    snapshot?: {
      stampCount: number;
      rewardReady: boolean;
      balances?: Record<string, number> | null;
    },
  ) {
    const program = await this.ensurePrimaryProgram(tenantId);
    const customer =
      snapshot ??
      (await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        select: { stampCount: true, rewardReady: true },
      }));
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }

    const existing = await this.prisma.customerProgram.findUnique({
      where: {
        customerId_programId: { customerId, programId: program.id },
      },
    });
    const balances =
      snapshot?.balances ??
      (existing?.balances as Record<string, number> | null) ??
      null;
    const lanesMode = balances != null;

    const eligibleTierIds = program.tiers.length
      ? this.multiStampEligible(
          program.tiers,
          balances ?? {},
          customer.stampCount,
          lanesMode,
        )
      : [];
    const rewardReady =
      customer.rewardReady || eligibleTierIds.length > 0;

    const tierJson =
      eligibleTierIds.length > 0
        ? (eligibleTierIds as Prisma.InputJsonValue)
        : Prisma.DbNull;

    const balancesJson =
      balances && Object.keys(balances).length > 0
        ? (balances as Prisma.InputJsonValue)
        : Prisma.DbNull;

    return this.prisma.customerProgram.upsert({
      where: {
        customerId_programId: {
          customerId,
          programId: program.id,
        },
      },
      create: {
        id: `cp_${customerId}`,
        tenantId,
        customerId,
        programId: program.id,
        balance: customer.stampCount,
        balances: balancesJson,
        rewardReady,
        eligibleTierIds: tierJson,
      },
      update: {
        balance: customer.stampCount,
        balances: balancesJson,
        rewardReady,
        eligibleTierIds: tierJson,
      },
    });
  }

  private multiStampEligible(
    tiers: { id: string; threshold: number; laneId: string | null }[],
    balances: Record<string, number>,
    aggregateBalance: number,
    lanesMode: boolean,
  ): string[] {
    if (!lanesMode) {
      return tiers
        .filter((t) => aggregateBalance >= t.threshold)
        .map((t) => t.id);
    }
    return tiers
      .filter((t) => {
        const lane = t.laneId;
        const bal = lane ? (balances[lane] ?? 0) : aggregateBalance;
        return bal >= t.threshold;
      })
      .map((t) => t.id);
  }

  async listPrograms(
    tenantId: string,
    opts?: { branchId?: string | null },
  ): Promise<LoyaltyProgramDto[]> {
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { tenantId, isActive: true },
      include: {
        tiers: { orderBy: { sortOrder: 'asc' } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    const filtered = opts?.branchId
      ? programs.filter((p) =>
          this.branchPolicy.matchesBranchScope(p.branchId, opts.branchId),
        )
      : programs;
    return filtered.map((p) => this.toDto(p));
  }

  async getProgramDto(tenantId: string, programId: string): Promise<LoyaltyProgramDto> {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId },
      include: {
        tiers: { orderBy: { sortOrder: 'asc' } },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }
    return this.toDto(program);
  }

  /** Paket kotası + tüm kartlar */
  async getProgramsHub(
    tenantId: string,
    opts?: { branchId?: string | null },
  ) {
    const [quota, programs] = await Promise.all([
      this.planLimits.getQuotaForTenant(tenantId),
      this.listPrograms(tenantId, opts),
    ]);
    return { quota, programs };
  }

  /** Yeni sadakat kartı — tip dönüşümü yok; paket limiti zorunlu */
  async createProgram(tenantId: string, dto: CreateProgramDto) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const existing = await this.prisma.loyaltyProgram.findMany({
      where: { tenantId, isActive: true },
      select: { type: true, isPrimary: true },
    });
    await this.planLimits.assertCanCreateProgram(
      tenant.planCode,
      existing,
      dto.type,
    );

    const branchId = await this.branchPolicy.resolveProgramBranchId(
      tenantId,
      dto.branchId,
    );

    const hasPrimary = existing.some((p) => p.isPrimary);
    const isPrimary = !hasPrimary && dto.type === ProgramType.STAMP_CARD;

    let config: Prisma.InputJsonValue = (dto.config ??
      (dto.type === ProgramType.MULTI_STAMP
        ? DEFAULT_MULTI_STAMP_CONFIG
        : dto.type === ProgramType.STAMP_CARD
          ? DEFAULT_STAMP_CARD_CONFIG
          : dto.type === ProgramType.POINT_CARD
            ? DEFAULT_POINT_CARD_CONFIG
            : dto.type === ProgramType.DISCOUNT_CARD
              ? DEFAULT_DISCOUNT_CARD_CONFIG
              : dto.type === ProgramType.EVENT_CARD
                ? DEFAULT_EVENT_CARD_CONFIG
                : dto.type === ProgramType.STAFF_CARD
                  ? DEFAULT_STAFF_CARD_CONFIG
                  : dto.type === ProgramType.MEMBERSHIP_CARD
                    ? DEFAULT_MEMBERSHIP_CARD_CONFIG
                    : dto.type === ProgramType.CASHBACK_CARD
                      ? DEFAULT_CASHBACK_CARD_CONFIG
                      : {})) as Prisma.InputJsonValue;

    const program = await this.prisma.loyaltyProgram.create({
      data: {
        tenantId,
        branchId,
        type: dto.type,
        name: dto.name?.trim() || DEFAULT_PROGRAM_NAMES[dto.type],
        isPrimary,
        isActive: true,
        config,
      },
    });

    const tiers = dto.tiers?.length
      ? dto.tiers
      : [
          {
            threshold: 10,
            rewardLabel:
              dto.type === ProgramType.STAMP_CARD
                ? '1 bedava kahve'
                : 'Ödül',
            redeemCost: 10,
          },
        ];
    await this.applyTierUpdates(tenantId, program.id, tiers);

    if (dto.type === ProgramType.MULTI_STAMP) {
      this.assertMultiStampWalletCapacity(config as MultiStampConfig, tiers);
    }

    if (isPrimary && dto.type === ProgramType.STAMP_CARD) {
      await this.syncRewardRuleFromProgram(tenantId);
    }

    return this.getProgramDto(tenantId, program.id);
  }

  /** Kart güncelle — tip değiştirilemez */
  async updateProgramById(
    tenantId: string,
    programId: string,
    dto: UpdateProgramDto,
  ) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }
    this.planLimits.assertTypeImmutable(program.type, dto.type);

    let branchId: string | undefined;
    if (dto.branchId !== undefined) {
      branchId = await this.branchPolicy.resolveProgramBranchId(
        tenantId,
        dto.branchId,
      );
    }

    const mergedConfig = dto.config
      ? mergeProgramConfig(program.config, dto.config)
      : undefined;

    if (program.type === ProgramType.MULTI_STAMP) {
      const tiersForCheck =
        dto.tiers?.map((t) => ({
          threshold: t.threshold,
          laneId: t.laneId ?? null,
        })) ??
        (
          await this.prisma.programTier.findMany({
            where: { programId: program.id },
            select: { threshold: true, laneId: true },
          })
        );
      this.assertMultiStampWalletCapacity(
        (mergedConfig ?? program.config) as MultiStampConfig,
        tiersForCheck,
      );
    }

    await this.prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(mergedConfig
          ? { config: mergedConfig as Prisma.InputJsonValue }
          : {}),
      },
    });

    if (dto.tiers?.length) {
      await this.applyTierUpdates(tenantId, program.id, dto.tiers);
    }

    if (program.isPrimary && program.type === ProgramType.STAMP_CARD) {
      await this.syncRewardRuleFromProgram(tenantId);
    }

    let walletSync = { synced: 0, devices: 0 };
    if (dto.config !== undefined || dto.tiers !== undefined) {
      walletSync = await this.wallet.syncProgramPasses(tenantId, program.id, {
        includeLegacyPrimary:
          program.isPrimary && program.type === ProgramType.STAMP_CARD,
      });
    }

    return { ...(await this.getProgramDto(tenantId, program.id)), walletSync };
  }

  /** Owner PATCH — birincil program; tip değiştirilemez */
  async updatePrimaryProgram(tenantId: string, dto: UpdateProgramDto) {
    const program = await this.ensurePrimaryProgram(tenantId);
    return this.updateProgramById(tenantId, program.id, dto);
  }

  /** Hard delete — işlem geçmişi olan kart silinemez */
  async deleteProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }

    const ledgerCount = await this.prisma.stampLedger.count({
      where: { programId },
    });
    if (ledgerCount > 0) {
      throw new BadRequestException(
        'Bu kartta işlem geçmişi var, silinemez. Arşivlemek için isActive: false kullanın.',
      );
    }

    await this.prisma.loyaltyProgram.delete({ where: { id: programId } });
    return { ok: true };
  }

  private async applyTierUpdates(
    tenantId: string,
    programId: string,
    tiers: UpdateProgramDto['tiers'],
  ) {
    if (!tiers?.length) return;
    for (const [i, tier] of tiers.entries()) {
      const id = tier.id ?? `pt_${tenantId}_${programId}_${i}`;
      await this.prisma.programTier.upsert({
        where: { id },
        create: {
          id,
          programId,
          sortOrder: tier.sortOrder ?? i,
          threshold: tier.threshold,
          rewardLabel: tier.rewardLabel,
          redeemCost: tier.redeemCost ?? tier.threshold,
          laneId: tier.laneId ?? null,
        },
        update: {
          sortOrder: tier.sortOrder ?? i,
          threshold: tier.threshold,
          rewardLabel: tier.rewardLabel,
          redeemCost: tier.redeemCost ?? tier.threshold,
          laneId: tier.laneId ?? null,
        },
      });
    }
  }

  /** Program kademesi → RewardRule senkronu */
  async syncRewardRuleFromProgram(tenantId: string) {
    const program = await this.ensurePrimaryProgram(tenantId);
    const primaryTier = [...program.tiers].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )[0];
    if (!primaryTier) return;

    await this.prisma.rewardRule.upsert({
      where: { tenantId },
      create: {
        tenantId,
        stampsRequired: primaryTier.threshold,
        rewardLabel: primaryTier.rewardLabel,
      },
      update: {
        stampsRequired: primaryTier.threshold,
        rewardLabel: primaryTier.rewardLabel,
      },
    });
  }

  private assertMultiStampWalletCapacity(
    configRaw: unknown,
    tiers: { threshold: number; laneId?: string | null }[],
  ) {
    const config =
      configRaw && typeof configRaw === 'object'
        ? (configRaw as MultiStampConfig)
        : null;
    if (!config || (config.mode !== 'LANES' && config.mode !== 'MULTIPLIER')) {
      return;
    }
    const groupCount =
      config.mode === 'LANES'
        ? (config.lanes?.length ?? 0)
        : (config.productGroups?.length ?? 0);
    const result = validateMultiStampWalletCapacity(
      config.mode,
      groupCount,
      tiers,
      config.lanes,
    );
    if (!result.ok) {
      throw new BadRequestException(result.message);
    }
  }

  private toDto(
    program: {
      id: string;
      tenantId: string;
      type: ProgramType;
      name: string;
      isActive: boolean;
      isPrimary: boolean;
      branchId: string | null;
      config: unknown;
      validFrom: Date | null;
      validUntil: Date | null;
      tiers: {
        id: string;
        sortOrder: number;
        threshold: number;
        rewardLabel: string;
        redeemCost: number;
        laneId: string | null;
      }[];
      branch?: { name: string } | null;
    },
  ): LoyaltyProgramDto {
    const config = (program.config ?? {}) as StampCardConfig;
    return {
      id: program.id,
      tenantId: program.tenantId,
      type: program.type,
      name: program.name,
      isActive: program.isActive,
      isPrimary: program.isPrimary,
      branchId: program.branchId ?? null,
      branchName: program.branch?.name ?? null,
      config,
      validFrom: program.validFrom?.toISOString() ?? null,
      validUntil: program.validUntil?.toISOString() ?? null,
      tiers: program.tiers.map((t) => ({
        id: t.id,
        sortOrder: t.sortOrder,
        threshold: t.threshold,
        rewardLabel: t.rewardLabel,
        redeemCost: t.redeemCost,
        laneId: t.laneId,
      })),
    };
  }
}
