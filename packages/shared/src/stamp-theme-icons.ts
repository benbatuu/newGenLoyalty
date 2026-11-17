/** Varsayılan damga ikonları — [Thiings](https://www.thiings.co) 3D PNG (Vercel Blob CDN) */

export type StampThemeId =
  | 'COFFEE'
  | 'DESSERT'
  | 'STAR'
  | 'HEART'
  | 'DONUT'
  | 'CUSTOM';

export type StampThemeIconSet = {
  filledUrl: string;
  emptyUrl: string;
  label: string;
  emoji: string;
  hint: string;
  /** thiings.co/things/{slug} */
  filledSlug: string;
  emptySlug: string;
};

const CDN = 'https://lftz25oez4aqbxpq.public.blob.vercel-storage.com';

/** COFFEE · DESSERT · DONUT→Kavanoz · STAR→Çilek · HEART */
export const STAMP_THEME_ICONS: Record<
  Exclude<StampThemeId, 'CUSTOM'>,
  StampThemeIconSet
> = {
  COFFEE: {
    filledUrl: `${CDN}/image-fsXVydeN0F6ipA61bBmRs4jicdBfuR.png`,
    emptyUrl: `${CDN}/image-7iqHsnDXY3jSBLkD19tlxK4pHYUzG8.png`,
    label: 'Kahve',
    emoji: '☕',
    hint: 'Thiings · coffee-cup / upside-down-espresso-cup',
    filledSlug: 'coffee-cup',
    emptySlug: 'upside-down-espresso-cup',
  },
  DESSERT: {
    filledUrl: `${CDN}/image-uY7zoRI6T0R2FOMdfd76uBpEWkTf4L.png`,
    emptyUrl: `${CDN}/image-ZHQ3qRotWOLEEusU74H8oOz4srTPW5.png`,
    label: 'Tatlı',
    emoji: '🧇',
    hint: 'Thiings · belgian-waffle / plain-waffle',
    filledSlug: 'belgian-waffle',
    emptySlug: 'plain-waffle',
  },
  DONUT: {
    filledUrl: `${CDN}/image-xsrhHC5YLQmPCyR3madlMenTjJkr7I.png`,
    emptyUrl: `${CDN}/image-11oT8yYjgWzuxJfVNy2Ai4HqADD9ie.png`,
    label: 'Kavanoz',
    emoji: '🫙',
    hint: 'Thiings · sea-glass-jar / empty-jar',
    filledSlug: 'sea-glass-jar',
    emptySlug: 'empty-jar',
  },
  STAR: {
    filledUrl: `${CDN}/image-9lFmzwbzHyaHVDQAL1Q06nkrGB0tHc.png`,
    emptyUrl: `${CDN}/image-Lo6Z6zumG1tr01pDUmtp1bOwDlTeIE.png`,
    label: 'Çilek',
    emoji: '🍓',
    hint: 'Thiings · fresa-con-chocolate / strawberry',
    filledSlug: 'fresa-con-chocolate',
    emptySlug: 'strawberry',
  },
  HEART: {
    filledUrl: `${CDN}/image-RQtOXVb8LaWRBM1vFtlMCggGMulrKV.png`,
    emptyUrl: `${CDN}/image-bphMs6CK6BRIQtOvTqwfMJX9QG4Alx.png`,
    label: 'Kalp',
    emoji: '♥',
    hint: 'Thiings · heart / broken-heart',
    filledSlug: 'heart',
    emptySlug: 'broken-heart',
  },
};

export const STAMP_THEME_OPTIONS = (
  Object.entries(STAMP_THEME_ICONS) as [
    Exclude<StampThemeId, 'CUSTOM'>,
    StampThemeIconSet,
  ][]
).map(([id, meta]) => ({ id, ...meta }));

/** Multi-stamp grupları için varsayılan tema sırası */
export const DEFAULT_GROUP_STAMP_THEMES: Exclude<StampThemeId, 'CUSTOM'>[] = [
  'COFFEE',
  'DESSERT',
  'DONUT',
  'STAR',
  'HEART',
];

export function defaultGroupStampTheme(
  index: number,
): Exclude<StampThemeId, 'CUSTOM'> {
  return DEFAULT_GROUP_STAMP_THEMES[index % DEFAULT_GROUP_STAMP_THEMES.length]!;
}

export function normalizeStampThemeId(
  theme: string | null | undefined,
): StampThemeId {
  const t = (theme || 'COFFEE').toUpperCase();
  if (t in STAMP_THEME_ICONS) return t as Exclude<StampThemeId, 'CUSTOM'>;
  if (t === 'CUSTOM') return 'CUSTOM';
  return 'COFFEE';
}

export function getStampThemeIconUrls(
  theme: string | null | undefined,
): { filledUrl: string; emptyUrl: string } | null {
  const id = normalizeStampThemeId(theme);
  if (id === 'CUSTOM') return null;
  const set = STAMP_THEME_ICONS[id];
  return { filledUrl: set.filledUrl, emptyUrl: set.emptyUrl };
}

export function resolveStampIconSrc(
  theme: string | null | undefined,
  filled: boolean,
  overrides?: {
    filledUrl?: string | null;
    emptyUrl?: string | null;
  },
): string | null {
  const id = normalizeStampThemeId(theme);
  if (id === 'CUSTOM') {
    const filledUrl = overrides?.filledUrl?.trim() || null;
    const emptyUrl = overrides?.emptyUrl?.trim() || null;
    const src = filled ? filledUrl || emptyUrl : emptyUrl || filledUrl;
    return src || null;
  }
  const set = STAMP_THEME_ICONS[id];
  return filled ? set.filledUrl : set.emptyUrl;
}
