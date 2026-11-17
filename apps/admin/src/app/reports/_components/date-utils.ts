export type DatePreset = "today" | "7d" | "30d" | "90d" | "month" | "custom";

export const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Bugün" },
  { id: "7d", label: "7 gün" },
  { id: "30d", label: "30 gün" },
  { id: "90d", label: "90 gün" },
  { id: "month", label: "Bu ay" },
  { id: "custom", label: "Özel" },
];

/** Yerel takvim günü (UTC değil — gece yarısından sonra kaymasın) */
function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoToday() {
  return localKey(new Date());
}

export function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localKey(d);
}

export function isoMonthStart() {
  const d = new Date();
  return localKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function presetRange(preset: DatePreset): { from: string; to: string } {
  const to = isoToday();
  switch (preset) {
    case "today":
      return { from: to, to };
    case "30d":
      return { from: isoDaysAgo(29), to };
    case "90d":
      return { from: isoDaysAgo(89), to };
    case "month":
      return { from: isoMonthStart(), to };
    case "7d":
    default:
      return { from: isoDaysAgo(6), to };
  }
}

export function detectPreset(from: string, to: string): DatePreset {
  for (const p of PRESETS) {
    if (p.id === "custom") continue;
    const r = presetRange(p.id);
    if (r.from === from && r.to === to) return p.id;
  }
  return "custom";
}

const dayFmt = (iso: string, withYear: boolean) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: withYear ? "numeric" : undefined,
  });

export function formatRangeLabel(from: string, to: string) {
  const withYear = from.slice(0, 4) !== to.slice(0, 4);
  if (from === to) return dayFmt(from, withYear);
  return `${dayFmt(from, withYear)} – ${dayFmt(to, withYear)}`;
}

export function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

export function longDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
