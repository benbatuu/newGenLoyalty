/**
 * Etiket adı normalizasyonu: kelimelerin baş harfi büyük, kalanı küçük (Türkçe locale).
 * "şef önerisi" → "Şef Önerisi", "YÜKSEK PROTEİN" → "Yüksek Protein".
 */
export function normalizeTagLabel(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR') : w))
    .join(' ');
}

/** Karşılaştırma anahtarı: büyük/küçük harf ve Türkçe harf farkı olmadan. */
export function tagKey(raw: string): string {
  return normalizeTagLabel(raw).toLocaleLowerCase('tr-TR');
}

/** Hazır etiketler (ilk kurulumda katalogda yoksa eklenir). */
export const DEFAULT_MENU_TAGS: { tr: string; en: string }[] = [
  { tr: 'Vegan', en: 'Vegan' },
  { tr: 'Vejetaryen', en: 'Vegetarian' },
  { tr: 'Glutensiz', en: 'Gluten-Free' },
  { tr: 'Acılı', en: 'Spicy' },
  { tr: 'Popüler', en: 'Popular' },
  { tr: 'Yeni', en: 'New' },
  { tr: 'Şef Önerisi', en: "Chef's Pick" },
];
