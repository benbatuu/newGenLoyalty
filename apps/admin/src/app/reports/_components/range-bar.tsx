"use client";

import { useEffect, useState } from "react";
import { PRESETS, type DatePreset } from "./date-utils";

const DATE_INPUT =
  "h-full w-[8.5rem] min-w-0 bg-transparent px-2 text-[0.8125rem] tabular-nums text-[var(--ink)] outline-none";

export function RangeBar({
  preset,
  from,
  to,
  refreshing,
  onPreset,
  onApplyCustom,
  onRefresh,
}: {
  preset: DatePreset;
  from: string;
  to: string;
  refreshing: boolean;
  onPreset: (id: DatePreset) => void;
  onApplyCustom: (from: string, to: string) => void;
  onRefresh: () => void;
}) {
  // Taslak tarihler — "Uygula"ya basılana kadar istek atılmaz
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [customOpen, setCustomOpen] = useState(preset === "custom");

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="radiogroup"
        aria-label="Dönem"
        className="inline-flex w-fit flex-wrap gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5"
      >
        {PRESETS.map((p) => {
          const active = p.id === "custom" ? customOpen || preset === "custom" : preset === p.id && !customOpen;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (p.id === "custom") {
                  setCustomOpen(true);
                  return;
                }
                setCustomOpen(false);
                onPreset(p.id);
              }}
              className={`h-8 rounded-md px-3 text-[0.8125rem] font-medium transition focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                active
                  ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)] ring-1 ring-black/[0.06]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {customOpen ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draftFrom || !draftTo) return;
              const [a, b] = draftFrom <= draftTo ? [draftFrom, draftTo] : [draftTo, draftFrom];
              onApplyCustom(a, b);
            }}
          >
            {/* Tek kutu içinde iki tarih — Başlangıç – Bitiş */}
            <div className="flex h-8 items-center rounded-md border border-[var(--line)] bg-[var(--panel)] transition focus-within:border-black/25 focus-within:ring-2 focus-within:ring-[var(--accent-glow)]">
              <label className="sr-only" htmlFor="range-from">Başlangıç</label>
              <input
                id="range-from"
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(e) => setDraftFrom(e.target.value)}
                className={DATE_INPUT}
              />
              <span className="px-0.5 text-[var(--muted)]" aria-hidden="true">–</span>
              <label className="sr-only" htmlFor="range-to">Bitiş</label>
              <input
                id="range-to"
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(e) => setDraftTo(e.target.value)}
                className={DATE_INPUT}
              />
            </div>
            <button
              type="submit"
              disabled={!draftFrom || !draftTo || (draftFrom === from && draftTo === to)}
              className="h-8 shrink-0 rounded-md bg-[var(--accent)] px-3 text-[0.8125rem] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Uygula
            </button>
          </form>
        ) : null}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={refreshing ? "animate-spin" : ""}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          {refreshing ? "Yenileniyor" : "Yenile"}
        </button>
      </div>
    </div>
  );
}
