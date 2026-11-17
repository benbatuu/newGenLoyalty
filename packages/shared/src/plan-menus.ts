import type { PlanCode } from './plans';
import { ROLLOUT_FLAGS } from './rollout-flags';

/** Admin sidebar menü anahtarları — `menuKey` ile birebir eşleşir */
export const ADMIN_MENU_CATALOG = [
  { key: 'counter', label: 'Tezgâh', group: 'ops' },
  { key: 'onboarding', label: 'Kurulum', group: 'ops' },
  { key: 'reports', label: 'Raporlar', group: 'ops' },
  /** @deprecated — reports ile birleşti; geriye dönük paket anahtarı */
  { key: 'metrics', label: 'Özet (eski)', group: 'ops' },
  { key: 'customers', label: 'Müşteriler', group: 'customers' },
  { key: 'segments', label: 'Segmentler', group: 'customers' },
  { key: 'vip', label: 'VIP', group: 'customers' },
  { key: 'referrals', label: 'Referans', group: 'customers' },
  { key: 'email', label: 'E-posta', group: 'customers' },
  { key: 'social', label: 'Sosyal ödüller', group: 'customers' },
  { key: 'reward', label: 'Ödül / kartlar', group: 'program' },
  { key: 'campaigns', label: 'Kampanyalar', group: 'program' },
  { key: 'settings', label: 'Ayarlar', group: 'store' },
  { key: 'business', label: 'Kayıt sayfası', group: 'program' },
  /** @deprecated — business ile birleşti */
  { key: 'table-tent', label: 'Table tent (eski)', group: 'program' },
  { key: 'notifications', label: 'Bildirimler', group: 'program' },
  { key: 'staff', label: 'Kasiyerler', group: 'store' },
  { key: 'branches', label: 'Şubeler', group: 'store' },
  { key: 'pos', label: 'POS', group: 'store' },
  { key: 'billing', label: 'Abonelik', group: 'store' },
  { key: 'help', label: 'Yardım', group: 'store' },
  { key: 'menu', label: 'QR Menü', group: 'program' },
] as const;

export type AdminMenuKey = (typeof ADMIN_MENU_CATALOG)[number]['key'];

const STARTER_MENUS: AdminMenuKey[] = [
  'counter',
  'reports',
  'onboarding',
  'reward',
  'settings',
  'business',
  'notifications',
  'staff',
  'billing',
  'help',
  'customers',
];

const GROWTH_MENUS: AdminMenuKey[] = [
  ...STARTER_MENUS,
  'campaigns',
  'menu',
];

const PRO_MENUS: AdminMenuKey[] = [...GROWTH_MENUS, 'branches', 'segments'];

const BUSINESS_MENUS: AdminMenuKey[] = [
  ...PRO_MENUS,
  'vip',
  'referrals',
  'email',
  'social',
  'pos',
];

const ENTERPRISE_MENUS: AdminMenuKey[] = [...BUSINESS_MENUS];

/** Paket kodu → varsayılan menü anahtarları (kaynak doğruluk) */
export const PLAN_MENU_KEYS: Record<PlanCode, readonly AdminMenuKey[]> = {
  cafe: STARTER_MENUS,
  starter: STARTER_MENUS,
  growth: GROWTH_MENUS,
  pro: PRO_MENUS,
  business: BUSINESS_MENUS,
  enterprise: ENTERPRISE_MENUS,
};

const ALL_KNOWN_MENU_KEYS = new Set<string>(
  ADMIN_MENU_CATALOG.map((m) => m.key),
);

/** Eski menü anahtarlarını güncel karşılığa çevirir */
const MENU_KEY_NORMALIZE: Record<string, AdminMenuKey> = {
  metrics: 'reports',
  'table-tent': 'business',
};

function normalizeMenuKey(key: string): AdminMenuKey | null {
  const mapped = MENU_KEY_NORMALIZE[key] ?? key;
  return ALL_KNOWN_MENU_KEYS.has(mapped) ? (mapped as AdminMenuKey) : null;
}

/** Sidebar'da gösterilmeyen birleştirilmiş eski anahtarlar + rollout kapalı özellikler */
const HIDDEN_MENU_KEYS = new Set<string>([
  'metrics',
  'table-tent',
  ...(ROLLOUT_FLAGS.socialRewards ? [] : ['social']),
]);

/**
 * Tenant menüsü — DB'deki menuKeys ile paket şablonunu birleştirir.
 * Bilinen paket kodlarında şablon asgari kümedir (DB eski/kısa olsa bile tam menü).
 */
export function resolvePlanMenuKeys(
  planCode: string,
  dbMenuKeys?: string[] | null,
): AdminMenuKey[] {
  const code = planCode as PlanCode;
  const canonical =
    code in PLAN_MENU_KEYS
      ? [...PLAN_MENU_KEYS[code]]
      : [...PLAN_MENU_KEYS.starter];

  const merged = new Set<string>(canonical);
  for (const key of dbMenuKeys ?? []) {
    const norm = normalizeMenuKey(key);
    if (norm) merged.add(norm);
  }

  return ADMIN_MENU_CATALOG.filter(
    (m) => merged.has(m.key) && !HIDDEN_MENU_KEYS.has(m.key),
  ).map((m) => m.key);
}

/** Menü anahtarı geçerli mi */
export function isKnownMenuKey(key: string): key is AdminMenuKey {
  return ALL_KNOWN_MENU_KEYS.has(key);
}
