import type { PlanCode } from '@ngl/shared';
import { PLAN_DEFINITIONS, PLAN_MENU_KEYS } from '@ngl/shared';

/** @deprecated — use ADMIN_MENU_CATALOG from @ngl/shared */
export const ADMIN_MENU_KEY_OPTIONS = PLAN_MENU_KEYS.cafe.map((key) => ({
  key,
  label: key,
}));

type SeedPlan = {
  code: PlanCode;
  labelEn: string;
  sortOrder: number;
  isPublic: boolean;
  badgeTr?: string;
  badgeEn?: string;
  noteTr?: string;
  noteEn?: string;
  includesTr: string[];
  includesEn: string[];
  menuKeys: string[];
};

const SEED_META: Record<PlanCode, Omit<SeedPlan, 'code'>> = {
  cafe: {
    labelEn: 'Cafe plan',
    sortOrder: 100,
    isPublic: false,
    badgeTr: 'Legacy',
    badgeEn: 'Legacy',
    noteTr: 'Eski müşteriler — yeni kayıtlar Starter kullanır.',
    noteEn: 'Legacy tenants — new signups use Starter.',
    includesTr: [
      'Sınırsız müşteri ve damga',
      'Apple + Google Wallet kartları',
      'Owner + kasiyer hesapları',
      'SMS davet (kota anlaşmaya göre)',
      'Web panel + Flutter personel',
      'Temel özet (tam raporlar Growth+)',
    ],
    includesEn: [
      'Unlimited customers & stamps',
      'Apple + Google Wallet passes',
      'Owner + cashier accounts',
      'SMS invite (quota per agreement)',
      'Web panel + Flutter staff app',
      'Basic summary (full reports on Growth+)',
    ],
    menuKeys: [...PLAN_MENU_KEYS.cafe],
  },
  starter: {
    labelEn: 'Starter',
    sortOrder: 10,
    isPublic: true,
    noteTr: '1 sadakat kartı · 1 şube',
    noteEn: '1 loyalty card · 1 branch',
    includesTr: [
      '1 damga kartı',
      'Apple + Google Wallet',
      'Owner + kasiyer hesapları',
      'Temel rapor özeti',
      '1 şube',
    ],
    includesEn: [
      '1 stamp card',
      'Apple + Google Wallet',
      'Owner + cashier accounts',
      'Basic report summary',
      '1 branch',
    ],
    menuKeys: [...PLAN_MENU_KEYS.cafe],
  },
  growth: {
    labelEn: 'Growth',
    sortOrder: 20,
    isPublic: true,
    badgeTr: 'Popüler',
    badgeEn: 'Popular',
    noteTr: '3 sadakat kartına kadar · 1 şube',
    noteEn: 'Up to 3 loyalty cards · 1 branch',
    includesTr: [
      '3 sadakat kartına kadar',
      'Multi damga + puan kartı',
      'Kampanya & win-back',
      'Doğum günü otomasyonu',
      'Tam raporlar',
    ],
    includesEn: [
      'Up to 3 loyalty cards',
      'Multi-stamp + point card',
      'Campaigns & win-back',
      'Birthday automation',
      'Full reports',
    ],
    menuKeys: [...PLAN_MENU_KEYS.growth],
  },
  pro: {
    labelEn: 'Pro',
    sortOrder: 30,
    isPublic: true,
    noteTr: '5 sadakat kartı · 3 şubeye kadar',
    noteEn: '5 loyalty cards · up to 3 branches',
    includesTr: [
      '5 kart limiti',
      'Cashback & indirim kartları',
      'İndirim & etkinlik kartları',
      '3 şubeye kadar',
      'Segmentasyon (temel)',
      'NFC (yol haritası)',
    ],
    includesEn: [
      '5 card limit',
      'Cashback & discount cards',
      'Discount & event cards',
      'Up to 3 branches',
      'Segmentation (basic)',
      'NFC (roadmap)',
    ],
    menuKeys: [...PLAN_MENU_KEYS.pro],
  },
  business: {
    labelEn: 'Business',
    sortOrder: 40,
    isPublic: true,
    noteTr: '8 sadakat kartı · 10 şubeye kadar',
    noteEn: '8 loyalty cards · up to 10 branches',
    includesTr: [
      '8 kart limiti',
      'CRM & e-posta',
      'VIP & referral',
      '10 şubeye kadar',
      'SMS segment',
    ],
    includesEn: [
      '8 card limit',
      'CRM & email',
      'VIP & referral',
      'Up to 10 branches',
      'SMS segments',
    ],
    menuKeys: [...PLAN_MENU_KEYS.business],
  },
  enterprise: {
    labelEn: 'Enterprise',
    sortOrder: 110,
    isPublic: false,
    badgeTr: 'Kurumsal',
    badgeEn: 'Enterprise',
    noteTr: 'Özel fiyat — satış ekibiyle görüşün.',
    noteEn: 'Custom pricing — contact sales.',
    includesTr: [
      'Tüm kart tipleri',
      'POS & VAS entegrasyonu',
      'Müşteri uygulaması',
      'SLA & API erişimi',
    ],
    includesEn: [
      'All card types',
      'POS & VAS integrations',
      'Customer app',
      'SLA & API access',
    ],
    menuKeys: [...PLAN_MENU_KEYS.enterprise],
  },
};

export function buildDefaultPlanRows() {
  return (Object.keys(PLAN_DEFINITIONS) as PlanCode[]).map((code) => {
    const def = PLAN_DEFINITIONS[code];
    const meta = SEED_META[code];
    return {
      code,
      labelTr: def.labelTr,
      labelEn: meta.labelEn,
      priceTry: def.priceTry,
      maxPrograms: def.maxPrograms,
      allowedProgramTypes: def.allowedProgramTypes,
      maxByType: def.maxByType,
      features: def.features,
      menuKeys: meta.menuKeys,
      maxBranches: def.maxBranches,
      maxMenuCategories: def.maxMenuCategories,
      maxMenuItems: def.maxMenuItems,
      maxMenuTables: def.maxMenuTables,
      sortOrder: meta.sortOrder,
      isActive: true,
      isPublic: meta.isPublic,
      badgeTr: meta.badgeTr ?? null,
      badgeEn: meta.badgeEn ?? null,
      noteTr: meta.noteTr ?? null,
      noteEn: meta.noteEn ?? null,
      includesTr: meta.includesTr,
      includesEn: meta.includesEn,
    };
  });
}
