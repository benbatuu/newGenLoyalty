"use client";

import { useState } from "react";
import { fmtInt, type ActivityRow, type BranchRow, type NearRewardRow, type ProgramTypeRow } from "./types";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DAYS_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
/** Marka kırmızısı: boş hücre koyu yüzey, yoğunluk arttıkça #ef233c */
const RAMP = ["#22252e", "#4a111b", "#7a1828", "#a91d30", "#d91e33", "#ef233c"];

/* ── Yoğunluk haritası ────────────────────────────────────────── */
export function BusyHeatmap({ grid }: { grid: number[][] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(0, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);

  // Sadece açık saatleri göster (hiç hareket olmayan uç saatleri kırp)
  const hourTotals = Array.from({ length: 24 }, (_, h) => grid.reduce((s, row) => s + (row[h] ?? 0), 0));
  let first = hourTotals.findIndex((v) => v > 0);
  let last = 23 - [...hourTotals].reverse().findIndex((v) => v > 0);
  if (first < 0) {
    first = 8;
    last = 22;
  }
  first = Math.max(0, Math.min(first, 8));
  last = Math.min(23, Math.max(last, 21));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);

  const step = (v: number) => (v <= 0 || max === 0 ? 0 : Math.min(RAMP.length - 1, Math.ceil((v / max) * (RAMP.length - 1))));

  let peak: { d: number; h: number; v: number } | null = null;
  grid.forEach((row, d) => row.forEach((v, h) => {
    if (v > 0 && (!peak || v > peak.v)) peak = { d, h, v };
  }));
  const peakInfo = peak as { d: number; h: number; v: number } | null;

  if (total === 0) {
    return (
      <p className="py-8 text-center text-[0.8125rem] text-[var(--muted)]">
        Bu dönemde henüz müşteri hareketi yok.
      </p>
    );
  }

  const hv = hover ? grid[hover.d]?.[hover.h] ?? 0 : null;

  return (
    <div>
      <p className="mb-3 text-[0.8125rem] text-[var(--muted)]">
        {peakInfo ? (
          <>
            En yoğun zaman:{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {DAYS_LONG[peakInfo.d]} {String(peakInfo.h).padStart(2, "0")}:00–{String(peakInfo.h + 1).padStart(2, "0")}:00
            </strong>{" "}
            ({fmtInt(peakInfo.v)} hareket)
          </>
        ) : null}
      </p>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[480px] gap-[3px]"
          style={{ gridTemplateColumns: `34px repeat(${hours.length}, minmax(0, 1fr))` }}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Haftanın günü ve saate göre müşteri yoğunluğu"
        >
          <span />
          {hours.map((h) => (
            <span key={h} className="text-center text-[10px] tabular-nums text-[var(--muted)]">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[11px] text-[var(--muted)]">{DAYS[d]}</span>
              {hours.map((h) => {
                const v = row[h] ?? 0;
                const active = hover?.d === d && hover?.h === h;
                return (
                  <span
                    key={h}
                    onPointerEnter={() => setHover({ d, h })}
                    className={`chart-pop h-6 rounded-[4px] transition-transform ${active ? "scale-110 ring-2 ring-[var(--ink)]/70" : ""}`}
                    style={{ background: RAMP[step(v)], animationDelay: `${(d * 24 + h) * 6}ms` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
        <span className="tabular-nums" aria-live="polite">
          {hover && hv != null
            ? `${DAYS_LONG[hover.d]} ${String(hover.h).padStart(2, "0")}:00 · ${fmtInt(hv)} hareket`
            : "Bir kutunun üzerine gelin"}
        </span>
        <span className="inline-flex items-center gap-1">
          Az
          {RAMP.map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          Çok
        </span>
      </div>
    </div>
  );
}

/* ── Yatay çubuklar (program tipi / şube) ─────────────────────── */
function HBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const w = max ? Math.max(2, (value / max) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
        <span className="truncate font-medium text-[var(--ink)]">{label}</span>
        <span className="shrink-0 tabular-nums text-[var(--muted)]">
          <strong className="font-semibold text-[var(--ink)]">{fmtInt(value)}</strong>
          {sub ? <span className="ml-1.5">{sub}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
        <div className="chart-grow h-full rounded-full bg-[#ef233c]" style={{ width: `${w}%` }} />
      </div>
    </li>
  );
}

export function ProgramBreakdown({ rows }: { rows: ProgramTypeRow[] }) {
  const max = Math.max(0, ...rows.map((r) => r.events));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <HBar key={r.type} label={r.label} value={r.events} max={max} sub={`${fmtInt(r.stamps)} damga · ${fmtInt(r.redeems)} ödül`} />
      ))}
    </ul>
  );
}

export function BranchBreakdown({ rows }: { rows: BranchRow[] }) {
  const max = Math.max(0, ...rows.map((r) => r.stamps));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <HBar key={r.branchId} label={r.branchName} value={r.stamps} max={max} sub={`damga · ${fmtInt(r.redeems)} ödül · ${fmtInt(r.newCustomers)} yeni`} />
      ))}
    </ul>
  );
}

/* ── Ödüle yakın müşteriler ───────────────────────────────────── */
export function NearRewardList({ rows, stampsRequired }: { rows: NearRewardRow[]; stampsRequired: number }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-[var(--muted)]">Ödüle yaklaşan müşteri yok.</p>;
  }
  return (
    <ul className="divide-y divide-[var(--line)]">
      {rows.map((c) => {
        const progress = Math.min(100, (c.stampCount / Math.max(1, stampsRequired)) * 100);
        return (
          <li key={c.id}>
            <div className="flex items-center gap-3 py-2.5">
              <span className="w-28 shrink-0 font-mono text-[0.8125rem] text-[var(--ink)]">{c.phone}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                <span className="chart-grow block h-full rounded-full bg-[#ef233c]" style={{ width: `${progress}%` }} />
              </span>
              <span className="w-24 shrink-0 text-right text-[0.75rem] tabular-nums text-[var(--muted)]">
                {c.remaining === 1 ? (
                  <strong className="font-semibold text-[var(--ink)]">1 damga kaldı</strong>
                ) : (
                  `${c.remaining} damga kaldı`
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Son hareketler ───────────────────────────────────────────── */
const ACTIVITY_LABEL: Record<string, { label: string; dot: string }> = {
  STAMP: { label: "Damga verildi", dot: "#ef233c" },
  REDEEM: { label: "Ödül kullanıldı", dot: "#ef233c" },
  ADJUST: { label: "Düzeltme", dot: "#9ca3af" },
  POINT_EARN: { label: "Puan kazandı", dot: "#ef233c" },
  POINT_REDEEM: { label: "Puan harcadı", dot: "#ef233c" },
  CASHBACK_EARN: { label: "Cashback kazandı", dot: "#ef233c" },
  CASHBACK_REDEEM: { label: "Cashback kullandı", dot: "#ef233c" },
  DISCOUNT_USE: { label: "İndirim kullandı", dot: "#ef233c" },
  EVENT_CHECKIN: { label: "Etkinliğe katıldı", dot: "#ef233c" },
  MEMBERSHIP_USE: { label: "Üyelik kullanıldı", dot: "#ef233c" },
  STAFF_REDEEM: { label: "Personel kullanımı", dot: "#9ca3af" },
  REFERRAL: { label: "Davet ödülü", dot: "#ef233c" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-[var(--muted)]">Bu dönemde hareket yok.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {rows.map((r) => {
        const meta = ACTIVITY_LABEL[r.type] ?? { label: r.type, dot: "#9ca3af" };
        return (
          <li key={r.id} className="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-black/[0.02]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.dot }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] text-[var(--ink)]">
                <span className="font-medium">{meta.label}</span>
                <span className="ml-2 font-mono text-[0.75rem] text-[var(--muted)]">{r.phone}</span>
              </p>
              {r.byName ? <p className="truncate text-[0.6875rem] text-[var(--muted)]">{r.byName}</p> : null}
            </div>
            <time dateTime={r.createdAt} className="shrink-0 text-[0.6875rem] tabular-nums text-[var(--muted)]">
              {timeAgo(r.createdAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
