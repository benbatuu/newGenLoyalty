"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProgramTypeCatalogEntry } from "@ngl/shared";
import {
  Badge,
  Field,
  SoftBox,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";

const TYPE_LABELS: Record<string, string> = {
  STAMP_CARD: "Damga kartı",
  MULTI_STAMP: "Çoklu damga",
  POINT_CARD: "Puan kartı",
  CASHBACK_CARD: "Cashback kartı",
  DISCOUNT_CARD: "İndirim kartı",
  EVENT_CARD: "Etkinlik kartı",
  MEMBERSHIP_CARD: "Üyelik kartı",
  STAFF_CARD: "Personel kartı",
};

export type ProgramCard = {
  id: string;
  type: string;
  name: string;
  isPrimary: boolean;
  branchId?: string | null;
  branchName?: string | null;
  tiers: { threshold: number; rewardLabel: string }[];
  config?: { earnPercent?: number };
};

export type ProgramQuota = {
  planCode: string;
  planLabel: string;
  priceTry: number;
  maxPrograms: number;
  usedPrograms: number;
  remainingPrograms: number;
  canCreate: boolean;
  allowedTypes: string[];
  byType: Record<
    string,
    { used: number; max: number; canCreate: boolean }
  >;
  typeCatalog?: ProgramTypeCatalogEntry[];
};

export function programTypeLabel(type: string) {
  return TYPE_LABELS[type] ?? type;
}

function cardSummary(card: ProgramCard): string {
  const tier = card.tiers[0];
  if (card.type === "CASHBACK_CARD") {
    const pct = card.config?.earnPercent;
    return pct != null ? `%${pct} cashback` : "Harcama tutarına göre cashback";
  }
  if (!tier) return programTypeLabel(card.type);
  if (card.type === "STAMP_CARD" || card.type === "MULTI_STAMP") {
    return `${tier.threshold} damga · ${tier.rewardLabel}`;
  }
  if (card.type === "POINT_CARD") {
    return tier.rewardLabel !== "Ödül" ? tier.rewardLabel : "Harcanabilir puan";
  }
  return tier.rewardLabel;
}

/** Kart türü simgesi ve rengi — galeride türü bir bakışta ayırt etmek için */
const TYPE_STYLE: Record<string, { glyph: string; bg: string; fg: string }> = {
  STAMP_CARD: { glyph: "◉", bg: "#eef2ff", fg: "#ef233c" },
  MULTI_STAMP: { glyph: "◎", bg: "#eef2ff", fg: "#4338ca" },
  POINT_CARD: { glyph: "P", bg: "#fef3c7", fg: "#b45309" },
  CASHBACK_CARD: { glyph: "₺", bg: "#dcfce7", fg: "#15803d" },
  DISCOUNT_CARD: { glyph: "%", bg: "#fce7f3", fg: "#be185d" },
  EVENT_CARD: { glyph: "★", bg: "#e0f2fe", fg: "#0369a1" },
  MEMBERSHIP_CARD: { glyph: "◆", bg: "#f3e8ff", fg: "#7e22ce" },
  STAFF_CARD: { glyph: "S", bg: "#f1f5f9", fg: "#334155" },
};

export function TypeGlyph({ type, size = 36 }: { type: string; size?: number }) {
  const st = TYPE_STYLE[type] ?? { glyph: "•", bg: "#f1f5f9", fg: "#334155" };
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-lg font-semibold"
      style={{ width: size, height: size, background: st.bg, color: st.fg, fontSize: size * 0.42 }}
    >
      {st.glyph}
    </span>
  );
}

