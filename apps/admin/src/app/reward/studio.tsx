"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { ProgramTypeCatalogEntry } from "@ngl/shared";
import { CardTypeGallery } from "./card-type-gallery";
import {
  programTypeLabel,
  type ProgramCard,
  type ProgramQuota,
} from "./program-cards-hub";

/* ── Renk yardımcıları ────────────────────────────────────────── */
function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111111" : "#ffffff";
}

export function cardColor(
  card: ProgramCard & { config?: Record<string, unknown> },
  fallback: string,
): string {
  const wt = (card.config?.walletTemplate ?? {}) as { primaryColor?: string };
  return wt.primaryColor || fallback;
}

function summary(card: ProgramCard): string {
  const tier = card.tiers[0];
  if (card.type === "CASHBACK_CARD") {
    const pct = card.config?.earnPercent;
    return pct != null ? `%${pct} cashback` : "Cashback";
  }
  if (!tier) return programTypeLabel(card.type);
  if (card.type === "STAMP_CARD" || card.type === "MULTI_STAMP") {
    return `${tier.threshold} damga → ${tier.rewardLabel}`;
  }
  return tier.rewardLabel;
}

/* ── Üst şerit: gerçek renkli mini Wallet kartları ─────────────── */
export function CardCarousel({
  programs,
  selectedId,
  onSelect,
  renderPreview,
  quota,
  creating,
  onCreate,
  multiBranch,
  branches,
  defaultBranchId,
}: {
  programs: (ProgramCard & { config?: Record<string, unknown> })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  renderPreview: (p: ProgramCard & { config?: Record<string, unknown> }) => ReactNode;
  quota: ProgramQuota;
  creating: boolean;
  onCreate: (type: string, branchId?: string) => void;
  multiBranch?: boolean;
  branches?: { id: string; name: string }[];
  defaultBranchId?: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const catalog: ProgramTypeCatalogEntry[] = quota.typeCatalog ?? [];

  return (
    <section aria-label="Kartlarım" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[0.75rem] text-[var(--muted)]">
          <strong className="font-semibold text-[var(--ink)]">{quota.usedPrograms}</strong> / {quota.maxPrograms} kart ·{" "}
          {quota.planLabel} paketi
          {quota.remainingPrograms <= 0 ? (
            <>
              {" · "}
              <Link href="/billing" className="font-medium text-[var(--brand)] hover:underline">
                Yükselt
              </Link>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(0,340px))] justify-start gap-x-8 gap-y-10 pb-4 pt-2 [&>*]:w-full [&>*]:max-w-[340px]">
        {programs.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="group flex flex-col gap-3 rounded-[18px] text-left transition duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
          >
            {renderPreview(p)}
            <span className="flex items-center justify-between gap-2 px-1">
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-semibold text-[var(--ink)]">{p.name}</span>
                <span className="block truncate text-[0.6875rem] text-[var(--muted)]">
                  {programTypeLabel(p.type)} · {summary(p)}
                </span>
              </span>
              {p.isPrimary ? (
                <span className="shrink-0 rounded-full bg-[var(--ink)] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--panel)]">
                  Ana
                </span>
              ) : null}
            </span>
          </button>
        ))}

        {catalog.length > 0 && quota.remainingPrograms > 0 ? (
          <button
            type="button"
            disabled={creating}
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className="flex min-h-[220px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[var(--line-strong)] text-[var(--muted)] transition hover:border-[var(--ink)]/40 hover:text-[var(--ink)] disabled:opacity-50"
          >
            <span className="text-2xl leading-none" aria-hidden="true">＋</span>
            <span className="text-[0.8125rem] font-medium">{creating ? "Oluşturuluyor…" : "Yeni kart"}</span>
          </button>
        ) : null}
      </div>

      <CardTypeGallery
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalog={catalog}
        creating={creating}
        onCreate={(type, branchId) => {
          onCreate(type, branchId);
          setPickerOpen(false);
        }}
        multiBranch={multiBranch}
        branches={branches}
        defaultBranchId={defaultBranchId}
      />
    </section>
  );
}

/* ── Ayar paneli adımı (akordeon) ─────────────────────────────── */
export function StudioStep({
  index,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border bg-[var(--panel)] transition ${open ? "border-[var(--ink)]/15 shadow-[var(--shadow-md)]" : "border-[var(--line)]"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold transition ${
            open ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted)]"
          }`}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold text-[var(--ink)]">{title}</span>
          {!open && summary ? (
            <span className="block truncate text-[0.75rem] text-[var(--muted)]">{summary}</span>
          ) : null}
        </span>
        <span aria-hidden="true" className={`text-[var(--muted)] transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {open ? <div className="space-y-4 border-t border-[var(--line)] px-4 py-4 [&_.attio-surface]:!border-0 [&_.attio-surface]:!bg-transparent [&_.attio-surface]:!p-0 [&_.attio-surface]:!shadow-none">{children}</div> : null}
    </section>
  );
}

/* ── Önizleme sahnesi ─────────────────────────────────────────── */
export function PreviewStage({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <div
      className="relative inline-block max-w-full overflow-hidden rounded-3xl border border-[var(--line)] p-3 sm:p-4"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, ${color}22 0%, transparent 60%), linear-gradient(180deg, var(--surface) 0%, var(--panel) 100%)`,
      }}
    >
      <div className="mx-auto w-[340px] max-w-full">{children}</div>
    </div>
  );
}
