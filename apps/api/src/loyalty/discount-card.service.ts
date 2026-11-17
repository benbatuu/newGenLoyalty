import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProgramType,
  StampLedgerType,
  StampSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_DISCOUNT_CARD_CONFIG,
  type DiscountCardConfig,
  type DiscountTier,
} from './loyalty.types';

const STAMP_TIMEZONE = 'Europe/Istanbul';

function calendarDayKey(tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

function calendarMonthKey(tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  });
  return fmt.format(new Date());
}

type DiscountCustomerMeta = {
  totalUses?: number;
  usesToday?: number;
  usesThisMonth?: number;
  usageDayKey?: string;
  usageMonthKey?: string;
  visitCount?: number;
  lifetimeSpendKurus?: number;
  lastUsedAt?: string;
};

export type EffectiveDiscount = {
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  label: string;
  tierApplied: boolean;
};

@Injectable()
export class DiscountCardService {
  constructor(private readonly prisma: PrismaService) {}

  parseConfig(raw: unknown): DiscountCardConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_DISCOUNT_CARD_CONFIG };
    }
    const c = raw as Partial<DiscountCardConfig>;
    return {
      ...DEFAULT_DISCOUNT_CARD_CONFIG,
      ...c,
      tieredDiscounts:
        c.tieredDiscounts?.length
          ? c.tieredDiscounts
          : DEFAULT_DISCOUNT_CARD_CONFIG.tieredDiscounts,
      applicableCategories:
        c.applicableCategories ??
        DEFAULT_DISCOUNT_CARD_CONFIG.applicableCategories,
    };
  }

  async getDiscountProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }
    if (program.type !== ProgramType.DISCOUNT_CARD) {
      throw new BadRequestException('Bu kart indirim kartı değil');
    }
    return program;
  }

  async findActiveDiscountProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true, type: ProgramType.DISCOUNT_CARD },
    });
  }

  private readMeta(metadata: unknown): DiscountCustomerMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as DiscountCustomerMeta;
  }

  private assertWithinValidity(
    config: DiscountCardConfig,
    program: { validFrom: Date | null; validUntil: Date | null },
  ) {
    const now = new Date();
    const from = config.validFrom
      ? new Date(config.validFrom)
      : program.validFrom;
    const until = config.validUntil
      ? new Date(config.validUntil)
      : program.validUntil;

    if (from && now < from) {
      throw new BadRequestException('İndirim kartı henüz geçerli değil');
    }
    if (until && now > until) {
      throw new BadRequestException('İndirim kartının süresi dolmuş');
    }
  }

  private normalizedUsageCounters(meta: DiscountCustomerMeta): DiscountCustomerMeta {
    const dayKey = calendarDayKey(STAMP_TIMEZONE);
    const monthKey = calendarMonthKey(STAMP_TIMEZONE);
    return {
      ...meta,
      usesToday: meta.usageDayKey === dayKey ? (meta.usesToday ?? 0) : 0,
      usesThisMonth:
        meta.usageMonthKey === monthKey ? (meta.usesThisMonth ?? 0) : 0,
    };
  }

  private assertUsageLimits(
    config: DiscountCardConfig,
    meta: DiscountCustomerMeta,
  ) {
    const usage = this.normalizedUsageCounters(meta);
    const totalUses = usage.totalUses ?? 0;

    if (config.maxUsesTotal != null && totalUses >= config.maxUsesTotal) {
      throw new ConflictException('Toplam kullanım limiti doldu');
    }
    if (
      config.maxUsesPerDay != null &&
      usage.usesToday! >= config.maxUsesPerDay
    ) {
      throw new ConflictException('Günlük kullanım limiti doldu');
    }
    if (
      config.maxUsesPerMonth != null &&
      usage.usesThisMonth! >= config.maxUsesPerMonth
    ) {
      throw new ConflictException('Aylık kullanım limiti doldu');
    }
  }

  resolveEffectiveDiscount(
    config: DiscountCardConfig,
    ctx: {
      visitCount: number;
      lifetimeSpendKurus: number;
      vipTierId?: string | null;
    },
  ): EffectiveDiscount {
    const tiers = config.tieredDiscounts?.length
      ? config.tieredDiscounts
      : [
          {
            value: config.value,
            discountType: config.discountType,
          } satisfies DiscountTier,
        ];

    let matched: DiscountTier | undefined;

    if (config.tierTrigger === 'VISITS') {
      const sorted = [...tiers].sort(
        (a, b) => (b.minVisits ?? 0) - (a.minVisits ?? 0),
      );
      matched = sorted.find(
        (t) => ctx.visitCount >= (t.minVisits ?? 0),
      );
    } else if (config.tierTrigger === 'SPEND') {
      const sorted = [...tiers].sort(
        (a, b) => (b.minLifetimeSpend ?? 0) - (a.minLifetimeSpend ?? 0),
      );
      matched = sorted.find(
        (t) => ctx.lifetimeSpendKurus >= (t.minLifetimeSpend ?? 0),
      );
    } else if (config.tierTrigger === 'VIP') {
      if (ctx.vipTierId) {
        matched = tiers.find((t) => t.vipTierId === ctx.vipTierId);
      }
      if (!matched) {
        matched = tiers.find((t) => !t.vipTierId);
      }
    }

    const effective = matched ?? {
      value: config.value,
      discountType: config.discountType,
    };

    const label =
      effective.discountType === 'PERCENT'
        ? `%${effective.value} indirim`
        : `${(effective.value / 100).toFixed(2).replace('.', ',')} TL indirim`;

    return {
      discountType: effective.discountType,
      value: effective.value,
      label,
      tierApplied: matched != null && tiers.length > 1,
    };
  }

  async ensureCustomerProgram(
    tenantId: string,
    customerId: string,
    programId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, vipTierId: true },
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
        metadata: {
          totalUses: 0,
          usesToday: 0,
          usesThisMonth: 0,
          visitCount: 0,
          lifetimeSpendKurus: 0,
        } as Prisma.InputJsonValue,
      },
      update: {},
    });
  }

  async verifyDiscount(
    tenantId: string,
    programId: string,
    customerId: string,
    categoryId?: string,
  ) {
    const program = await this.getDiscountProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    this.assertWithinValidity(config, program);

    if (
      categoryId &&
      config.applicableCategories?.length &&
      !config.applicableCategories.includes(categoryId)
    ) {
      throw new BadRequestException('Bu kategori için indirim geçerli değil');
    }

    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    this.assertUsageLimits(config, meta);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { vipTierId: true },
    });

    const effective = this.resolveEffectiveDiscount(config, {
      visitCount: meta.visitCount ?? 0,
      lifetimeSpendKurus: meta.lifetimeSpendKurus ?? 0,
      vipTierId: customer?.vipTierId,
    });

    const usage = this.normalizedUsageCounters(meta);
    const remainingToday =
      config.maxUsesPerDay != null
        ? Math.max(0, config.maxUsesPerDay - usage.usesToday!)
        : null;
    const remainingTotal =
      config.maxUsesTotal != null
        ? Math.max(0, config.maxUsesTotal - (usage.totalUses ?? 0))
        : null;

    return {
      programId: program.id,
      programName: program.name,
      valid: true,
      effective,
      limits: {
        totalUses: usage.totalUses ?? 0,
        usesToday: usage.usesToday ?? 0,
        usesThisMonth: usage.usesThisMonth ?? 0,
        remainingToday,
        remainingTotal,
        maxUsesPerDay: config.maxUsesPerDay ?? null,
        maxUsesTotal: config.maxUsesTotal ?? null,
      },
    };
  }

  async applyDiscount(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto: {
      categoryId?: string;
      amountKurus?: number;
      source?: StampSource;
      idempotencyKey?: string;
    },
  ) {
    if (dto.idempotencyKey) {
      const dup = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          programId,
          customerId,
          type: StampLedgerType.DISCOUNT_USE,
          metadata: {
            path: ['idempotencyKey'],
            equals: dto.idempotencyKey,
          },
        },
      });
      if (dup) {
        throw new ConflictException('Bu indirim zaten uygulandı');
      }
    }

    const verification = await this.verifyDiscount(
      tenantId,
      programId,
      customerId,
      dto.categoryId,
    );

    const program = await this.getDiscountProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const usage = this.normalizedUsageCounters(meta);

    const dayKey = calendarDayKey(STAMP_TIMEZONE);
    const monthKey = calendarMonthKey(STAMP_TIMEZONE);
    const nextMeta: DiscountCustomerMeta = {
      ...meta,
      totalUses: (usage.totalUses ?? 0) + 1,
      usesToday: (usage.usesToday ?? 0) + 1,
      usesThisMonth: (usage.usesThisMonth ?? 0) + 1,
      usageDayKey: dayKey,
      usageMonthKey: monthKey,
      visitCount: (meta.visitCount ?? 0) + 1,
      lifetimeSpendKurus:
        (meta.lifetimeSpendKurus ?? 0) + (dto.amountKurus ?? 0),
      lastUsedAt: new Date().toISOString(),
    };

    const ledgerMetadata: Prisma.InputJsonValue = {
      discountType: verification.effective.discountType,
      value: verification.effective.value,
      label: verification.effective.label,
      categoryId: dto.categoryId ?? null,
      amountKurus: dto.amountKurus ?? null,
      tierApplied: verification.effective.tierApplied,
      ...(dto.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : {}),
    };

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: {
          metadata: nextMeta as Prisma.InputJsonValue,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.DISCOUNT_USE,
          source: dto.source ?? StampSource.cashier,
          createdByUserId: actorUserId,
          amount: 1,
          metadata: ledgerMetadata,
        },
      }),
    ]);

    const updatedMeta = this.readMeta(updated.metadata);
    const updatedUsage = this.normalizedUsageCounters(updatedMeta);

    return {
      applied: true,
      effective: verification.effective,
      limits: {
        totalUses: updatedUsage.totalUses ?? 0,
        usesToday: updatedUsage.usesToday ?? 0,
        usesThisMonth: updatedUsage.usesThisMonth ?? 0,
        remainingToday:
          config.maxUsesPerDay != null
            ? Math.max(0, config.maxUsesPerDay - updatedUsage.usesToday!)
            : null,
        remainingTotal:
          config.maxUsesTotal != null
            ? Math.max(
                0,
                config.maxUsesTotal - (updatedUsage.totalUses ?? 0),
              )
            : null,
      },
      program: { id: program.id, name: program.name },
    };
  }

  async getCustomerState(
    tenantId: string,
    programId: string,
    customerId: string,
  ) {
    const program = await this.getDiscountProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const usage = this.normalizedUsageCounters(meta);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { vipTierId: true },
    });

    const effective = this.resolveEffectiveDiscount(config, {
      visitCount: meta.visitCount ?? 0,
      lifetimeSpendKurus: meta.lifetimeSpendKurus ?? 0,
      vipTierId: customer?.vipTierId,
    });

    let valid = true;
    let invalidReason: string | null = null;
    try {
      this.assertWithinValidity(config, program);
      this.assertUsageLimits(config, meta);
    } catch (err) {
      valid = false;
      invalidReason =
        err instanceof BadRequestException || err instanceof ConflictException
          ? (err.message as string)
          : 'Geçersiz';
    }

    const remainingToday =
      config.maxUsesPerDay != null
        ? Math.max(0, config.maxUsesPerDay - usage.usesToday!)
        : null;
    const remainingTotal =
      config.maxUsesTotal != null
        ? Math.max(0, config.maxUsesTotal - (usage.totalUses ?? 0))
        : null;

    return {
      programId: program.id,
      programName: program.name,
      valid,
      invalidReason,
      effective,
      tierTrigger: config.tierTrigger,
      applicableCategories: config.applicableCategories ?? [],
      validUntil:
        config.validUntil ?? program.validUntil?.toISOString() ?? null,
      limits: {
        totalUses: usage.totalUses ?? 0,
        usesToday: usage.usesToday ?? 0,
        usesThisMonth: usage.usesThisMonth ?? 0,
        remainingToday,
        remainingTotal,
        maxUsesPerDay: config.maxUsesPerDay ?? null,
        maxUsesTotal: config.maxUsesTotal ?? null,
      },
    };
  }

  walletFields(
    config: DiscountCardConfig,
    effective: EffectiveDiscount,
    meta: DiscountCustomerMeta,
  ): { label: string; value: string; hint?: string } {
    const usage = this.normalizedUsageCounters(meta);
    let hint: string | undefined;

    if (config.maxUsesPerDay != null) {
      hint = `Bugün: ${usage.usesToday ?? 0}/${config.maxUsesPerDay}`;
    } else if (meta.lastUsedAt) {
      const d = new Date(meta.lastUsedAt);
      hint = `Son: ${d.toLocaleDateString('tr-TR')}`;
    }

    return {
      label: 'İndirim',
      value: effective.label,
      hint,
    };
  }

  /** Günlük sayaç sıfırlama kontrolü için yardımcı */
  usesTodayCount(meta: DiscountCustomerMeta): number {
    return this.normalizedUsageCounters(meta).usesToday ?? 0;
  }
}
