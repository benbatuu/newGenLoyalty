/** Eski sürümlerin eklediği ` · HH:MM` soneklerini ve görünmez işaretleri temizler. */
export function stripBroadcastStamps(raw: string): string {
  let s = raw.replace(/​/g, '').trim();
  const suffix = /( · \d{1,2}[:.]\d{2})+$/u;
  while (suffix.test(s)) {
    s = s.replace(suffix, '').trim();
  }
  return s;
}

/**
 * Apple, alan değeri değişmeden aynı metni tekrar göndermez. Metin görünmesin
 * diye değeri görünmez bir karakterle ayırt ediyoruz (saat eklenmiyor).
 */
export function withBroadcastMarker(clean: string, previousRaw: string): string {
  return previousRaw === clean ? `${clean}​` : clean;
}
