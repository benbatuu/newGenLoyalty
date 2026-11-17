/** GET /analytics/dashboard yanıtı */

export type Metric = { value: number; previous: number };

export type ActivityType =
  | "STAMP"
  | "REDEEM"
  | "ADJUST"
  | "POINT_EARN"
  | "POINT_REDEEM"
  | "DISCOUNT_USE"
  | "EVENT_CHECKIN"
  | "STAFF_REDEEM"
  | "REFERRAL"
  | "MEMBERSHIP_USE"
  | "CASHBACK_EARN"
  | "CASHBACK_REDEEM";

export type ActivityRow = {
  id: string;
  type: ActivityType;
  amount: number;
  createdAt: string;
  phone: string;
  customerId: string;
  byName: string | null;
  note: string | null;
};

export type NearRewardRow = {
  id: string;
  phone: string;
  stampCount: number;
  remaining: number;
};

export type DailyRow = {
  date: string;
  stamps: number;
  redeems: number;
  newCustomers: number;
};

export type ProgramTypeRow = {
  type: string;
  label: string;
  events: number;
  stamps: number;
  redeems: number;
};

export type BranchRow = {
  branchId: string;
  branchName: string;
  stamps: number;
  redeems: number;
  newCustomers: number;
};

export type Dashboard = {
  range: { from: string; to: string; days: number };
  previousRange: { from: string; to: string };
  reward: { stampsRequired: number; rewardLabel: string };
  kpis: {
    stamps: Metric;
    redeems: Metric;
    newCustomers: Metric;
    visitors: Metric;
    pointsEarned: Metric;
    cashbackEarnKurus: Metric;
    cashbackRedeemKurus: Metric;
  };
  daily: DailyRow[];
  /** 7 satır (Pzt→Paz) × 24 saat */
  heatmap: number[][];
  byProgramType: ProgramTypeRow[];
  branches: BranchRow[];
  snapshot: {
    totalCustomers: number;
    activeCustomers: number;
    rewardReadyCount: number;
    walletPasses: number;
    walletDevices: number;
    cashbackOutstandingKurus: number;
    cashbackCustomers: number;
  };
  recentActivity: ActivityRow[];
  nearReward: NearRewardRow[];
};

const nf = new Intl.NumberFormat("tr-TR");
export const fmtInt = (n: number) => nf.format(n);

const tryFmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});
export const fmtKurus = (kurus: number) => tryFmt.format(kurus / 100);

export function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** Önceki döneme göre % değişim; önceki 0 ise null (karşılaştırılamaz) */
export function deltaPct(m: Metric): number | null {
  if (!m.previous) return null;
  return Math.round(((m.value - m.previous) / m.previous) * 100);
}

/** Seri renkleri — doğrulandı (CVD + kontrast), sabit sırada */
export const SERIES = {
  stamps: { color: "#ef233c", label: "Damga" },
  redeems: { color: "#ef233c", label: "Ödül" },
} as const;
