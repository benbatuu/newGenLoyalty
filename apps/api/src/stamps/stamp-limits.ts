/** Kasiyer çift tıklama / ağ tekrarı koruması (suistimal değil). */
export const STAMP_IDEMPOTENCY_WINDOW_MS = 30_000;

/** Fiziksel damga kartı standardı: 1 ziyaret = 1 damga (Türkiye takvim günü). */
export const STAMP_TIMEZONE = 'Europe/Istanbul';

export const STAMP_MAX_PER_CUSTOMER_PER_DAY = 1;

/** Verilen anın `timeZone` içindeki gece yarısı anını UTC Date olarak döner. */
export function startOfCalendarDay(
  timeZone: string,
  ref: Date = new Date(),
): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(ref)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  const elapsedMs =
    ((+parts.hour * 60 + +parts.minute) * 60 + +parts.second) * 1000;
  return new Date(ref.getTime() - elapsedMs);
}
