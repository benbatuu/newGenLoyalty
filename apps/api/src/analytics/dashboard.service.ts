import { Injectable } from '@nestjs/common';
import { Prisma, ProgramType, StampLedgerType } from '@prisma/client';
import { PiiService } from '../pii/pii.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolveStampRewardMeta } from '../stamps/stamp-reward-meta';
import { STAMP_TIMEZONE, startOfCalendarDay } from '../stamps/stamp-limits';

const DAY_MS = 86_400_000;
/** Seçilebilecek en uzun aralık (gün) */
const MAX_RANGE_DAYS = 366;

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  STAMP_CARD: 'Damga kartı',
  MULTI_STAMP: 'Çoklu damga',
  POINT_CARD: 'Puan kartı',
  CASHBACK_CARD: 'Cashback',
  DISCOUNT_CARD: 'İndirim',
  EVENT_CARD: 'Etkinlik',
  MEMBERSHIP_CARD: 'Üyelik',
  STAFF_CARD: 'Personel',
  LEGACY: 'Genel',
};

/** Müşteri ziyareti sayılan hareketler (yoğunluk haritası ve tekil ziyaretçi) */
const VISIT_TYPES: StampLedgerType[] = [
  StampLedgerType.STAMP,
  StampLedgerType.REDEEM,
  StampLedgerType.POINT_EARN,
  StampLedgerType.POINT_REDEEM,
  StampLedgerType.CASHBACK_EARN,
  StampLedgerType.CASHBACK_REDEEM,
  StampLedgerType.DISCOUNT_USE,
  StampLedgerType.EVENT_CHECKIN,
  StampLedgerType.MEMBERSHIP_USE,
];

type Metric = { value: number; previous: number };

type DayKey = string; // YYYY-MM-DD (İstanbul takvim günü)

