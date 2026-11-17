/** Obscure honeypot field — avoid names browsers autofill (website, url, company). */
export const HONEYPOT_FIELD = "fax_number" as const;

export function honeypotFilled(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}
