import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  Prisma,
  ProgramType,
  StampLedgerType,
  StampSource,
} from '@prisma/client';
import { CampaignsService } from '../campaigns/campaigns.service';
import { VipService } from '../vip/vip.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_POINT_CARD_CONFIG,
  type PointCardConfig,
  type PointRedeemRule,
} from './loyalty.types';

const STAMP_TIMEZONE = 'Europe/Istanbul';

function startOfCalendarDay(tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const day = fmt.format(new Date());
  return new Date(`${day}T00:00:00`);
}

type CustomerProgramMeta = {
  lifetimeSpendKurus?: number;
};

export type PointEarnPreview = {
  amountKurus: number;
  amountTry: string;
  basePoints: number;
  categoryMultiplier: number;
  tierMultiplier: number;
  campaignMultiplier: number;
  finalPoints: number;
  requiresConfirmation: boolean;
  campaignLabel?: string;
  categoryLabel?: string;
};

@Injectable()
export class PointCardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CampaignsService))
    private readonly campaigns: CampaignsService,
    private readonly vip: VipService,
  ) {}

  parseConfig(raw: unknown): PointCardConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_POINT_CARD_CONFIG };
    }
    const c = raw as Partial<PointCardConfig>;
    return {
      ...DEFAULT_POINT_CARD_CONFIG,
      ...c,
      earnRate: {
        ...DEFAULT_POINT_CARD_CONFIG.earnRate,
        ...(c.earnRate ?? {}),
      },
      redeemRules:
        c.redeemRules?.length ? c.redeemRules : DEFAULT_POINT_CARD_CONFIG.redeemRules,
    };
  }

  async getPointProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }
    if (program.type !== ProgramType.POINT_CARD) {
      throw new BadRequestException('Bu kart puan kartı değil');
    }
    return program;
  }

  async findActivePointProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true, type: ProgramType.POINT_CARD },
    });
  }

  private tierMultiplier(
    config: PointCardConfig,
    lifetimeSpendKurus: number,
  ): number {
    const tiers = [...(config.tieredEarnRates ?? [])].sort(
      (a, b) => b.minLifetimeSpend - a.minLifetimeSpend,
    );
    for (const tier of tiers) {
      if (lifetimeSpendKurus >= tier.minLifetimeSpend) {
        return tier.rateMultiplier;
      }
    }
    return 1;
  }

  private categoryMultiplier(
    config: PointCardConfig,
    categoryId?: string,
  ): { multiplier: number; label?: string } {
    if (!categoryId) return { multiplier: 1 };
    const cat = config.categoryRates?.find((c) => c.categoryId === categoryId);
    return {
      multiplier: cat?.multiplier ?? 1,
      label: cat?.label ?? categoryId,
    };
  }

  private readMeta(metadata: unknown): CustomerProgramMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as CustomerProgramMeta;
  }

  async ensureCustomerProgram(
    tenantId: string,
    customerId: string,
    programId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }

    return this.prisma.customerProgram.upsert({
      where: {
        customerId_programId: { customerId, programId },
      },
      create: {
        tenantId,
        customerId,
        programId,
        balance: 0,
        rewardReady: false,
        metadata: { lifetimeSpendKurus: 0 } as Prisma.InputJsonValue,
      },
      update: {},
    });
  }

  async previewEarn(
    tenantId: string,
    programId: string,
    customerId: string,
    amountKurus: number,
    categoryId?: string,
  ): Promise<PointEarnPreview> {
    const program = await this.getPointProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const lifetimeSpend = meta.lifetimeSpendKurus ?? 0;

    if (amountKurus <= 0) {
      throw new BadRequestException('Tutar 0 olamaz');
    }

    const { multiplier: catMult, label: categoryLabel } =
      this.categoryMultiplier(config, categoryId);
    const [camp, vipMult] = await Promise.all([
      this.campaigns.resolveStampMultiplier(tenantId, customerId),
      this.vip.multiplierFor(tenantId, customerId),
    ]);
    // Kart seviyesi ile VIP seviyesinden yüksek olan geçer — üst üste binmez
    const tierMult = Math.max(
      this.tierMultiplier(config, lifetimeSpend),
      vipMult,
    );

    const basePoints = Math.floor(
      (amountKurus / 100) * config.earnRate.default,
    );
    const scaled = Math.floor(basePoints * catMult * tierMult);
    const finalPoints =
      camp.multiplier > 1
        ? Math.floor(scaled * camp.multiplier)
        : scaled;

    return {
      amountKurus,
      amountTry: (amountKurus / 100).toFixed(2).replace('.', ','),
      basePoints,
      categoryMultiplier: catMult,
      tierMultiplier: tierMult,
      campaignMultiplier: camp.multiplier,
      finalPoints,
      requiresConfirmation:
        amountKurus >= config.requireAmountConfirmationAbove,
      campaignLabel: camp.label,
      categoryLabel,
    };
  }

  private async pointsEarnedToday(
    tenantId: string,
    customerId: string,
    programId: string,
  ): Promise<number> {
    const dayStart = startOfCalendarDay(STAMP_TIMEZONE);
    const rows = await this.prisma.stampLedger.findMany({
      where: {
        tenantId,
        customerId,
        programId,
        type: StampLedgerType.POINT_EARN,
        createdAt: { gte: dayStart },
      },
      select: { amount: true },
    });
    return rows.reduce((sum, r) => sum + r.amount, 0);
  }

  async earnPoints(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto: {
      amountKurus: number;
      categoryId?: string;
      confirmed?: boolean;
      source?: StampSource;
      posReceiptId?: string;
    },
  ) {
    const preview = await this.previewEarn(
      tenantId,
      programId,
      customerId,
      dto.amountKurus,
      dto.categoryId,
    );

    if (preview.requiresConfirmation && !dto.confirmed) {
      throw new BadRequestException({
        message: `${preview.amountTry} TL için onay gerekli → ${preview.finalPoints} puan`,
        code: 'CONFIRM_REQUIRED',
        preview,
      });
    }

    if (preview.finalPoints <= 0) {
      throw new BadRequestException('Bu tutar için puan kazanılamaz');
    }

    const program = await this.getPointProgram(tenantId, programId);
    const config = this.parseConfig(program.config);

    if (dto.posReceiptId) {
      const dup = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          programId,
          metadata: {
            path: ['posReceiptId'],
            equals: dto.posReceiptId,
          },
        },
      });
      if (dup) {
        throw new ConflictException('Bu fiş zaten işlendi');
      }
    }

    const earnedToday = await this.pointsEarnedToday(
      tenantId,
      customerId,
      programId,
    );
    if (earnedToday + preview.finalPoints > config.maxPointsPerDay) {
      throw new ConflictException(
        `Günlük puan limiti (${config.maxPointsPerDay}) aşıldı`,
      );
    }

    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const lifetimeSpend =
      (meta.lifetimeSpendKurus ?? 0) + dto.amountKurus;
    const nextBalance = cp.balance + preview.finalPoints;

    const ledgerMetadata: Prisma.InputJsonValue = {
      amountKurus: dto.amountKurus,
      basePoints: preview.basePoints,
      finalPoints: preview.finalPoints,
      categoryId: dto.categoryId ?? null,
      categoryMultiplier: preview.categoryMultiplier,
      tierMultiplier: preview.tierMultiplier,
      campaignMultiplier: preview.campaignMultiplier,
      ...(dto.posReceiptId ? { posReceiptId: dto.posReceiptId } : {}),
    };

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: {
          balance: nextBalance,
          metadata: {
            lifetimeSpendKurus: lifetimeSpend,
          } as Prisma.InputJsonValue,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.POINT_EARN,
          source: dto.source ?? StampSource.cashier,
          createdByUserId: actorUserId,
          amount: preview.finalPoints,
          metadata: ledgerMetadata,
        },
      }),
    ]);

    void this.vip.maybeUpgradeTier(tenantId, customerId).catch(() => {});

    return {
      balance: updated.balance,
      earned: preview.finalPoints,
      preview,
      program: { id: program.id, name: program.name },
    };
  }

  findRedeemRule(
    config: PointCardConfig,
    pointCost: number,
    rewardLabel?: string,
  ): PointRedeemRule | undefined {
    return config.redeemRules.find(
      (r) =>
        r.pointCost === pointCost &&
        (!rewardLabel || r.rewardLabel === rewardLabel),
    );
  }

  nextRedeemHint(config: PointCardConfig, balance: number): string | null {
    const affordable = config.redeemRules
      .filter((r) => r.pointCost > balance)
      .sort((a, b) => a.pointCost - b.pointCost)[0];
    if (!affordable) {
      const cheapest = [...config.redeemRules].sort(
        (a, b) => a.pointCost - b.pointCost,
      )[0];
      return cheapest ? cheapest.rewardLabel : null;
    }
    const remaining = affordable.pointCost - balance;
    return `${remaining} puan → ${affordable.rewardLabel}`;
  }

  async getCustomerState(
    tenantId: string,
    programId: string,
    customerId: string,
  ) {
    const program = await this.getPointProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);

    const redeemOptions = config.redeemRules.map((rule) => ({
      ...rule,
      affordable: cp.balance >= rule.pointCost,
    }));

    return {
      programId: program.id,
      programName: program.name,
      balance: cp.balance,
      redeemOptions,
      nextRedeemHint: this.nextRedeemHint(config, cp.balance),
      categories: config.categoryRates ?? [],
    };
  }

  async redeemPoints(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto: {
      pointCost: number;
      rewardLabel?: string;
      source?: StampSource;
    },
  ) {
    const program = await this.getPointProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const rule = this.findRedeemRule(
      config,
      dto.pointCost,
      dto.rewardLabel,
    );
    if (!rule) {
      throw new BadRequestException('Geçersiz ödül seçimi');
    }

    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    if (cp.balance < rule.pointCost) {
      throw new BadRequestException(
        `Yetersiz puan (${cp.balance}/${rule.pointCost})`,
      );
    }

    const nextBalance = cp.balance - rule.pointCost;

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: { balance: nextBalance, rewardReady: false },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.POINT_REDEEM,
          source: dto.source ?? StampSource.cashier,
          createdByUserId: actorUserId,
          amount: rule.pointCost,
          metadata: {
            rewardType: rule.rewardType,
            rewardLabel: rule.rewardLabel,
            value: rule.value ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      balance: updated.balance,
      redeemed: rule.pointCost,
      rewardLabel: rule.rewardLabel,
      program: { id: program.id, name: program.name },
    };
  }

  walletFields(
    config: PointCardConfig,
    balance: number,
  ): { label: string; value: string; hint?: string } {
    const hint = this.nextRedeemHint(config, balance);
    return {
      label: 'Puan',
      value: balance.toLocaleString('tr-TR'),
      hint: hint ?? undefined,
    };
  }
}
