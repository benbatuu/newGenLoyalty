"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { isTopOverlay, popOverlay, pushOverlay } from "../lib/overlay-stack";

/** Ortada açılan geniş pencere. Esc ve arka plan tıklaması kapatır; içerik kaydırılabilir. */
export function Dialog({
  open,
  title,
  description,
  onClose,
  size = "lg",
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = pushOverlay();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopOverlay(id)) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      popOverlay(id);
    };
  }, [open]);

  if (!open) return null;

  const width = size === "xl" ? "max-w-6xl" : size === "lg" ? "max-w-4xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-8">
      <button type="button" aria-label="Kapat" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`side-drawer-backdrop relative flex max-h-[85vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-[1.05rem] tracking-tight text-[var(--ink)]">{title}</h2>
            {description ? <p className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            title="Kapat (Esc)"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
