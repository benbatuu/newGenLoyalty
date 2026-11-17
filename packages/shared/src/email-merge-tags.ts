/** E-posta birleştirme etiketleri — {customerName} vb. */

import type { EmailBlock, EmailDocument } from './email-document';

export type EmailMergeTagId =
  | 'customerName'
  | 'customerFirstName'
  | 'customerEmail'
  | 'customerPhone'
  | 'stampCount'
  | 'rewardStatus'
  | 'vipTier'
  | 'lifecycleStage'
  | 'businessName'
  | 'businessPhone'
  | 'businessWebsite';

export type EmailMergeTagDef = {
  id: EmailMergeTagId;
  token: string;
  label: string;
  description: string;
  example: string;
  group: 'customer' | 'business';
};

export const EMAIL_MERGE_TAGS: EmailMergeTagDef[] = [
  {
    id: 'customerName',
    token: '{customerName}',
    label: 'Müşteri adı',
    description: 'Kayıtlı görünen ad; yoksa “Değerli müşterimiz”',
    example: 'Ayşe Yılmaz',
    group: 'customer',
  },
  {
    id: 'customerFirstName',
    token: '{customerFirstName}',
    label: 'Müşteri adı (ilk kelime)',
    description: 'Görünen adın ilk kelimesi',
    example: 'Ayşe',
    group: 'customer',
  },
  {
    id: 'customerEmail',
    token: '{customerEmail}',
    label: 'Müşteri e-postası',
    description: 'Alıcının e-posta adresi',
    example: 'ayse@ornek.com',
    group: 'customer',
  },
  {
    id: 'customerPhone',
    token: '{customerPhone}',
    label: 'Müşteri telefonu',
    description: 'Kayıtlı telefon numarası',
    example: '+90 532 000 00 00',
    group: 'customer',
  },
  {
    id: 'stampCount',
    token: '{stampCount}',
    label: 'Damga sayısı',
    description: 'Müşterinin güncel damga adedi',
    example: '7',
    group: 'customer',
  },
  {
    id: 'rewardStatus',
    token: '{rewardStatus}',
    label: 'Ödül durumu',
    description: 'Ödül hazır mı — kısa metin',
    example: 'Ödülünüz hazır',
    group: 'customer',
  },
  {
    id: 'vipTier',
    token: '{vipTier}',
    label: 'VIP seviyesi',
    description: 'Sadakat seviyesi adı',
    example: 'Altın',
    group: 'customer',
  },
  {
    id: 'lifecycleStage',
    token: '{lifecycleStage}',
    label: 'Müşteri durumu',
    description: 'Yeni, aktif, uykuda veya ayrılmış',
    example: 'Aktif müşteri',
    group: 'customer',
  },
  {
    id: 'businessName',
    token: '{businessName}',
    label: 'İşletme adı',
    description: 'Markanız / işletme adınız',
    example: 'Demo Kafe',
    group: 'business',
  },
  {
    id: 'businessPhone',
    token: '{businessPhone}',
    label: 'İşletme telefonu',
    description: 'Kart veya kayıt sayfasındaki telefon',
    example: '+90 212 000 00 00',
    group: 'business',
  },
  {
    id: 'businessWebsite',
    token: '{businessWebsite}',
    label: 'Web sitesi',
    description: 'İşletme web adresi',
    example: 'https://ornek.com',
    group: 'business',
  },
];

export type EmailMergeContext = Partial<
  Record<EmailMergeTagId, string | number | null | undefined>
>;

const LIFECYCLE_LABELS: Record<string, string> = {
  new: 'Yeni müşteri',
  active: 'Aktif müşteri',
  dormant: 'Uykuda',
  churn: 'Uzun süredir gelmeyen',
};

function resolveTagValue(id: string, ctx: EmailMergeContext): string {
  if (id === 'işletme') {
    return String(ctx.businessName ?? 'İşletmeniz');
  }
  const key = id as EmailMergeTagId;
  const raw = ctx[key];
  if (raw == null || raw === '') {
    return defaultForTag(key);
  }
  if (key === 'lifecycleStage') {
    return LIFECYCLE_LABELS[String(raw)] ?? String(raw);
  }
  return String(raw);
}

