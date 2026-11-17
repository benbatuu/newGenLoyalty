/** Program tipi kodu — Prisma ProgramType ile aynı string değerler */
export type ProgramTypeCode =
  | 'STAMP_CARD'
  | 'MULTI_STAMP'
  | 'POINT_CARD'
  | 'CASHBACK_CARD'
  | 'DISCOUNT_CARD'
  | 'EVENT_CARD'
  | 'MEMBERSHIP_CARD'
  | 'STAFF_CARD';

/** Paket kodu — `cafe` MVP alias (Starter limitleri) */
export type PlanCode =
  | 'cafe'
  | 'starter'
  | 'growth'
  | 'pro'
  | 'business'
  | 'enterprise';

export type PlanDefinition = {
  code: PlanCode;
  labelTr: string;
  priceTry: number;
  maxPrograms: number;
  allowedProgramTypes: ProgramTypeCode[];
  maxByType: Partial<Record<ProgramTypeCode, number>>;
  features: string[];
  maxBranches: number;
  maxMenuCategories: number;
  maxMenuItems: number;
  maxMenuTables: number;
};

const STAMP_ONLY: ProgramTypeCode[] = ['STAMP_CARD'];

const GROWTH_TYPES: ProgramTypeCode[] = [
  'STAMP_CARD',
  'MULTI_STAMP',
  'POINT_CARD',
];

const PRO_TYPES: ProgramTypeCode[] = [
  ...GROWTH_TYPES,
  'CASHBACK_CARD',
  'DISCOUNT_CARD',
  'EVENT_CARD',
];

const BUSINESS_TYPES: ProgramTypeCode[] = [
  ...PRO_TYPES,
  'MEMBERSHIP_CARD',
  'STAFF_CARD',
];

const ALL_TYPES: ProgramTypeCode[] = [...BUSINESS_TYPES];

const STARTER_FEATURES = [
  'wallet',
  'basic_reports',
  'branches:1',
] as const;

const GROWTH_FEATURES = [
  ...STARTER_FEATURES,
  'multistamp',
  'point_card',
  'campaigns',
  'win_back',
  'birthday',
  'menu',
] as const;

const PRO_FEATURES = [
  ...GROWTH_FEATURES,
  'reports',
  'cashback_card',
  'discount_card',
  'event_card',
  'nfc',
  'branches:3',
  'segments_basic',
] as const;

const BUSINESS_FEATURES = [
  ...PRO_FEATURES,
  'crm',
  'email',
  'sms_segment',
  'vip',
  'referral',
  'branches:10',
] as const;

const ENTERPRISE_FEATURES = [
  'all',
  'pos',
  'vas',
  'customer_app',
  'sla',
  'api',
] as const;

/** Paket kodu → birleşik özellik listesi (alt paketler dahil) */
export const PLAN_FEATURES: Record<PlanCode, readonly string[]> = {
  cafe: STARTER_FEATURES,
  starter: STARTER_FEATURES,
  growth: GROWTH_FEATURES,
  pro: PRO_FEATURES,
  business: BUSINESS_FEATURES,
  enterprise: ENTERPRISE_FEATURES,
};

/**
 * DB features ile paket şablonunu birleştirir.
 * Bilinen paket kodlarında şablon asgari kümedir.
 */
export function resolvePlanFeatures(
  planCode: string,
  dbFeatures?: string[] | null,
): string[] {
  if (dbFeatures?.includes('all')) {
    return [...PLAN_FEATURES.enterprise];
  }

  const code = planCode as PlanCode;
  const canonical =
    code in PLAN_FEATURES
      ? [...PLAN_FEATURES[code]]
      : [...PLAN_FEATURES.starter];

  const merged = new Set<string>(canonical);
  for (const feature of dbFeatures ?? []) {
    if (feature) merged.add(feature);
  }
  return [...merged];
}

export function planHasFeature(
  planCode: string,
  feature: string,
  dbFeatures?: string[] | null,
): boolean {
  const resolved = resolvePlanFeatures(planCode, dbFeatures);
  return resolved.includes('all') || resolved.includes(feature);
}

export const PROGRAM_TYPE_LABELS: Record<ProgramTypeCode, string> = {
  STAMP_CARD: 'Damga kartı',
  MULTI_STAMP: 'Multi damga',
  POINT_CARD: 'Puan kartı',
  CASHBACK_CARD: 'Cashback kartı',
  DISCOUNT_CARD: 'İndirim kartı',
  EVENT_CARD: 'Etkinlik kartı',
  MEMBERSHIP_CARD: 'Üyelik kartı',
  STAFF_CARD: 'Personel kartı',
};

