"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { isTopOverlay, popOverlay, pushOverlay } from "../lib/overlay-stack";

/** Sağdan kayan detay paneli. Esc ile kapanır, arka plan tıklanınca kapanır. */
export function SideDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Kapatma fonksiyonu her render'da yeniden oluşabilir; efekt yalnızca open ile çalışsın
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

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

  return (
    <div className="fixed inset-0 z-50">
      <div className="side-drawer-backdrop absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="side-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-[680px] flex-col border-l border-[var(--line)] bg-[var(--background)] shadow-[-24px_0_60px_rgba(0,0,0,0.5)] outline-none"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            aria-label="Kapat"
            title="Kapat (Esc)"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
