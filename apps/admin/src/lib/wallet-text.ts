/**
 * Kart zemininin açıklığına göre yazı renklerini seçer.
 * Açık zeminde (ör. beyaz kart) kayıtlı açık gri yazılar okunmaz; koyu ton kullanılır.
 */
export function passTextColors(
  primary: string | null | undefined,
  fg: string,
  label: string,
): { fg: string; label: string } {
  const m = /^#?([0-9a-f]{6})$/i.exec((primary ?? "").trim());
  if (!m) return { fg, label };
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum > 0.6) return { fg: "#111827", label: "#4b5563" };
  return { fg, label };
}
