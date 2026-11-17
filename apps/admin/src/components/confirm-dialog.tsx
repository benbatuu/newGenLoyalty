"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { btnGhost, btnPrimary } from "./ui";
import { isTopOverlay, popOverlay, pushOverlay } from "../lib/overlay-stack";

/** Ortada açılan onay penceresi. Esc ve arka plan tıklaması "Vazgeç" gibi davranır. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelToRef = useRef(onCancel);
  cancelToRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const id = pushOverlay();
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && isTopOverlay(id)) cancelToRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      popOverlay(id);
    };
  }, [open, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center px-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => !busy && onCancel()}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        <h2 id="confirm-dialog-title" className="font-display text-[1.05rem] tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        <div className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--muted)]">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className={btnGhost()} disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? `${btnPrimary()} bg-[var(--danger)] hover:bg-[var(--danger)]` : btnPrimary()}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Lütfen bekleyin…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
