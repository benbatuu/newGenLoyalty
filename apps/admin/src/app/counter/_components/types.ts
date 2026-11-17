import type { CounterProgram } from "../counter-extra-panels";

export const PAGE_SIZE = 15;

export type Customer = {
  id: string;
  phone: string;
  displayName?: string | null;
  stampCount: number;
  rewardReady: boolean;
  hasWallet?: boolean;
};

export type Directory = {
  /** lean=1 isteğinde gelmez — ödül kuralı açılış isteğinden alınır */
  stampsRequired?: number;
  rewardLabel?: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  customers: Customer[];
};

export type StampResult = {
  customer: Customer;
  stampsRequired: number;
  rewardLabel: string;
  stampsRemaining: number;
  walletInviteUrl?: string | null;
};

export type Summary = {
  stampsToday: number;
  redeemsToday: number;
  totalCustomers: number;
};

export type ProgramHub = {
  programs: CounterProgram[];
};

export type PointState = {
  balance: number;
  redeemOptions: {
    pointCost: number;
    rewardLabel: string;
    affordable: boolean;
  }[];
  categories: { categoryId: string; label?: string; multiplier: number }[];
};

export type PointPreview = {
  amountTry: string;
  finalPoints: number;
  campaignMultiplier: number;
  campaignLabel?: string;
  requiresConfirmation: boolean;
};

export type Filter = "all" | "ready";

/** GET /stamps/counter */
export type CounterBootstrap = {
  programs: CounterProgram[];
  summary: Summary & { rewardReadyCount: number };
  campaigns: { id: string; label: string; multiplier?: number }[];
  reward: { stampsRequired: number; rewardLabel: string };
};

/** GET /stamps/customers/:id/counter-state */
export type CustomerCounterState = {
  customer: Customer;
  /** kart id → durum (alınamadıysa null) */
  states: Record<string, unknown>;
};

export type CashbackState = { balanceTry: string; earnPercent: number };
