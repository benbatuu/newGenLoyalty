import { PLAN_MENU_KEYS, ROLLOUT_FLAGS } from "@ngl/shared";
import type { Role } from "../../lib/api";
import type { IconName } from "./icons";

/** Sidebar menü yapısı + paket (plan) bazlı görünürlük kuralları. */

export type NavItem = {
  href: string;
  label: string;
  hint?: string;
  roles: Role[];
  icon: IconName;
  menuKey?: string;
};
export type NavGroup = { id: string; label: string; roles: Role[]; items: NavItem[] };

export type TenantPlanMenu = {
  planCode: string;
  menuKeys: string[];
  features: string[];
};

export type OnboardingMenuStatus = {
  complete: boolean;
};

/**
 * Menü sırası ve adları — teknik bilgisi olmayan kafe sahibinin
 * gündelik diliyle. Giriş sonrası açılan sayfa her rol için ilk öğedir
 * (bkz. `homePathForRole`): süper admin → /platform, kafe sahibi → /reports,
 * kasiyer → /counter.
 */
export const NAV_GROUPS: NavGroup[] = [
  /* ── Süper admin ─────────────────────────────────────────── */
  {
    id: "platform",
    label: "Yönetim",
    roles: ["SUPER_ADMIN"],
    items: [
      {
        href: "/platform",
        icon: "overview",
        label: "Genel bakış",
        hint: "Tüm işletmelerin özeti",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/tenants",
        icon: "building",
        label: "İşletmeler",
        hint: "Hesapları izle, dondur, düzenle",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/subscriptions",
        icon: "repeat",
        label: "Abonelikler",
        hint: "Aktif, deneme ve askıdaki hesaplar",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/plans",
        icon: "package",
        label: "Paketler ve fiyatlar",
        hint: "Paket içerikleri ve limitler",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    id: "platform-support",
    label: "İzleme",
    roles: ["SUPER_ADMIN"],
    items: [
      {
        href: "/platform/support",
        icon: "book",
        label: "Destek talepleri",
        hint: "Pasif hesap ve işletme talepleri",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/leads",
        icon: "inbox",
        label: "Gelen talepler",
        hint: "İletişim formundan gelenler",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/sms",
        icon: "message",
        label: "Gönderilen SMS'ler",
        hint: "SMS gönderim durumu",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },

  /* ── Kafe sahibi & kasiyer ───────────────────────────────── */
  {
    id: "daily",
    label: "İşletmem",
    roles: ["STORE_OWNER", "CASHIER"],
    items: [
      {
        href: "/reports",
        icon: "chart",
        label: "Özet ve raporlar",
        hint: "Müşteri, damga ve ödül hareketleri",
        roles: ["STORE_OWNER"],
        menuKey: "reports",
      },
      {
        href: "/counter",
        icon: "register",
        label: "Kasa",
        hint: "Müşteriye damga ver, ödül kullandır",
        roles: ["CASHIER", "STORE_OWNER"],
        menuKey: "counter",
      },
      {
        href: "/settings/integrations",
        icon: "card",
        label: "POS",
        hint: "Kasa yazılımı ve NFC bağlantıları",
        roles: ["STORE_OWNER"],
        menuKey: "pos",
      },
      {
        href: "/onboarding",
        icon: "checklist",
        label: "Kurulum adımları",
        hint: "Başlamak için yapılacaklar",
        roles: ["STORE_OWNER"],
        menuKey: "onboarding",
      },
    ],
  },
  {
    id: "loyalty",
    label: "Sadakat programı",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/reward",
        icon: "card",
        label: "Sadakat kartları",
        hint: "Damga ve puan kartlarınız",
        roles: ["STORE_OWNER"],
        menuKey: "reward",
      },
      {
        href: "/campaigns",
        icon: "calendar",
        label: "Kampanyalar",
        hint: "Çift damga, doğum günü, geri kazanma",
        roles: ["STORE_OWNER"],
        menuKey: "campaigns",
      },
      {
        href: "/vip",
        icon: "crown",
        label: "Üyelik seviyeleri",
        hint: "Bronz, gümüş, altın",
        roles: ["STORE_OWNER"],
        menuKey: "vip",
      },
      {
        href: "/referrals",
        icon: "gift",
        label: "Arkadaşını getir",
        hint: "Davet eden ve gelen ödül kazansın",
        roles: ["STORE_OWNER"],
        menuKey: "referrals",
      },
    ],
  },
  {
    id: "customers",
    label: "Müşteriler",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/customers",
        icon: "users",
        label: "Müşterilerim",
        hint: "Ara, filtrele, detayını gör",
        roles: ["STORE_OWNER"],
        menuKey: "customers",
      },
      {
        href: "/segments",
        icon: "layers",
        label: "Müşteri grupları",
        hint: "Örn. sık gelenler, uzun süredir gelmeyenler",
        roles: ["STORE_OWNER"],
        menuKey: "segments",
      },
    ],
  },
  {
    id: "messages",
    label: "Mesaj gönder",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/notifications",
        icon: "bell",
        label: "Telefona bildirim",
        hint: "Wallet kartına anlık mesaj",
        roles: ["STORE_OWNER"],
        menuKey: "notifications",
      },
      {
        href: "/email",
        icon: "mail",
        label: "E-posta",
        hint: "Şablon hazırla, toplu gönder",
        roles: ["STORE_OWNER"],
        menuKey: "email",
      },
    ],
  },
  {
    id: "store",
    label: "Kafem",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/menu",
        icon: "qr",
        label: "QR menü",
        hint: "Dijital menü ve masa QR kodları",
        roles: ["STORE_OWNER"],
        menuKey: "menu",
      },
      {
        href: "/settings/invite-design",
        icon: "qr",
        label: "Müşteri davet sayfası",
        hint: "Sayfayı blok blok tasarla, canlı önizle",
        roles: ["STORE_OWNER"],
        menuKey: "business",
      },
      {
        href: "/settings/card",
        icon: "palette",
        label: "Logo ve kart tasarımı",
        hint: "Logo, renkler, Wallet kartı, kayıt sayfası",
        roles: ["STORE_OWNER"],
        menuKey: "brand-card",
      },
      {
        href: "/settings",
        icon: "settings",
        label: "Ayarlar",
        hint: "Hesap, şubeler, çalışanlar, paket",
        roles: ["STORE_OWNER"],
        menuKey: "settings",
      },
    ],
  },
];

