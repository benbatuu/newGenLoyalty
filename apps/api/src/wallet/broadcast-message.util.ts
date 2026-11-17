/** Apple pass tekrarında eklenen ` · HH:MM` soneklerini temizler. */
export function stripBroadcastStamps(raw: string): string {
  let s = raw.trim();
  const suffix = /( · \d{1,2}[:.]\d{2})+$/u;
  while (suffix.test(s)) {
    s = s.replace(suffix, '').trim();
  }
  return s;
}

export function withBroadcastStamp(clean: string, at = new Date()): string {
  const stamp = at.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${clean} · ${stamp}`;
}