function addDaysKey(key: DayKey, days: number): DayKey {
  const d = new Date(`${key}T12:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function todayKey(): DayKey {
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: STAMP_TIMEZONE }).format(
    new Date(),
  );
}

function dayStart(key: DayKey): Date {
  return startOfCalendarDay(STAMP_TIMEZONE, new Date(`${key}T12:00:00Z`));
}

function diffDays(fromKey: DayKey, toKey: DayKey): number {
  return (
    Math.round(
      (Date.parse(`${toKey}T12:00:00Z`) - Date.parse(`${fromKey}T12:00:00Z`)) /
        DAY_MS,
    ) + 1
  );
}

/** Veritabanı tarafında İstanbul yerel zamanı */
const LOCAL_TS = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${STAMP_TIMEZONE})`;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiService,
  ) {}

  /**
   * Özet ve raporlar sayfasının tüm verisi — tek istek, paralel ve
   * veritabanında gruplanmış sorgular.
   */
  async dashboard(tenantId: string, fromIso?: string, toIso?: string) {
    const range = this.resolveRange(fromIso, toIso);
    const { fromKey, toKey, days, start, end, prevStart, prevFromKey, prevToKey } =
      range;
    const inRange = { gte: start, lt: end };

    const [
      ledgerTotals,
      visitorTotals,
      newCustomerTotals,
      dailyLedger,
      dailyCustomers,
      heatmapRows,
      programGroups,
      programs,
      branchLedger,
      branchCustomers,
      branches,
      totalCustomers,
      activeCustomers,
      rewardReadyCount,
      walletPasses,
      walletDevices,
      cashbackBalance,
      cashbackCustomers,
      recent,
      nearReward,
      rewardMeta,
    ] = await Promise.all([
      // Mevcut + önceki dönem, tür bazında adet ve toplam
      this.prisma.$queryRaw<
        { type: string; cur: boolean; n: number; amount: number }[]
      >`
        SELECT "type"::text AS type,
               ("createdAt" >= ${start}) AS cur,
               COUNT(*)::int AS n,
               COALESCE(SUM("amount"), 0)::int AS amount
        FROM "StampLedger"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${prevStart} AND "createdAt" < ${end}
        GROUP BY 1, 2`,
      // Tekil ziyaretçi (mevcut + önceki dönem)
      this.prisma.$queryRaw<{ cur: boolean; n: number }[]>`
        SELECT ("createdAt" >= ${start}) AS cur,
               COUNT(DISTINCT "customerId")::int AS n
        FROM "StampLedger"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${prevStart} AND "createdAt" < ${end}
          AND "type"::text IN (${Prisma.join(VISIT_TYPES)})
        GROUP BY 1`,
      // Yeni müşteri (mevcut + önceki dönem)
      this.prisma.$queryRaw<{ cur: boolean; n: number }[]>`
        SELECT ("createdAt" >= ${start}) AS cur, COUNT(*)::int AS n
        FROM "Customer"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${prevStart} AND "createdAt" < ${end}
        GROUP BY 1`,
      // Günlük damga / ödül
      this.prisma.$queryRaw<{ day: string; type: string; n: number }[]>`
        SELECT to_char(${LOCAL_TS}::date, 'YYYY-MM-DD') AS day,
               "type"::text AS type,
               COUNT(*)::int AS n
        FROM "StampLedger"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
          AND "type"::text IN ('STAMP', 'REDEEM')
        GROUP BY 1, 2`,
      // Günlük yeni müşteri
      this.prisma.$queryRaw<{ day: string; n: number }[]>`
        SELECT to_char(${LOCAL_TS}::date, 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS n
        FROM "Customer"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
        GROUP BY 1`,
      // Haftanın günü × saat yoğunluğu (1 = Pazartesi)
      this.prisma.$queryRaw<{ dow: number; hour: number; n: number }[]>`
        SELECT EXTRACT(ISODOW FROM ${LOCAL_TS})::int AS dow,
               EXTRACT(HOUR FROM ${LOCAL_TS})::int AS hour,
               COUNT(*)::int AS n
        FROM "StampLedger"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
          AND "type"::text IN (${Prisma.join(VISIT_TYPES)})
        GROUP BY 1, 2`,
      this.prisma.stampLedger.groupBy({
        by: ['programId', 'type'],
        where: { tenantId, createdAt: inRange },
        _count: { _all: true },
      }),
      this.prisma.loyaltyProgram.findMany({
        where: { tenantId },
        select: { id: true, type: true },
      }),
      this.prisma.stampLedger.groupBy({
        by: ['branchId', 'type'],
        where: {
          tenantId,
          createdAt: inRange,
          type: { in: [StampLedgerType.STAMP, StampLedgerType.REDEEM] },
        },
        _count: { _all: true },
      }),
      this.prisma.customer.groupBy({
        by: ['branchId'],
        where: { tenantId, createdAt: inRange },
        _count: { _all: true },
      }),
      this.prisma.branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, stampCount: { gt: 0 } } }),
      this.prisma.customer.count({ where: { tenantId, rewardReady: true } }),
      // Kartı telefonunda olan müşteri (müşteri başına birden fazla pass olabilir)
      this.prisma.customer.count({
        where: { tenantId, passes: { some: { platform: 'APPLE' } } },
      }),
      this.prisma.appleDeviceRegistration.count({ where: { pass: { tenantId } } }),
      this.prisma.customerProgram.aggregate({
        where: {
          tenantId,
          program: { type: ProgramType.CASHBACK_CARD, isActive: true },
        },
        _sum: { balance: true },
      }),
      this.prisma.customerProgram.count({
        where: {
          tenantId,
          balance: { gt: 0 },
          program: { type: ProgramType.CASHBACK_CARD, isActive: true },
        },
      }),
      this.prisma.stampLedger.findMany({
        where: { tenantId, createdAt: inRange },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          type: true,
          amount: true,
          createdAt: true,
          note: true,
          customer: {
            select: { id: true, phone: true, phoneEnc: true, phoneLast4: true },
          },
          createdBy: { select: { name: true } },
        },
      }),
      this.prisma.customer.findMany({
        where: { tenantId, rewardReady: false, stampCount: { gt: 0 } },
        orderBy: { stampCount: 'desc' },
        take: 8,
        select: {
          id: true,
          phone: true,
          phoneEnc: true,
          phoneLast4: true,
          stampCount: true,
        },
      }),
      resolveStampRewardMeta(this.prisma, tenantId),
    ]);

    // ── KPI'lar (mevcut vs önceki dönem) ─────────────────────────────
    const metric = (): Metric => ({ value: 0, previous: 0 });
    const kpis = {
      stamps: metric(),
      redeems: metric(),
      newCustomers: metric(),
      visitors: metric(),
      pointsEarned: metric(),
      cashbackEarnKurus: metric(),
      cashbackRedeemKurus: metric(),
    };
    const put = (m: Metric, cur: boolean, v: number) => {
      if (cur) m.value += v;
      else m.previous += v;
    };
    for (const row of ledgerTotals) {
      if (row.type === 'STAMP') put(kpis.stamps, row.cur, row.n);
      else if (row.type === 'REDEEM') put(kpis.redeems, row.cur, row.n);
      else if (row.type === 'POINT_EARN') put(kpis.pointsEarned, row.cur, row.amount);
      else if (row.type === 'CASHBACK_EARN')
        put(kpis.cashbackEarnKurus, row.cur, row.amount);
      else if (row.type === 'CASHBACK_REDEEM')
        put(kpis.cashbackRedeemKurus, row.cur, row.amount);
    }
    for (const row of visitorTotals) put(kpis.visitors, row.cur, row.n);
    for (const row of newCustomerTotals) put(kpis.newCustomers, row.cur, row.n);

    // ── Günlük seri (boş günler 0) ───────────────────────────────────
    const daily = Array.from({ length: days }, (_, i) => ({
      date: addDaysKey(fromKey, i),
      stamps: 0,
      redeems: 0,
      newCustomers: 0,
    }));
    const byDay = new Map(daily.map((d) => [d.date, d]));
    for (const row of dailyLedger) {
      const d = byDay.get(row.day);
      if (!d) continue;
      if (row.type === 'STAMP') d.stamps = row.n;
      else if (row.type === 'REDEEM') d.redeems = row.n;
    }
    for (const row of dailyCustomers) {
      const d = byDay.get(row.day);
      if (d) d.newCustomers = row.n;
    }

    // ── Yoğunluk haritası: 7 gün × 24 saat ──────────────────────────
    const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const row of heatmapRows) {
      if (row.dow >= 1 && row.dow <= 7 && row.hour >= 0 && row.hour <= 23) {
        heatmap[row.dow - 1]![row.hour] = row.n;
      }
    }

    // ── Program tipi kırılımı ───────────────────────────────────────
    const programType = new Map(programs.map((p) => [p.id, p.type as string]));
    const typeBuckets = new Map<
      string,
      { type: string; label: string; events: number; stamps: number; redeems: number }
    >();
    for (const g of programGroups) {
      const key = g.programId ? (programType.get(g.programId) ?? 'LEGACY') : 'LEGACY';
      let b = typeBuckets.get(key);
      if (!b) {
        b = {
          type: key,
          label: PROGRAM_TYPE_LABELS[key] ?? key,
          events: 0,
          stamps: 0,
          redeems: 0,
        };
        typeBuckets.set(key, b);
      }
      const n = g._count._all;
      b.events += n;
      if (g.type === StampLedgerType.STAMP) b.stamps += n;
      else if (g.type === StampLedgerType.REDEEM) b.redeems += n;
    }

    // ── Şube karşılaştırma ─────────────────────────────────────────
    const branchRows = branches.map((b) => ({
      branchId: b.id,
      branchName: b.name,
      stamps: 0,
      redeems: 0,
      newCustomers: 0,
    }));
    const byBranch = new Map(branchRows.map((b) => [b.branchId, b]));
    for (const g of branchLedger) {
      const b = g.branchId ? byBranch.get(g.branchId) : undefined;
      if (!b) continue;
      if (g.type === StampLedgerType.STAMP) b.stamps += g._count._all;
      else b.redeems += g._count._all;
    }
    for (const g of branchCustomers) {
      const b = g.branchId ? byBranch.get(g.branchId) : undefined;
      if (b) b.newCustomers += g._count._all;
    }

    return {
      range: { from: fromKey, to: toKey, days },
      previousRange: { from: prevFromKey, to: prevToKey },
      reward: rewardMeta,
      kpis,
      daily,
      heatmap,
      byProgramType: [...typeBuckets.values()].sort((a, b) => b.events - a.events),
      branches: branchRows.sort((a, b) => b.stamps - a.stamps),
      snapshot: {
        totalCustomers,
        activeCustomers,
        rewardReadyCount,
        walletPasses,
        walletDevices,
        cashbackOutstandingKurus: cashbackBalance._sum.balance ?? 0,
        cashbackCustomers,
      },
      recentActivity: recent.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        createdAt: r.createdAt,
        phone: this.pii.phoneMasked(r.customer),
        customerId: r.customer.id,
        byName: r.createdBy?.name ?? null,
        note: r.note,
      })),
      nearReward: nearReward.map((c) => ({
        id: c.id,
        phone: this.pii.phoneMasked(c),
        stampCount: c.stampCount,
        remaining: Math.max(rewardMeta.stampsRequired - c.stampCount, 0),
      })),
    };
  }

  /** from/to (YYYY-MM-DD, dahil) → UTC sınırlar + aynı uzunlukta önceki dönem */
  private resolveRange(fromIso?: string, toIso?: string) {
    const today = todayKey();
    let fromKey = fromIso ?? addDaysKey(today, -6);
    let toKey = toIso ?? today;
    if (fromKey > toKey) [fromKey, toKey] = [toKey, fromKey];
    if (diffDays(fromKey, toKey) > MAX_RANGE_DAYS) {
      fromKey = addDaysKey(toKey, -(MAX_RANGE_DAYS - 1));
    }
    const days = diffDays(fromKey, toKey);
    const prevToKey = addDaysKey(fromKey, -1);
    const prevFromKey = addDaysKey(prevToKey, -(days - 1));

    return {
      fromKey,
      toKey,
      days,
      start: dayStart(fromKey),
      end: dayStart(addDaysKey(toKey, 1)),
      prevStart: dayStart(prevFromKey),
      prevFromKey,
      prevToKey,
    };
  }
}
