/** Türkiye cep formatı: 0541 472 58 20 (en fazla 11 rakam). */
export function formatTrPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean);
  return parts.join(" ");
}
