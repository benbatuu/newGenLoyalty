"use client";

import { useEffect } from "react";

/**
 * Smooth wheel scrolling for mouse users only. Touch devices already scroll
 * smoothly, so Lenis (and its JS) is loaded only when a fine pointer exists.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.2 });
      document.documentElement.classList.add("lenis", "lenis-smooth");
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, []);

  return <>{children}</>;
}
