"use client";

import { type RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisibleFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute("disabled")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  // Prefer getClientRects — offsetParent is null for position:fixed
  return el.getClientRects().length > 0;
}

/** Basic focus trap + restore for dialogs/menus. Retries mount until ref is ready. */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let removeKey: (() => void) | undefined;
    let tries = 0;
    let raf = 0;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const attach = () => {
      if (cancelled) return;
      const root = containerRef.current;
      if (!root) {
        if (tries++ < 20) {
          raf = requestAnimationFrame(attach);
        }
        return;
      }

      const nodes = () =>
        Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          isVisibleFocusable,
        );

      nodes()[0]?.focus();

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const list = nodes();
        if (list.length === 0) return;
        const start = list[0];
        const end = list[list.length - 1];
        if (e.shiftKey && document.activeElement === start) {
          e.preventDefault();
          end.focus();
        } else if (!e.shiftKey && document.activeElement === end) {
          e.preventDefault();
          start.focus();
        }
      };

      root.addEventListener("keydown", onKeyDown);
      removeKey = () => root.removeEventListener("keydown", onKeyDown);
    };

    attach();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      removeKey?.();
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}