function defaultForTag(id: EmailMergeTagId): string {
  switch (id) {
    case 'customerName':
      return 'Değerli müşterimiz';
    case 'customerFirstName':
      return 'Merhaba';
    case 'vipTier':
      return 'Standart';
    case 'rewardStatus':
      return 'Devam ediyor';
    case 'businessName':
      return 'İşletmeniz';
    case 'businessPhone':
    case 'businessWebsite':
    case 'customerEmail':
    case 'customerPhone':
      return '';
    case 'stampCount':
      return '0';
    case 'lifecycleStage':
      return 'Müşteri';
    default:
      return '';
  }
}

/** Tek metinde tüm etiketleri değiştirir — {tag}, {{tag}} ve {{işletme}} */
export function applyMergeTags(text: string, ctx: EmailMergeContext): string {
  if (!text) return text;
  let out = text.replace(/\{\{işletme\}\}/gi, resolveTagValue('işletme', ctx));
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, id: string) =>
    resolveTagValue(id, ctx),
  );
  out = out.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, id: string) =>
    resolveTagValue(id, ctx),
  );
  return out;
}

function personalizeBlock(block: EmailBlock, ctx: EmailMergeContext): EmailBlock {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'footer':
      return { ...block, text: applyMergeTags(block.text, ctx) };
    case 'button':
      return {
        ...block,
        label: applyMergeTags(block.label, ctx),
        url: applyMergeTags(block.url, ctx),
      };
    case 'highlight':
      return { ...block, text: applyMergeTags(block.text, ctx) };
    case 'list':
      return {
        ...block,
        items: block.items.map((i) => applyMergeTags(i, ctx)),
      };
    case 'columns':
      return {
        ...block,
        left: applyMergeTags(block.left, ctx),
        right: applyMergeTags(block.right, ctx),
      };
    case 'coupon':
      return {
        ...block,
        code: applyMergeTags(block.code, ctx),
        hint: applyMergeTags(block.hint, ctx),
      };
    case 'social':
      return {
        ...block,
        links: block.links.map((l) => ({
          ...l,
          label: applyMergeTags(l.label, ctx),
          url: applyMergeTags(l.url, ctx),
        })),
      };
    case 'image':
      return {
        ...block,
        alt: applyMergeTags(block.alt, ctx),
        url: block.url,
        linkUrl: block.linkUrl
          ? applyMergeTags(block.linkUrl, ctx)
          : block.linkUrl,
      };
    default:
      return block;
  }
}

export function personalizeEmailDocument(
  doc: EmailDocument,
  ctx: EmailMergeContext,
): EmailDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b) => personalizeBlock(b, ctx)),
  };
}

/** Editör önizlemesi için örnek değerler */
export function sampleMergeContext(
  overrides?: Partial<EmailMergeContext>,
): EmailMergeContext {
  const base: EmailMergeContext = {
    customerName: 'Ayşe Yılmaz',
    customerFirstName: 'Ayşe',
    customerEmail: 'ayse@ornek.com',
    customerPhone: '+90 532 000 00 00',
    stampCount: 7,
    rewardStatus: 'Ödülünüz hazır',
    vipTier: 'Altın',
    lifecycleStage: 'active',
    businessName: 'Demo Kafe',
    businessPhone: '+90 212 000 00 00',
    businessWebsite: 'https://ornek.com',
  };
  return { ...base, ...overrides };
}

export function mergeTagById(id: EmailMergeTagId): EmailMergeTagDef | undefined {
  return EMAIL_MERGE_TAGS.find((t) => t.id === id);
}

export function formatMergeToken(id: EmailMergeTagId): string {
  return mergeTagById(id)?.token ?? `{${id}}`;
}

/** API — müşteri satırından bağlam üretir */
export function mergeContextFromCustomer(
  customer: {
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
    stampCount?: number;
    rewardReady?: boolean;
    lifecycleStage?: string | null;
    vipTier?: { name: string } | null;
  },
  business: EmailMergeContext,
): EmailMergeContext {
  const displayName = customer.displayName?.trim();
  const firstName = displayName?.split(/\s+/)[0];
  return {
    ...business,
    customerName: displayName || undefined,
    customerFirstName: firstName || undefined,
    customerEmail: customer.email?.trim() || undefined,
    customerPhone: customer.phone?.trim() || undefined,
    stampCount: customer.stampCount ?? 0,
    rewardStatus: customer.rewardReady ? 'Ödülünüz hazır' : 'Devam ediyor',
    vipTier: customer.vipTier?.name,
    lifecycleStage: customer.lifecycleStage ?? undefined,
  };
}