export const PROGRAM_TYPE_HINTS: Record<ProgramTypeCode, string> = {
  STAMP_CARD: 'Her ziyarette damga — klasik sadakat kartı',
  MULTI_STAMP: 'Kahve, tatlı gibi farklı ürün grupları',
  POINT_CARD: 'Harcanabilir puan biriktirme',
  CASHBACK_CARD: 'Harcama tutarına göre % cashback — mağaza kredisi',
  DISCOUNT_CARD: 'Yüzde veya sabit indirim',
  EVENT_CARD: 'Etkinlik veya sezonluk kampanya',
  MEMBERSHIP_CARD: 'Üyelik seviyeleri',
  STAFF_CARD: 'Personel içi kart',
};

/** Kart tipi → gerekli özellik ve asgari paket */
export const PROGRAM_TYPE_REQUIREMENTS: Partial<
  Record<ProgramTypeCode, { feature?: string; minPlan: PlanCode }>
> = {
  MULTI_STAMP: { feature: 'multistamp', minPlan: 'growth' },
  POINT_CARD: { feature: 'point_card', minPlan: 'growth' },
  CASHBACK_CARD: { feature: 'cashback_card', minPlan: 'pro' },
  DISCOUNT_CARD: { feature: 'discount_card', minPlan: 'pro' },
  EVENT_CARD: { feature: 'event_card', minPlan: 'pro' },
  MEMBERSHIP_CARD: { minPlan: 'business' },
  STAFF_CARD: { minPlan: 'business' },
};

export const PROGRAM_TYPE_CATALOG_ORDER: ProgramTypeCode[] = [
  'STAMP_CARD',
  'MULTI_STAMP',
  'POINT_CARD',
  'CASHBACK_CARD',
  'DISCOUNT_CARD',
  'EVENT_CARD',
  'MEMBERSHIP_CARD',
  'STAFF_CARD',
];

const PLAN_UPGRADE_ORDER: PlanCode[] = [
  'cafe',
  'starter',
  'growth',
  'pro',
  'business',
  'enterprise',
];

export function findLowestPlanForProgramType(
  type: ProgramTypeCode,
): PlanDefinition {
  const req = PROGRAM_TYPE_REQUIREMENTS[type];
  for (const code of PLAN_UPGRADE_ORDER) {
    const def = PLAN_DEFINITIONS[code];
    if (!def.allowedProgramTypes.includes(type)) continue;
    if (
      req?.feature &&
      !def.features.includes('all') &&
      !def.features.includes(req.feature)
    ) {
      continue;
    }
    return def;
  }
  return PLAN_DEFINITIONS.enterprise;
}

export type ProgramTypeCatalogEntry = {
  type: ProgramTypeCode;
  label: string;
  hint: string;
  includedInPlan: boolean;
  canCreate: boolean;
  locked: boolean;
  quotaFull: boolean;
  used: number;
  max: number;
  lockedReason?: string;
  upgradePlanCode?: PlanCode;
  upgradePlanLabel?: string;
};

export function buildProgramTypeCatalog(
  plan: PlanDefinition,
  programs: { type: string }[],
): ProgramTypeCatalogEntry[] {
  const remainingPrograms = Math.max(0, plan.maxPrograms - programs.length);
  const featureSet = new Set(plan.features);
  const hasAll = featureSet.has('all');

  return PROGRAM_TYPE_CATALOG_ORDER.map((type) => {
    const used = programs.filter((p) => p.type === type).length;
    const req = PROGRAM_TYPE_REQUIREMENTS[type];
    const inAllowedTypes = plan.allowedProgramTypes.includes(type);
    const featureOk =
      !req?.feature || hasAll || featureSet.has(req.feature);
    const includedInPlan = inAllowedTypes && featureOk;
    const typeMax = includedInPlan
      ? (plan.maxByType[type] ?? plan.maxPrograms)
      : (plan.maxByType[type] ?? 0);
    const canCreate =
      includedInPlan && remainingPrograms > 0 && used < typeMax;
    const upgradePlan = findLowestPlanForProgramType(type);

    let lockedReason: string | undefined;
    if (!includedInPlan) {
      lockedReason = `${upgradePlan.labelTr} paketi gerekir`;
    } else if (remainingPrograms <= 0) {
      lockedReason = `Kart limiti doldu (${plan.maxPrograms})`;
    } else if (used >= typeMax) {
      lockedReason = `Bu tip için limit doldu (${used}/${typeMax})`;
    }

    return {
      type,
      label: PROGRAM_TYPE_LABELS[type],
      hint: PROGRAM_TYPE_HINTS[type],
      includedInPlan,
      canCreate,
      locked: !includedInPlan,
      quotaFull: includedInPlan && !canCreate,
      used,
      max: typeMax,
      lockedReason,
      upgradePlanCode: !includedInPlan ? upgradePlan.code : undefined,
      upgradePlanLabel: !includedInPlan ? upgradePlan.labelTr : undefined,
    };
  });
}

const STARTER_LIMITS: Omit<PlanDefinition, 'code' | 'labelTr' | 'priceTry'> = {
  maxPrograms: 1,
  allowedProgramTypes: STAMP_ONLY,
  maxByType: { STAMP_CARD: 1 },
  features: [...PLAN_FEATURES.cafe],
  maxBranches: 1,
  maxMenuCategories: 0,
  maxMenuItems: 0,
  maxMenuTables: 0,
};