const BRAND_SETTINGS_PATHS = [
  "/settings/card",
  "/settings/business",
  "/settings/brand",
];

function isBrandSettingsPath(pathname: string): boolean {
  return BRAND_SETTINGS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function navItemActive(pathname: string, href: string): boolean {
  // Sorgu parametreli bağlantılar (ör. ?section=) yalnızca yol kısmıyla eşleşir
  if (href.includes("?")) return pathname === href.split("?")[0];
  if (pathname === href) return true;
  if (href === "/menu" && pathname.startsWith("/qr-design")) return true;
  if (href === "/settings/card") {
    // Davet/kayıt sayfası (/settings/business) kendi menü öğesinde vurgulanır
    if (pathname.startsWith("/settings/business") || pathname.startsWith("/settings/invite-design")) return false;
    return isBrandSettingsPath(pathname);
  }
  if (href === "/settings") {
    if (!pathname.startsWith("/settings")) return false;
    return !isBrandSettingsPath(pathname);
  }
  if (href !== "/platform" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

const STARTER_MENU_SET = new Set<string>(PLAN_MENU_KEYS.cafe);

const MENU_KEY_ALIASES: Record<string, string[]> = {
  reports: ["reports", "metrics"],
  business: ["business", "table-tent"],
  "brand-card": ["settings", "business", "table-tent"],
  settings: [
    "settings",
    "business",
    "staff",
    "branches",
    "billing",
    "pos",
    "help",
    "table-tent",
  ],
};

const MENU_FEATURE_FALLBACK: Record<string, string> = {
  campaigns: "campaigns",
  segments: "segments_basic",
  vip: "vip",
  referrals: "referral",
  email: "email",
  social: "crm",
  pos: "pos",
  menu: "menu",
};

function menuKeyAllowed(
  menuKey: string,
  plan: TenantPlanMenu | null | undefined,
): boolean {
  const accepted = MENU_KEY_ALIASES[menuKey] ?? [menuKey];
  if (plan?.features.includes("all")) return true;
  if (plan) {
    if (accepted.some((k) => plan.menuKeys.includes(k))) return true;
    const feat = MENU_FEATURE_FALLBACK[menuKey];
    if (feat && plan.features.includes(feat)) return true;
    return false;
  }
  // Paket bilgisi henüz gelmedi ya da istek hata verdi: menüyü boşaltmak
  // yerine her pakette olan başlangıç menüsünü göster.
  return accepted.some((k) => STARTER_MENU_SET.has(k));
}

export function navItemVisible(
  item: NavItem,
  plan: TenantPlanMenu | null | undefined,
): boolean {
  if (item.menuKey === "social" && !ROLLOUT_FLAGS.socialRewards) return false;
  // POS bir sonraki sürümde açılacak; hazır olunca bu satırı kaldırın
  if (item.menuKey === "pos") return false;
  if (!item.menuKey) return true;
  return menuKeyAllowed(item.menuKey, plan);
}

export function roleLabel(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Süper admin";
    case "STORE_OWNER":
      return "Kafe sahibi";
    case "CASHIER":
      return "Kasiyer";
  }
}
