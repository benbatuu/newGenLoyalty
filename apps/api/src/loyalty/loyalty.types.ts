/** Sadakat programı domain tipleri (@ngl/shared ile aynı şekil) */

export type StampCardConfig = {
  earnRule: 'PER_VISIT' | 'PER_RECEIPT';
  stampsPerEarn: number;
  maxStampsPerDay: number;
  blockStampWhenRewardReady: boolean;
  resetOnRedeem: 'ZERO' | 'ROLLOVER_EXCESS';
};

export type MultiStampProductGroup = {
  id: string;
  label: string;
  multiplier: number;
  stampTheme?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
};

export type MultiStampLane = {
  id: string;
  label: string;
  icon?: string;
  stampTheme?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
};

export type MultiStampConfig = {
  mode: 'LANES' | 'MULTIPLIER';
  lanes?: MultiStampLane[];
  productGroups?: MultiStampProductGroup[];
  maxStampsPerDayPerLane?: number;
  dailyCapUnit?: 'TRANSACTIONS' | 'STAMPS';
};

export const DEFAULT_STAMP_CARD_CONFIG: StampCardConfig = {
  earnRule: 'PER_VISIT',
  stampsPerEarn: 1,
  maxStampsPerDay: 1,
  blockStampWhenRewardReady: true,
  resetOnRedeem: 'ZERO',
};

export type PointRedeemRule = {
  pointCost: number;
  rewardType: 'FREE_ITEM' | 'DISCOUNT_FIXED' | 'DISCOUNT_PERCENT';
  rewardLabel: string;
  value?: number;
};

export type PointCategoryRate = {
  categoryId: string;
  label?: string;
  multiplier: number;
};

export type PointTieredEarnRate = {
  minLifetimeSpend: number;
  rateMultiplier: number;
};

export type PointCardConfig = {
  earnRate: { default: number; currency: 'TRY' };
  categoryRates?: PointCategoryRate[];
  tieredEarnRates?: PointTieredEarnRate[];
  redeemRules: PointRedeemRule[];
  maxPointsPerDay: number;
  requireAmountConfirmationAbove: number;
  allowPartialRedeem: boolean;
};

export const DEFAULT_POINT_CARD_CONFIG: PointCardConfig = {
  earnRate: { default: 1, currency: 'TRY' },
  categoryRates: [
    { categoryId: 'drink', label: 'İçecek', multiplier: 1 },
    { categoryId: 'food', label: 'Yiyecek', multiplier: 1 },
  ],
  tieredEarnRates: [{ minLifetimeSpend: 0, rateMultiplier: 1 }],
  redeemRules: [
    {
      pointCost: 100,
      rewardType: 'FREE_ITEM',
      rewardLabel: 'Bedava içecek',
    },
  ],
  maxPointsPerDay: 10_000,
  requireAmountConfirmationAbove: 50_000,
  allowPartialRedeem: false,
};

export type ProgramTierDto = {
  id: string;
  sortOrder: number;
  threshold: number;
  rewardLabel: string;
  redeemCost: number;
  laneId: string | null;
};

export type LoyaltyProgramDto = {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  branchId: string | null;
  branchName: string | null;
  config: StampCardConfig | Record<string, unknown>;
  validFrom: string | null;
  validUntil: string | null;
  tiers: ProgramTierDto[];
};

export type CustomerProgramDto = {
  id: string;
  programId: string;
  balance: number;
  rewardReady: boolean;
  balances: Record<string, number> | null;
  eligibleTierIds: string[] | null;
};

export type StaffCardAllowance = {
  monthlyBudgetTry?: number;
  dailyRedeemLimit?: number;
  percentDiscount?: number;
};

export type StaffCardConfig = {
  enrollment: 'WHITELIST' | 'INVITE_CODE';
  inviteCodes?: string[];
  whitelistedPhones?: string[];
  benefitType: 'STAMP' | 'POINT' | 'DISCOUNT' | 'FIXED_ALLOWANCE';
  allowance: StaffCardAllowance;
  requireManagerPinAbove?: number;
  linkedBranchIds?: string[];
  managerPin?: string;
};

export const DEFAULT_STAFF_CARD_CONFIG: StaffCardConfig = {
  enrollment: 'WHITELIST',
  whitelistedPhones: [],
  benefitType: 'DISCOUNT',
  allowance: {
    monthlyBudgetTry: 50_000,
    percentDiscount: 20,
    dailyRedeemLimit: 1,
  },
  requireManagerPinAbove: 10_000,
  linkedBranchIds: [],
};

