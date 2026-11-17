import { Injectable, Logger } from '@nestjs/common';
import { StampLedgerType } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const TR_TZ = 'Europe/Istanbul';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Her gün 01:00 — önceki gün metrikleri */
  @Cron('0 1 * * *', { timeZone: TR_TZ })
  async cronDailyAggregation() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.aggregateDay(tenant.id, yesterday, dayEnd);
      await this.aggregateBranchDays(tenant.id, yesterday, dayEnd);
    }

    this.logger.log(
      `Daily metrics aggregated for ${tenants.length} tenants (${yesterday.toISOString().slice(0, 10)})`,
    );
  }

  async aggregateDay(tenantId: string, dayStart: Date, dayEnd: Date) {
    const [stamps, redeems, newCustomers, pointEarned, cashbackEarn, cashbackRedeem] =
      await Promise.all([
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.REDEEM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      this.prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      this.prisma.stampLedger.aggregate({
        where: {
          tenantId,
          type: StampLedgerType.POINT_EARN,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.stampLedger.aggregate({
        where: {
          tenantId,
          type: StampLedgerType.CASHBACK_EARN,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.stampLedger.aggregate({
        where: {
          tenantId,
          type: StampLedgerType.CASHBACK_REDEEM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    await this.prisma.dailyTenantMetrics.upsert({
      where: {
        tenantId_date: { tenantId, date: dayStart },
      },
      create: {
        tenantId,
        date: dayStart,
        stamps,
        redeems,
        newCustomers,
        pointEarned: pointEarned._sum.amount ?? 0,
        cashbackEarnKurus: cashbackEarn._sum.amount ?? 0,
        cashbackRedeemKurus: cashbackRedeem._sum.amount ?? 0,
      },
      update: {
        stamps,
        redeems,
        newCustomers,
        pointEarned: pointEarned._sum.amount ?? 0,
        cashbackEarnKurus: cashbackEarn._sum.amount ?? 0,
        cashbackRedeemKurus: cashbackRedeem._sum.amount ?? 0,
      },
    });
  }

  async aggregateBranchDays(tenantId: string, dayStart: Date, dayEnd: Date) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    for (const branch of branches) {
      await this.aggregateBranchDay(tenantId, branch.id, dayStart, dayEnd);
    }
  }

  async aggregateBranchDay(
    tenantId: string,
    branchId: string,
    dayStart: Date,
    dayEnd: Date,
  ) {
    const branchFilter = { tenantId, branchId, createdAt: { gte: dayStart, lt: dayEnd } };
    const customerFilter = {
      tenantId,
      branchId,
      createdAt: { gte: dayStart, lt: dayEnd },
    };

    const [stamps, redeems, newCustomers, pointEarned, cashbackEarn, cashbackRedeem] =
      await Promise.all([
        this.prisma.stampLedger.count({
          where: { ...branchFilter, type: StampLedgerType.STAMP },
        }),
        this.prisma.stampLedger.count({
          where: { ...branchFilter, type: StampLedgerType.REDEEM },
        }),
        this.prisma.customer.count({ where: customerFilter }),
        this.prisma.stampLedger.aggregate({
          where: { ...branchFilter, type: StampLedgerType.POINT_EARN },
          _sum: { amount: true },
        }),
        this.prisma.stampLedger.aggregate({
          where: { ...branchFilter, type: StampLedgerType.CASHBACK_EARN },
          _sum: { amount: true },
        }),
        this.prisma.stampLedger.aggregate({
          where: { ...branchFilter, type: StampLedgerType.CASHBACK_REDEEM },
          _sum: { amount: true },
        }),
      ]);

    await this.prisma.branchDailyMetrics.upsert({
      where: {
        tenantId_branchId_date: { tenantId, branchId, date: dayStart },
      },
      create: {
        tenantId,
        branchId,
        date: dayStart,
        stamps,
        redeems,
        newCustomers,
        pointEarned: pointEarned._sum.amount ?? 0,
        cashbackEarnKurus: cashbackEarn._sum.amount ?? 0,
        cashbackRedeemKurus: cashbackRedeem._sum.amount ?? 0,
      },
      update: {
        stamps,
        redeems,
        newCustomers,
        pointEarned: pointEarned._sum.amount ?? 0,
        cashbackEarnKurus: cashbackEarn._sum.amount ?? 0,
        cashbackRedeemKurus: cashbackRedeem._sum.amount ?? 0,
      },
    });
  }

  /** Düşük trafik günü tespiti → kampanya önerisi */
  /**
   * İşletmenin gerçek verisinden öneriler üretir:
   * 1) son 4 haftada en zayıf gün, 2) ödüle yaklaşan müşteriler, 3) uzun süredir uğramayan müşteriler.
   * En fazla 3 öneri, etkilenen müşteri/damga sayısına göre sıralı.
   */
  async getCampaignSuggestions(tenantId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 28);
    since.setHours(0, 0, 0, 0);
    const inactiveBefore = new Date(Date.now() - 30 * 86_400_000);

    const rule = await this.prisma.rewardRule.findFirst({
      where: { tenantId },
      select: { stampsRequired: true },
    });
    const required = rule?.stampsRequired ?? 10;

    const [metrics, nearReward, inactive] = await Promise.all([
      this.prisma.dailyTenantMetrics.findMany({
        where: { tenantId, date: { gte: since } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.customer.count({
        where: { tenantId, rewardReady: false, stampCount: { gte: Math.max(1, required - 2) } },
      }),
      this.countInactiveCustomers(tenantId, inactiveBefore),
    ]);

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayTotals = new Map<number, number>();
    for (const m of metrics) {
      const dow = m.date.getDay();
      dayTotals.set(dow, (dayTotals.get(dow) ?? 0) + m.stamps);
    }

    const suggestions: {
      id: string;
      impact: number;
      title: string;
      description: string;
      preset: { type: 'MULTIPLIER'; multiplier: number; daysOfWeek?: number[]; label: string };
    }[] = [];

    const totalStamps = [...dayTotals.values()].reduce((a, b) => a + b, 0);
    const avgPerDay = totalStamps / 7;
    const sorted = [...dayTotals.entries()].sort((a, b) => a[1] - b[1]);
    const weakest = sorted[0];
    if (weakest && avgPerDay > 0 && weakest[1] < avgPerDay * 0.8) {
      const pct = Math.round((1 - weakest[1] / avgPerDay) * 100);
      suggestions.push({
        id: 'low-traffic-multiplier',
        impact: avgPerDay - weakest[1],
        title: `${dayNames[weakest[0]]} günleri düşük trafik`,
        description: `Son 4 haftada ${dayNames[weakest[0]]} günleri toplam ${weakest[1]} damga; günlük ortalamanın %${pct} altında. 2x damga kampanyası önerilir.`,
        preset: { type: 'MULTIPLIER', multiplier: 2, daysOfWeek: [weakest[0]], label: `${dayNames[weakest[0]]} 2x damga` },
      });
    }

    if (nearReward >= 3) {
      suggestions.push({
        id: 'near-reward-multiplier',
        impact: nearReward,
        title: `${nearReward} müşteri ödüle çok yakın`,
        description: `${nearReward} müşterinin ödülüne en fazla 2 damga kaldı. Bu hafta 2x damga ile ödüle ulaşmalarını hızlandırın.`,
        preset: { type: 'MULTIPLIER', multiplier: 2, label: 'Ödüle yakınlara 2x damga' },
      });
    }

    if (inactive >= 5) {
      suggestions.push({
        id: 'inactive-win-back',
        impact: inactive,
        title: `${inactive} müşteri 30 gündür uğramadı`,
        description: `Damgası olan ${inactive} müşteri bir aydır işletmeye gelmedi. 2x damga ile geri dönmelerini teşvik edin.`,
        preset: { type: 'MULTIPLIER', multiplier: 2, label: 'Geri dönüş 2x damga' },
      });
    }

    suggestions.sort((a, b) => b.impact - a.impact);
    return { suggestions: suggestions.slice(0, 3).map(({ impact: _i, ...s }) => s) };
  }

  /** Damgası olan ama son 30 günde damga almamış müşteri sayısı (damga defterine göre). */
  private async countInactiveCustomers(tenantId: string, since: Date): Promise<number> {
    const [withStamps, recent] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, stampCount: { gt: 0 } } }),
      this.prisma.stampLedger.findMany({
        where: { tenantId, type: StampLedgerType.STAMP, createdAt: { gte: since } },
        distinct: ['customerId'],
        select: { customerId: true },
      }),
    ]);
    if (recent.length === 0) return withStamps;
    const activeWithStamps = await this.prisma.customer.count({
      where: { tenantId, stampCount: { gt: 0 }, id: { in: recent.map((r) => r.customerId) } },
    });
    return Math.max(0, withStamps - activeWithStamps);
  }
}
