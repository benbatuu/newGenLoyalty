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

/** Hazır etiketler (katalog sıfırlandığında veya ilk kurulumda eklenir). tr = ana ad, en = İngilizce. */
export const DEFAULT_MENU_TAGS: { tr: string; en: string }[] = [
  { tr: 'Yeni', en: 'New' },
  { tr: 'Popüler', en: 'Popular' },
  { tr: 'Şef önerisi', en: "Chef's pick" },
  { tr: 'Vegan', en: 'Vegan' },
  { tr: 'Vejetaryen', en: 'Vegetarian' },
  { tr: 'Glutensiz', en: 'Gluten-free' },
  { tr: 'Laktozsuz', en: 'Lactose-free' },
  { tr: 'Acılı', en: 'Spicy' },
  { tr: 'Sağlıklı', en: 'Healthy' },
  { tr: 'Yüksek protein', en: 'High protein' },
  { tr: 'Sezon ürünü', en: 'Seasonal' },
];

/** Hazır alerjenler: AB'nin 14 zorunlu alerjeni (tr = ana ad, en = İngilizce). */
export const DEFAULT_MENU_ALLERGENS: { tr: string; en: string }[] = [
  { tr: 'Gluten', en: 'Gluten' },
  { tr: 'Kabuklu deniz ürünleri', en: 'Crustaceans' },
  { tr: 'Yumurta', en: 'Eggs' },
  { tr: 'Balık', en: 'Fish' },
  { tr: 'Yer fıstığı', en: 'Peanuts' },
  { tr: 'Soya', en: 'Soybeans' },
  { tr: 'Süt', en: 'Milk' },
  { tr: 'Sert kabuklu yemişler', en: 'Tree nuts' },
  { tr: 'Kereviz', en: 'Celery' },
  { tr: 'Hardal', en: 'Mustard' },
  { tr: 'Susam', en: 'Sesame seeds' },
  { tr: 'Kükürt dioksit ve sülfitler', en: 'Sulphur dioxide and sulphites' },
  { tr: 'Acı bakla', en: 'Lupin' },
  { tr: 'Yumuşakçalar', en: 'Molluscs' },
];