export type MembershipBenefit = {
  type: 'MONTHLY_FREE_ITEM' | 'DISCOUNT_PERCENT' | 'POINT_MULTIPLIER';
  label: string;
  quota?: number;
  value?: number;
};

export type MembershipPlan = {
  id: string;
  label: string;
  priceTry: number;
  billingInterval: 'MONTH' | 'YEAR';
  benefits: MembershipBenefit[];
};

export type MembershipCardConfig = {
  plans: MembershipPlan[];
  gracePeriodDays: number;
  iyzicoSubscriptionProductCode?: string;
};

export const DEFAULT_MEMBERSHIP_CARD_CONFIG: MembershipCardConfig = {
  plans: [
    {
      id: 'monthly',
      label: 'Aylık üyelik',
      priceTry: 29_900,
      billingInterval: 'MONTH',
      benefits: [
        { type: 'MONTHLY_FREE_ITEM', label: 'Ayda 2 bedava filtre', quota: 2 },
      ],
    },
  ],
  gracePeriodDays: 3,
};

export type MembershipProgramMeta = {
  planId?: string;
  status?: 'active' | 'grace' | 'suspended' | 'expired';
  activatedAt?: string;
  expiresAt?: string;
  graceUntil?: string;
  benefitQuota?: Record<string, number>;
  quotaResetAt?: string;
};

export type StaffProgramMeta = {
  monthlySpendKurus?: number;
  dailyRedeemCount?: number;
  lastRedeemDay?: string;
};

export type DiscountTier = {
  minVisits?: number;
  minLifetimeSpend?: number;
  vipTierId?: string;
  value: number;
  discountType: 'PERCENT' | 'FIXED';
};

export type DiscountCardConfig = {
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  tierTrigger: 'VISITS' | 'SPEND' | 'VIP';
  tieredDiscounts?: DiscountTier[];
  validFrom?: string;
  validUntil?: string;
  maxUsesTotal?: number;
  maxUsesPerDay?: number;
  maxUsesPerMonth?: number;
  applicableCategories?: string[];
  stackWithCampaigns: boolean;
};

export const DEFAULT_DISCOUNT_CARD_CONFIG: DiscountCardConfig = {
  discountType: 'PERCENT',
  value: 10,
  tierTrigger: 'VISITS',
  tieredDiscounts: [
    { minVisits: 0, value: 10, discountType: 'PERCENT' },
    { minVisits: 20, value: 15, discountType: 'PERCENT' },
  ],
  maxUsesPerDay: 1,
  applicableCategories: [],
  stackWithCampaigns: false,
};

export type CashbackCategoryRate = {
  categoryId: string;
  label?: string;
  multiplier: number;
};

export type CashbackTieredRate = {
  minLifetimeSpendKurus: number;
  rateMultiplier: number;
};

export type CashbackCardConfig = {
  earnPercent: number;
  categoryRates?: CashbackCategoryRate[];
  tieredRates?: CashbackTieredRate[];
  minEarnKurus?: number;
  maxEarnPerDayKurus: number;
  minRedeemKurus: number;
  maxRedeemPercent: number;
  maxRedeemPerDayKurus?: number;
  requireAmountConfirmationAbove: number;
  stackWithDiscount: boolean;
  earnOnNetAfterCredit?: boolean;
};

export const DEFAULT_CASHBACK_CARD_CONFIG: CashbackCardConfig = {
  earnPercent: 10,
  categoryRates: [],
  tieredRates: [{ minLifetimeSpendKurus: 0, rateMultiplier: 1 }],
  minEarnKurus: 0,
  maxEarnPerDayKurus: 100_000,
  minRedeemKurus: 500,
  maxRedeemPercent: 50,
  requireAmountConfirmationAbove: 50_000,
  stackWithDiscount: false,
  earnOnNetAfterCredit: true,
};

export function formatTryFromKurus(kurus: number): string {
  return (kurus / 100).toFixed(2).replace('.', ',');
}

export type EventVenue = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export type EventReminderPush = {
  hoursBefore: number;
  messageTemplate: string;
};

export type EventCardConfig = {
  eventName: string;
  validFrom: string;
  validUntil: string;
  venue?: EventVenue;
  entryLimit: number;
  collectFields: ('name' | 'email' | 'phone')[];
  checkInMode: 'CASHIER_SCAN' | 'SELF_QR';
  autoDeactivateAfterEvent: boolean;
  reminderPush?: EventReminderPush[];
};

export const DEFAULT_EVENT_CARD_CONFIG: EventCardConfig = {
  eventName: 'Etkinlik',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  entryLimit: 1,
  collectFields: ['name'],
  checkInMode: 'CASHIER_SCAN',
  autoDeactivateAfterEvent: true,
  reminderPush: [],
};
