/** Maskeli veya ham telefon — API artık `5** *** ** 67` döndürür. */
export function displayPhone(phone: string | null | undefined): string {
  const raw = phone?.trim() ?? "";
  if (!raw) return "—";
  if (raw.includes("**")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw.startsWith("0") ? raw : `0${raw}`;
}

export function displayEmail(email: string | null | undefined): string {
  const raw = email?.trim() ?? "";
  if (!raw) return "—";
  if (raw.includes("***")) return raw;
  return raw;
}

/** Müşteri listesi / tezgâh etiketi — isim varsa isim, yoksa maskeli telefon. */
export function formatPhoneLabel(
  name: string | null | undefined,
  phone: string | null | undefined,
): string {
  const label = name?.trim();
  if (label) return label;
  return displayPhone(phone);
}