function CardTile({
  card,
  selected,
  onSelect,
}: {
  card: ProgramCard;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
        selected
          ? "border-[var(--brand)]/40 bg-[var(--panel)] shadow-[var(--shadow-md)] ring-1 ring-[var(--brand)]/20"
          : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-sm)]"
      }`}
    >
      <TypeGlyph type={card.type} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[0.875rem] font-semibold text-[var(--ink)]">{card.name}</span>
          {card.isPrimary ? (
            <span className="shrink-0 rounded-full bg-[var(--success-soft)] px-1.5 py-px text-[10px] font-semibold text-[var(--success)]">
              Ana
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--muted)]">{cardSummary(card)}</span>
        {card.branchName ? (
          <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--muted)]">{card.branchName}</span>
        ) : null}
      </span>
    </button>
  );
}

export function CreateCardPicker({
  typeCatalog,
  creating,
  onCreate,
  onClose,
  multiBranch,
  branches,
  defaultBranchId,
}: {
  typeCatalog: ProgramTypeCatalogEntry[];
  creating: boolean;
  onCreate: (type: string, branchId?: string) => void;
  onClose: () => void;
  multiBranch?: boolean;
  branches?: { id: string; name: string }[];
  defaultBranchId?: string | null;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");

  return (
    <div className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ink)]">Hangi kartı ekleyelim?</p>
        <button type="button" className={btnGhost()} onClick={onClose}>
          Vazgeç
        </button>
      </div>
      {multiBranch ? (
        <Field label="Şube" hint="Bu kart hangi şubede geçerli olsun?">
          <select
            className={inputClassName()}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required
          >
            <option value="">Şube seçin…</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <ul className="space-y-2">
        {typeCatalog.map((entry) => {
          const disabled = creating || !entry.canCreate;
          return (
            <li key={entry.type}>
              {entry.canCreate ? (
                <button
                  type="button"
                  disabled={disabled}
                  className="flex w-full flex-col rounded-md border border-[var(--line)] px-3 py-2.5 text-left transition hover:border-[var(--accent)]/40 hover:bg-[var(--wash)]/40 disabled:opacity-60"
                  onClick={() =>
                    onCreate(
                      entry.type,
                      multiBranch ? branchId || undefined : undefined,
                    )
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{entry.label}</span>
                    {entry.max > 0 ? (
                      <span className="text-[10px] text-[var(--muted)]">
                        {entry.used}/{entry.max}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 text-xs text-[var(--muted)]">
                    {entry.hint}
                  </span>
                </button>
              ) : (
                <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--wash)]/30 px-3 py-2.5 opacity-80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--muted)]">
                      {entry.label}
                    </span>
                    {entry.locked && entry.upgradePlanLabel ? (
                      <Badge tone="warning">{entry.upgradePlanLabel}</Badge>
                    ) : entry.quotaFull ? (
                      <Badge tone="neutral">Limit doldu</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {entry.hint}
                  </p>
                  {entry.lockedReason ? (
                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      {entry.lockedReason}
                    </p>
                  ) : null}
                  {entry.locked ? (
                    <Link
                      href="/billing"
                      className="mt-2 inline-flex text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      Paketi yükselt →
                    </Link>
                  ) : entry.quotaFull ? (
                    <Link
                      href="/billing"
                      className="mt-2 inline-flex text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      Daha fazla kart için yükselt →
                    </Link>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CardGallerySidebar({
  quota,
  programs,
  selectedId,
  onSelect,
  onCreate,
  creating,
  multiBranch,
  branches,
  defaultBranchId,
}: {
  quota: ProgramQuota;
  programs: ProgramCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (type: string, branchId?: string) => void;
  creating: boolean;
  multiBranch?: boolean;
  branches?: { id: string; name: string }[];
  defaultBranchId?: string | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const typeCatalog = quota.typeCatalog ?? [];
  const hasCreatable = typeCatalog.some((t) => t.canCreate);
  const usedPct = Math.min(
    100,
    (quota.usedPrograms / Math.max(quota.maxPrograms, 1)) * 100,
  );

  function handleCreate(type: string, branchId?: string) {
    onCreate(type, branchId);
    setShowCreate(false);
  }

  return (
    <div className="space-y-4">
      <SoftBox className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {quota.planLabel} paketi
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
            {quota.usedPrograms} / {quota.maxPrograms} kart
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        {quota.remainingPrograms <= 0 && (
          <p className="text-xs text-[var(--muted)]">
            Kart limitiniz doldu.{" "}
            <Link href="/billing" className="text-[var(--accent)] hover:underline">
              Paket yükseltin
            </Link>
            .
          </p>
        )}
        {!hasCreatable && typeCatalog.some((t) => t.locked) ? (
          <p className="text-xs text-[var(--muted)]">
            Cashback ve diğer premium kartlar için paket yükseltin.
          </p>
        ) : null}
      </SoftBox>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Kartlarım ({programs.length})
          </p>
        </div>

        {programs.length === 0 ? (
          <SoftBox>
            <p className="text-sm text-[var(--muted)]">
              Henüz kart yok. İlk kartınızı ekleyerek başlayın.
            </p>
          </SoftBox>
        ) : (
          <ul className="space-y-2">
            {programs.map((p) => (
              <li key={p.id}>
                <CardTile
                  card={p}
                  selected={selectedId === p.id}
                  onSelect={() => onSelect(p.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!showCreate && typeCatalog.length > 0 && (
        <button
          type="button"
          className={`${btnPrimary()} w-full`}
          disabled={creating}
          onClick={() => setShowCreate(true)}
        >
          {creating ? "Oluşturuluyor…" : "+ Yeni kart ekle"}
        </button>
      )}

      {showCreate && typeCatalog.length > 0 && (
        <CreateCardPicker
          typeCatalog={typeCatalog}
          creating={creating}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
          multiBranch={multiBranch}
          branches={branches}
          defaultBranchId={defaultBranchId}
        />
      )}
    </div>
  );
}

/** Mobil: üstte sabit kart şeridi */
export function CardGalleryStrip({
  programs,
  selectedId,
  onSelect,
  onAddClick,
  canAdd,
  creating,
}: {
  programs: ProgramCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddClick?: () => void;
  canAdd?: boolean;
  creating?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 border-b border-[var(--line)] bg-[var(--canvas)] px-1 pb-3 pt-1 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {programs.map((p) => {
          const selected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`shrink-0 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--line)] bg-[var(--surface)]"
              }`}
            >
              <p className="max-w-[120px] truncate text-sm font-medium">{p.name}</p>
              <p className="mt-0.5 max-w-[120px] truncate text-[10px] text-[var(--muted)]">
                {p.isPrimary ? "Ana kart" : programTypeLabel(p.type)}
              </p>
            </button>
          );
        })}
        {canAdd && onAddClick && (
          <button
            type="button"
            disabled={creating}
            onClick={onAddClick}
            className="shrink-0 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] px-3 py-2 text-sm text-[var(--accent)]"
          >
            {creating ? "…" : "+ Yeni"}
          </button>
        )}
      </div>
    </div>
  );
}
