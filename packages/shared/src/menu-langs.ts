/** QR menü dil kataloğu — kullanıcı bunlardan istediğini açar. */

export type MenuLangMeta = {
  code: string;
  /** Bayrak emoji */
  flag: string;
  /** Yerel dil adı (seçicide) */
  native: string;
  /** İngilizce kısa ad */
  name: string;
};

export const MENU_LANG_CATALOG: MenuLangMeta[] = [
  { code: 'tr', flag: '🇹🇷', native: 'Türkçe', name: 'Turkish' },
  { code: 'en', flag: '🇬🇧', native: 'English', name: 'English' },
  { code: 'ru', flag: '🇷🇺', native: 'Русский', name: 'Russian' },
  { code: 'de', flag: '🇩🇪', native: 'Deutsch', name: 'German' },
  { code: 'fr', flag: '🇫🇷', native: 'Français', name: 'French' },
  { code: 'ar', flag: '🇸🇦', native: 'العربية', name: 'Arabic' },
  { code: 'es', flag: '🇪🇸', native: 'Español', name: 'Spanish' },
  { code: 'it', flag: '🇮🇹', native: 'Italiano', name: 'Italian' },
  { code: 'nl', flag: '🇳🇱', native: 'Nederlands', name: 'Dutch' },
  { code: 'pt', flag: '🇵🇹', native: 'Português', name: 'Portuguese' },
  { code: 'pl', flag: '🇵🇱', native: 'Polski', name: 'Polish' },
  { code: 'uk', flag: '🇺🇦', native: 'Українська', name: 'Ukrainian' },
  { code: 'ro', flag: '🇷🇴', native: 'Română', name: 'Romanian' },
  { code: 'bg', flag: '🇧🇬', native: 'Български', name: 'Bulgarian' },
  { code: 'el', flag: '🇬🇷', native: 'Ελληνικά', name: 'Greek' },
  { code: 'zh', flag: '🇨🇳', native: '中文', name: 'Chinese' },
  { code: 'ja', flag: '🇯🇵', native: '日本語', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', native: '한국어', name: 'Korean' },
  { code: 'fa', flag: '🇮🇷', native: 'فارسی', name: 'Persian' },
  { code: 'he', flag: '🇮🇱', native: 'עברית', name: 'Hebrew' },
  { code: 'hi', flag: '🇮🇳', native: 'हिन्दी', name: 'Hindi' },
  { code: 'az', flag: '🇦🇿', native: 'Azərbaycan', name: 'Azerbaijani' },
  { code: 'ka', flag: '🇬🇪', native: 'ქართული', name: 'Georgian' },
  { code: 'sv', flag: '🇸🇪', native: 'Svenska', name: 'Swedish' },
  { code: 'no', flag: '🇳🇴', native: 'Norsk', name: 'Norwegian' },
  { code: 'da', flag: '🇩🇰', native: 'Dansk', name: 'Danish' },
  { code: 'fi', flag: '🇫🇮', native: 'Suomi', name: 'Finnish' },
  { code: 'cs', flag: '🇨🇿', native: 'Čeština', name: 'Czech' },
  { code: 'hu', flag: '🇭🇺', native: 'Magyar', name: 'Hungarian' },
  { code: 'sr', flag: '🇷🇸', native: 'Српски', name: 'Serbian' },
  { code: 'hr', flag: '🇭🇷', native: 'Hrvatski', name: 'Croatian' },
  { code: 'sq', flag: '🇦🇱', native: 'Shqip', name: 'Albanian' },
];

const BY_CODE = new Map(MENU_LANG_CATALOG.map((l) => [l.code, l]));

/** Geriye uyumluluk — varsayılan açık diller */
export const MENU_LANGS = ['tr', 'en', 'ru'] as const;

/** Dil kodu (katalogdan veya serbest) */
export type MenuLang = string;

export type MenuLocalized = Partial<Record<string, string>>;

export function isKnownMenuLang(code: string): boolean {
  return BY_CODE.has(code);
}

export function getMenuLangMeta(code: string): MenuLangMeta {
  return (
    BY_CODE.get(code) ?? {
      code,
      flag: '🏳️',
      native: code.toUpperCase(),
      name: code.toUpperCase(),
    }
  );
}

export function normalizeMenuLangCode(raw: unknown, fallback = 'tr'): string {
  if (typeof raw !== 'string') return fallback;
  const code = raw.trim().toLowerCase().slice(0, 8);
  if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(code)) return fallback;
  return code;
}

export function normalizeMenuLangList(
  raw: unknown,
  fallback: string[] = ['tr'],
): string[] {
  if (!Array.isArray(raw)) return fallback.length ? fallback : ['tr'];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const code = normalizeMenuLangCode(item, '');
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out.length ? out : fallback.length ? fallback : ['tr'];
}

export function pickMenuLocale(
  map: MenuLocalized | undefined,
  lang: string,
  fallback = '',
): string {
  if (!map) return fallback;
  const ordered = [lang, 'tr', 'en', 'ru', ...Object.keys(map)];
  const seen = new Set<string>();
  for (const l of ordered) {
    if (seen.has(l)) continue;
    seen.add(l);
    const v = map[l]?.trim();
    if (v) return v;
  }
  return fallback;
}

/** Kategori / ürün çeviri JSON */
export type MenuContentI18n = Record<
  string,
  { name?: string; description?: string }
>;

export function pickContentName(
  lang: string,
  name: string,
  nameTr: string | null | undefined,
  nameEn: string | null | undefined,
  i18n?: MenuContentI18n | null,
): string {
  const fromJson = i18n?.[lang]?.name?.trim();
  if (fromJson) return fromJson;
  if (lang === 'tr' && nameTr?.trim()) return nameTr.trim();
  if (lang === 'en' && nameEn?.trim()) return nameEn.trim();
  if (lang === 'tr' && name.trim()) return name.trim();
  if (nameTr?.trim()) return nameTr.trim();
  if (nameEn?.trim()) return nameEn.trim();
  return name;
}

export function pickContentDescription(
  lang: string,
  description: string | null | undefined,
  i18n?: MenuContentI18n | null,
): string | null {
  const fromJson = i18n?.[lang]?.description?.trim();
  if (fromJson) return fromJson;
  return description?.trim() || null;
}
