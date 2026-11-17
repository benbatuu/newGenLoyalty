"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { longDay, shortDay } from "./date-utils";
import { fmtInt, SERIES, type DailyRow } from "./types";

const H = 240;
const PAD = { top: 12, right: 12, bottom: 26, left: 36 };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

/** Günlük damga & ödül — tek eksen (ikisi de adet), çapraz çizgi + tooltip */
export function TrendChart({ rows }: { rows: DailyRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Gerçek piksel genişliğiyle çiz — metinler esnemesin
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setW(Math.max(280, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { max, ticks, x, y } = useMemo(() => {
    const raw = Math.max(0, ...rows.flatMap((r) => [r.stamps, r.redeems]));
    const max = niceMax(raw);
    const ticks = [0, max / 2, max];
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i: number) =>
      PAD.left + (rows.length <= 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    return { max, ticks, x, y };
  }, [rows, W]);

  const path = (key: "stamps" | "redeems") =>
    rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join("");

  const areaPath =
    rows.length > 1
      ? `${path("stamps")}L${x(rows.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
      : "";

  // X ekseni etiketleri — en fazla ~7 tane
  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(W / 90))));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || rows.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const innerW = W - PAD.left - PAD.right;
    const i =
      rows.length <= 1
        ? 0
        : Math.round(((px - PAD.left) / innerW) * (rows.length - 1));
    setHover(Math.min(rows.length - 1, Math.max(0, i)));
  }

  const h = hover != null ? rows[hover] : null;
  const tipLeftPct = hover != null ? (x(hover) / W) * 100 : 0;

  return (
    <div className="relative" ref={boxRef}>
      {/* Lejant */}
      <div className="mb-2 flex items-center gap-4 text-[0.75rem] text-[var(--muted)]">
        {(["stamps", "redeems"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES[k].color }} />
            {k === "stamps" ? "Verilen damga" : "Kullanılan ödül"}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block w-full touch-none select-none"
        role="img"
        aria-label={`Günlük damga ve ödül grafiği, en yüksek ${fmtInt(max)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(223,229,235,0.08)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--muted)]" style={{ fontSize: 11 }}>
              {fmtInt(t)}
            </text>
          </g>
        ))}

        {areaPath ? <path className="chart-fade" d={areaPath} fill={SERIES.stamps.color} opacity={0.08} /> : null}
        <path className="chart-draw" pathLength={1} d={path("stamps")} fill="none" stroke={SERIES.stamps.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path className="chart-draw" style={{ animationDelay: "200ms" }} pathLength={1} d={path("redeems")} fill="none" stroke={SERIES.redeems.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {rows.map((r, i) =>
          i % labelEvery === 0 || i === rows.length - 1 ? (
            <text key={r.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-[var(--muted)]" style={{ fontSize: 11 }}>
              {shortDay(r.date)}
            </text>
          ) : null,
        )}

        {h && hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="rgba(223,229,235,0.25)" />
            {(["stamps", "redeems"] as const).map((k) => (
              <circle key={k} cx={x(hover)} cy={y(h[k])} r={4.5} fill={SERIES[k].color} stroke="var(--panel)" strokeWidth={2} />
            ))}
          </g>
        ) : null}
      </svg>

      {h ? (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[0.75rem] shadow-[var(--shadow-lg)]"
          style={{ left: `clamp(80px, ${tipLeftPct}%, calc(100% - 80px))` }}
        >
          <p className="mb-1 font-semibold text-[var(--ink)]">{longDay(h.date)}</p>
          {(
            [
              ["stamps", "Damga"],
              ["redeems", "Ödül"],
              ["newCustomers", "Yeni müşteri"],
            ] as const
          ).map(([k, label]) => (
            <p key={k} className="flex items-center justify-between gap-4 text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                {k !== "newCustomers" ? (
                  <span className="h-2 w-2 rounded-full" style={{ background: SERIES[k].color }} />
                ) : (
                  <span className="h-2 w-2" />
                )}
                {label}
              </span>
              <span className="font-semibold tabular-nums text-[var(--ink)]">{fmtInt(h[k])}</span>
            </p>
          ))}
        </div>
      ) : null}

      {/* Ekran okuyucu için tablo */}
      <table className="sr-only">
        <caption>Günlük damga, ödül ve yeni müşteri</caption>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Damga</th>
            <th>Ödül</th>
            <th>Yeni müşteri</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date}>
              <td>{r.date}</td>
              <td>{r.stamps}</td>
              <td>{r.redeems}</td>
              <td>{r.newCustomers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
