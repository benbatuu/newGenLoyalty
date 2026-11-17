import { deltaPct, fmtInt, type Metric } from "./types";

/** Önceki döneme göre değişim rozeti — ok + metin (renk tek başına anlam taşımaz) */
export function DeltaBadge({ metric }: { metric: Metric }) {
  const d = deltaPct(metric);
  if (d === null) {
    return (
      <span className="text-[0.6875rem] text-[var(--muted)]">
        {metric.value > 0 ? "Önceki dönemde yoktu" : "Önceki dönemle aynı"}
      </span>
    );
  }
  const up = d > 0;
  const flat = d === 0;
  const tone = flat
    ? "bg-black/[0.05] text-[var(--muted)]"
    : up
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : "bg-[var(--danger-soft)] text-[var(--danger)]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums ${tone}`}
      title={`Önceki dönem: ${fmtInt(metric.previous)}`}
    >
      <span aria-hidden="true">{flat ? "→" : up ? "↑" : "↓"}</span>
      {flat ? "Aynı" : `%${Math.abs(d)} ${up ? "artış" : "düşüş"}`}
    </span>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${w},${h}L0,${h}Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function KpiCard({
  label,
  hint,
  metric,
  format = fmtInt,
  trend,
  color = "#ef233c",
  primary,
}: {
  label: string;
  hint?: string;
  metric: Metric;
  format?: (n: number) => string;
  trend?: number[];
  color?: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`attio-surface flex flex-col gap-2 p-4 transition hover:shadow-[var(--shadow-md)] ${
        primary ? "ring-1 ring-[var(--brand)]/15" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.75rem] font-medium text-[var(--muted)]" title={hint}>
          {label}
        </p>
        <DeltaBadge metric={metric} />
      </div>
      <p className="font-display text-[1.75rem] leading-none tabular-nums tracking-tight text-[var(--ink)]">
        {format(metric.value)}
      </p>
      {trend ? <Sparkline values={trend} color={color} /> : null}
      {hint ? <p className="text-[0.6875rem] leading-snug text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

/** Küçük, karşılaştırmasız bilgi kutusu */
export function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5">
      <p className="text-[0.6875rem] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-[1.05rem] font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      {sub ? <p className="text-[0.6875rem] text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}
