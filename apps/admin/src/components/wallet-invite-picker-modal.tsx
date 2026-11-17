"use client";

import { useEffect, useMemo, useState } from "react";
import { btnGhost, btnPrimary } from "./ui";

const WALLET_TYPES = new Set([
  "STAMP_CARD",
  "MULTI_STAMP",
  "POINT_CARD",
  "CASHBACK_CARD",
  "DISCOUNT_CARD",
  "EVENT_CARD",
]);

export type WalletInviteProgram = {
  programId: string;
  name: string;
  type: string;
  typeLabel: string;
  summary: string;
};

type Props = {
  programs: WalletInviteProgram[];
  phoneLabel?: string;
  title?: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: (programIds: string[]) => void | Promise<void>;
  onClose: () => void;
};

export function filterWalletPrograms(
  programs: { id: string; type: string; name: string; isPrimary?: boolean; tiers?: { threshold: number; rewardLabel: string }[] }[],
): WalletInviteProgram[] {
  return programs
    .filter((p) => WALLET_TYPES.has(p.type))
    .map((p) => {
      const tier = p.tiers?.[0];
      let summary = p.type;
      if (tier) {
        if (p.type === "STAMP_CARD" || p.type === "MULTI_STAMP") {
          summary = `${tier.threshold} damga · ${tier.rewardLabel}`;
        } else {
          summary = tier.rewardLabel;
        }
      }
      const labels: Record<string, string> = {
        STAMP_CARD: "Damga kartı",
        MULTI_STAMP: "Çoklu damga",
        POINT_CARD: "Puan kartı",
        CASHBACK_CARD: "Cashback kartı",
        DISCOUNT_CARD: "İndirim kartı",
        EVENT_CARD: "Etkinlik kartı",
      };
      return {
        programId: p.id,
        name: p.name,
        type: p.type,
        typeLabel: labels[p.type] ?? p.type,
        summary,
      };
    });
}

export function WalletInvitePickerModal({
  programs,
  phoneLabel,
  title = "Hangi kartlar eklensin?",
  confirmLabel = "Davet linki oluştur",
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelected(new Set(programs.map((p) => p.programId)));
  }, [programs]);

  const allSelected = useMemo(
    () => programs.length > 0 && programs.every((p) => selected.has(p.programId)),
    [programs, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set([programs[0]!.programId]));
    } else {
      setSelected(new Set(programs.map((p) => p.programId)));
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        {phoneLabel ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{phoneLabel}</p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--muted)]">
          Müşteri tek davet linkinde seçtiğiniz kartları görecek ve Apple
          Wallet’a ekleyebilecek.
        </p>

        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm font-medium">Tümünü seç</span>
          </label>

          {programs.map((p) => (
            <label
              key={p.programId}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-2.5 transition hover:bg-[var(--surface)]"
            >
              <input
                type="checkbox"
                checked={selected.has(p.programId)}
                onChange={() => toggle(p.programId)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--ink)]">
                  {p.name}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  {p.typeLabel} · {p.summary}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost()} onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className={btnPrimary()}
            disabled={busy || selected.size === 0}
            onClick={() => void onConfirm([...selected])}
          >
            {busy ? "Hazırlanıyor…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
