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
  DEFAULT_CASHBACK_CARD_CONFIG,
  formatTryFromKurus,
  type CashbackCardConfig,
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

export type CashbackEarnPreview = {
  amountKurus: number;
  amountTry: string;
  baseEarnKurus: number;
  categoryMultiplier: number;
  tierMultiplier: number;
  campaignMultiplier: number;
  finalEarnKurus: number;
  earnPercent: number;
  requiresConfirmation: boolean;
  campaignLabel?: string;
  categoryLabel?: string;
};

@Injectable()
export class CashbackCardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CampaignsService))
    private readonly campaigns: CampaignsService,
    private readonly vip: VipService,
  ) {}

  parseConfig(raw: unknown): CashbackCardConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CASHBACK_CARD_CONFIG };
    }
    const c = raw as Partial<CashbackCardConfig>;
    return {
      ...DEFAULT_CASHBACK_CARD_CONFIG,
      ...c,
      tieredRates:
        c.tieredRates?.length
          ? c.tieredRates
          : DEFAULT_CASHBACK_CARD_CONFIG.tieredRates,
      categoryRates: c.categoryRates ?? DEFAULT_CASHBACK_CARD_CONFIG.categoryRates,
    };
  }

  async getCashbackProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }
    if (program.type !== ProgramType.CASHBACK_CARD) {
      throw new BadRequestException('Bu kart cashback kartı değil');
    }
    return program;
  }

  async findActiveCashbackProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true, type: ProgramType.CASHBACK_CARD },
    });
  }

  private tierMultiplier(
    config: CashbackCardConfig,
    lifetimeSpendKurus: number,
  ): number {
    const tiers = [...(config.tieredRates ?? [])].sort(
      (a, b) => b.minLifetimeSpendKurus - a.minLifetimeSpendKurus,
    );
    for (const tier of tiers) {
      if (lifetimeSpendKurus >= tier.minLifetimeSpendKurus) {
        return tier.rateMultiplier;
      }
    }
    return 1;
  }

  private categoryMultiplier(
    config: CashbackCardConfig,
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
  ): Promise<CashbackEarnPreview> {
    const program = await this.getCashbackProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const lifetimeSpend = meta.lifetimeSpendKurus ?? 0;

    if (amountKurus <= 0) {
      throw new BadRequestException('Tutar 0 olamaz');
    }
    if (
      config.minEarnKurus != null &&
      config.minEarnKurus > 0 &&
      amountKurus < config.minEarnKurus
    ) {
      throw new BadRequestException(
        `Minimum harcama: ${formatTryFromKurus(config.minEarnKurus)} TL`,
      );
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

    const baseEarnKurus = Math.floor(
      (amountKurus * config.earnPercent) / 100,
    );
    const scaled = Math.floor(baseEarnKurus * catMult * tierMult);
    const finalEarnKurus =
      camp.multiplier > 1
        ? Math.floor(scaled * camp.multiplier)
        : scaled;

    return {
      amountKurus,
      amountTry: formatTryFromKurus(amountKurus),
      baseEarnKurus,
      categoryMultiplier: catMult,
      tierMultiplier: tierMult,
      campaignMultiplier: camp.multiplier,
      finalEarnKurus,
      earnPercent: config.earnPercent,
      requiresConfirmation:
        amountKurus >= config.requireAmountConfirmationAbove,
      campaignLabel: camp.label,
      categoryLabel,
    };
  }

  private async earnedToday(
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
        type: StampLedgerType.CASHBACK_EARN,
        createdAt: { gte: dayStart },
      },
      select: { amount: true },
    });
    return rows.reduce((sum, r) => sum + r.amount, 0);
  }

  private async redeemedToday(
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
        type: StampLedgerType.CASHBACK_REDEEM,
        createdAt: { gte: dayStart },
      },
      select: { amount: true },
    });
    return rows.reduce((sum, r) => sum + r.amount, 0);
  }

  async earnCashback(
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
        message: `${preview.amountTry} TL için onay gerekli → +${formatTryFromKurus(preview.finalEarnKurus)} TL cashback`,
        code: 'CONFIRM_REQUIRED',
        preview,
      });
    }

    if (preview.finalEarnKurus <= 0) {
      throw new BadRequestException('Bu tutar için cashback kazanılamaz');
    }

    const program = await this.getCashbackProgram(tenantId, programId);
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

    const earnedToday = await this.earnedToday(
      tenantId,
      customerId,
      programId,
    );
    if (earnedToday + preview.finalEarnKurus > config.maxEarnPerDayKurus) {
      throw new ConflictException(
        `Günlük cashback limiti (₺${formatTryFromKurus(config.maxEarnPerDayKurus)}) aşıldı`,
      );
    }

    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const lifetimeSpend =
      (meta.lifetimeSpendKurus ?? 0) + dto.amountKurus;
    const nextBalance = cp.balance + preview.finalEarnKurus;

    const ledgerMetadata: Prisma.InputJsonValue = {
      amountKurus: dto.amountKurus,
      baseEarnKurus: preview.baseEarnKurus,
      finalEarnKurus: preview.finalEarnKurus,
      earnPercent: preview.earnPercent,
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
          rewardReady: nextBalance >= config.minRedeemKurus,
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
          type: StampLedgerType.CASHBACK_EARN,
          source: dto.source ?? StampSource.cashier,
          createdByUserId: actorUserId,
          amount: preview.finalEarnKurus,
          metadata: ledgerMetadata,
        },
      }),
    ]);

    void this.vip.maybeUpgradeTier(tenantId, customerId).catch(() => {});

    return {
      balanceKurus: updated.balance,
      balanceTry: formatTryFromKurus(updated.balance),
      earnedKurus: preview.finalEarnKurus,
      earnedTry: formatTryFromKurus(preview.finalEarnKurus),
      preview,
      program: { id: program.id, name: program.name, type: program.type },
    };
  }

  async redeemCredit(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto: {
      amountKurus: number;
      basketKurus?: number;
      source?: StampSource;
      posReceiptId?: string;
    },
  ) {
    const program = await this.getCashbackProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);

    if (dto.amountKurus < config.minRedeemKurus) {
      throw new BadRequestException(
        `Minimum kullanım: ₺${formatTryFromKurus(config.minRedeemKurus)}`,
      );
    }
    if (cp.balance < dto.amountKurus) {
      throw new BadRequestException(
        `Yetersiz bakiye (₺${formatTryFromKurus(cp.balance)})`,
      );
    }

    if (dto.basketKurus != null && dto.basketKurus > 0) {
      const maxAllowed = Math.floor(
        (dto.basketKurus * config.maxRedeemPercent) / 100,
      );
      if (dto.amountKurus > maxAllowed) {
        throw new BadRequestException(
          `Sepetin en fazla %${config.maxRedeemPercent}'si kullanılabilir (max ₺${formatTryFromKurus(maxAllowed)})`,
        );
      }
    }

    if (config.maxRedeemPerDayKurus != null) {
      const redeemedToday = await this.redeemedToday(
        tenantId,
        customerId,
        programId,
      );
      if (redeemedToday + dto.amountKurus > config.maxRedeemPerDayKurus) {
        throw new ConflictException('Günlük kullanım limiti aşıldı');
      }
    }

    if (dto.posReceiptId) {
      const dup = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          programId,
          type: StampLedgerType.CASHBACK_REDEEM,
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

    const nextBalance = cp.balance - dto.amountKurus;

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: {
          balance: nextBalance,
          rewardReady: nextBalance >= config.minRedeemKurus,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.CASHBACK_REDEEM,
          source: dto.source ?? StampSource.cashier,
          createdByUserId: actorUserId,
          amount: dto.amountKurus,
          metadata: {
            creditAppliedKurus: dto.amountKurus,
            basketKurus: dto.basketKurus ?? null,
            ...(dto.posReceiptId ? { posReceiptId: dto.posReceiptId } : {}),
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      balanceKurus: updated.balance,
      balanceTry: formatTryFromKurus(updated.balance),
      redeemedKurus: dto.amountKurus,
      redeemedTry: formatTryFromKurus(dto.amountKurus),
      program: { id: program.id, name: program.name },
    };
  }

  async getCustomerState(
    tenantId: string,
    programId: string,
    customerId: string,
  ) {
    const program = await this.getCashbackProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);

    return {
      programId: program.id,
      programName: program.name,
      programType: program.type,
      balanceKurus: cp.balance,
      balanceTry: formatTryFromKurus(cp.balance),
      earnPercent: config.earnPercent,
      minRedeemKurus: config.minRedeemKurus,
      maxRedeemPercent: config.maxRedeemPercent,
      canRedeem: cp.balance >= config.minRedeemKurus,
      categories: config.categoryRates ?? [],
    };
  }

  walletFields(
    config: CashbackCardConfig,
    balanceKurus: number,
  ): { label: string; value: string; hint?: string } {
    const hint =
      balanceKurus >= config.minRedeemKurus
        ? 'Kasada kullanılabilir'
        : `Min ₺${formatTryFromKurus(config.minRedeemKurus)}`;
    return {
      label: 'Bakiye',
      value: `₺${formatTryFromKurus(balanceKurus)}`,
      hint,
    };
  }
}
