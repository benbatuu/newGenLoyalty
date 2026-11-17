/** Ayarlar hub — sol menü (Marka & kart ana sidebar'da) */

export const BRAND_SETTINGS_PATHS = [
  "/settings/card",
  "/settings/business",
  "/settings/invite-design",
  "/settings/brand",
];

/** Sol ayar menüsü olmadan, tam genişlikte açılan sayfalar */
export const FULL_WIDTH_SETTINGS_PATHS = ["/settings/account"];

export function isFullWidthSettingsPath(pathname: string): boolean {
  return FULL_WIDTH_SETTINGS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isBrandSettingsPath(pathname: string): boolean {
  return BRAND_SETTINGS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type SettingsNavItem = {
  id: string;
  href: string;
  label: string;
  hint: string;
  /** Paket menü anahtarı — yoksa her zaman görünür */
  menuKey?: string;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: "account",
    label: "Hesap",
    items: [
      {
        id: "profile",
        href: "/settings/account",
        label: "Profil & güvenlik",
        hint: "Ad, e-posta, oturum",
      },
      {
        id: "billing",
        href: "/settings/billing",
        label: "Paket & abonelik",
        hint: "Plan, iptal, askı",
        menuKey: "billing",
      },
    ],
  },
  {
    id: "store",
    label: "İşletme",
    items: [
      {
        id: "branches",
        href: "/settings/branches",
        label: "Şubeler",
        hint: "Mağaza ve adres",
        menuKey: "branches",
      },
      {
        id: "staff",
        href: "/settings/staff",
        label: "Çalışanlar",
        hint: "Kasiyer hesapları",
        menuKey: "staff",
      },
    ],
  },
  {
    id: "support",
    label: "Destek",
    items: [
      {
        id: "help",
        href: "/settings/help",
        label: "Yardım & SSS",
        hint: "Rehber, geri bildirim",
        menuKey: "help",
      },
    ],
  },
];

/** Eski menü anahtarları → ayarlar alt sayfası */
export const SETTINGS_MENU_ALIASES: Record<string, string[]> = {
  settings: ["settings"],
  business: ["business", "table-tent"],
  staff: ["staff"],
  branches: ["branches"],
  billing: ["billing"],
  pos: ["pos"],
  help: ["help"],
};

export function settingsItemAllowed(
  menuKey: string | undefined,
  planMenuKeys: string[],
  featuresAll: boolean,
): boolean {
  if (!menuKey) return true;
  if (featuresAll) return true;
  const accepted = SETTINGS_MENU_ALIASES[menuKey] ?? [menuKey];
  return accepted.some((k) => planMenuKeys.includes(k));
}

export function visibleSettingsNav(planMenuKeys: string[], featuresAll: boolean) {
  return SETTINGS_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      settingsItemAllowed(item.menuKey, planMenuKeys, featuresAll),
    ),
  })).filter((g) => g.items.length > 0);
}

export const DEFAULT_SETTINGS_PATH = "/settings/account";