/** task.md paket matrisi — kota ve özellik kaynağı */
export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  cafe: {
    code: 'cafe',
    labelTr: 'Kafe paketi',
    priceTry: 990,
    ...STARTER_LIMITS,
  },
  starter: {
    code: 'starter',
    labelTr: 'Starter',
    priceTry: 990,
    ...STARTER_LIMITS,
  },
  growth: {
    code: 'growth',
    labelTr: 'Growth',
    priceTry: 1490,
    maxPrograms: 3,
    allowedProgramTypes: GROWTH_TYPES,
    maxByType: {
      STAMP_CARD: 1,
      MULTI_STAMP: 2,
      POINT_CARD: 1,
    },
    features: [...PLAN_FEATURES.growth],
    maxBranches: 1,
    maxMenuCategories: 5,
    maxMenuItems: 30,
    maxMenuTables: 10,
  },
  pro: {
    code: 'pro',
    labelTr: 'Pro',
    priceTry: 1990,
    maxPrograms: 5,
    allowedProgramTypes: PRO_TYPES,
    maxByType: {
      STAMP_CARD: 1,
      MULTI_STAMP: 2,
      POINT_CARD: 1,
      CASHBACK_CARD: 1,
      DISCOUNT_CARD: 1,
      EVENT_CARD: 2,
    },
    features: [...PLAN_FEATURES.pro],
    maxBranches: 3,
    maxMenuCategories: 15,
    maxMenuItems: 100,
    maxMenuTables: 50,
  },
  business: {
    code: 'business',
    labelTr: 'Business',
    priceTry: 2990,
    maxPrograms: 8,
    allowedProgramTypes: BUSINESS_TYPES,
    maxByType: {
      STAMP_CARD: 1,
      MULTI_STAMP: 3,
      POINT_CARD: 2,
      CASHBACK_CARD: 1,
      DISCOUNT_CARD: 2,
      EVENT_CARD: 3,
      MEMBERSHIP_CARD: 1,
      STAFF_CARD: 1,
    },
    features: [...PLAN_FEATURES.business],
    maxBranches: 10,
    maxMenuCategories: 30,
    maxMenuItems: 300,
    maxMenuTables: 200,
  },
  enterprise: {
    code: 'enterprise',
    labelTr: 'Enterprise',
    priceTry: 0,
    maxPrograms: 50,
    allowedProgramTypes: ALL_TYPES,
    maxByType: {},
    features: [...PLAN_FEATURES.enterprise],
    maxBranches: 999,
    maxMenuCategories: 999,
    maxMenuItems: 9999,
    maxMenuTables: 9999,
  },
};

export function resolvePlanDefinition(planCode: string): PlanDefinition {
  const key = planCode as PlanCode;
  if (key in PLAN_DEFINITIONS) {
    return PLAN_DEFINITIONS[key];
  }
  return PLAN_DEFINITIONS.starter;
}

export type ProgramTypeQuota = {
  used: number;
  max: number;
  canCreate: boolean;
};

export type ProgramQuotaSnapshot = {
  planCode: string;
  planLabel: string;
  priceTry: number;
  maxPrograms: number;
  usedPrograms: number;
  remainingPrograms: number;
  canCreate: boolean;
  allowedTypes: ProgramTypeCode[];
  byType: Partial<Record<ProgramTypeCode, ProgramTypeQuota>>;
  typeCatalog: ProgramTypeCatalogEntry[];
  features: string[];
  maxBranches: number;
};

export function computeProgramQuota(
  planCode: string,
  programs: { type: string }[],
  planOverride?: PlanDefinition,
): ProgramQuotaSnapshot {
  const plan = planOverride ?? resolvePlanDefinition(planCode);
  const usedPrograms = programs.length;
  const remainingPrograms = Math.max(0, plan.maxPrograms - usedPrograms);

  const byType: Partial<Record<ProgramTypeCode, ProgramTypeQuota>> = {};
  for (const t of plan.allowedProgramTypes) {
    const used = programs.filter((p) => p.type === t).length;
    const typeMax = plan.maxByType[t] ?? plan.maxPrograms;
    byType[t] = {
      used,
      max: typeMax,
      canCreate:
        remainingPrograms > 0 &&
        used < typeMax &&
        plan.allowedProgramTypes.includes(t),
    };
  }

  const canCreate =
    remainingPrograms > 0 &&
    plan.allowedProgramTypes.some((t) => byType[t]?.canCreate);

  const typeCatalog = buildProgramTypeCatalog(plan, programs);

  return {
    planCode: plan.code,
    planLabel: plan.labelTr,
    priceTry: plan.priceTry,
    maxPrograms: plan.maxPrograms,
    usedPrograms,
    remainingPrograms,
    canCreate,
    allowedTypes: plan.allowedProgramTypes,
    byType,
    typeCatalog,
    features: plan.features,
    maxBranches: plan.maxBranches,
  };
}
