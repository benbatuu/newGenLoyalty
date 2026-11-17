"use client";

import { useEffect } from "react";

/**
 * Kaydırıcıların dolu kısmını (--fill) değere göre günceller.
 * Tek bir dinleyici tüm range girdilerini kapsar; sayfa geçişlerinde de çalışır.
 */
export function RangeFill() {
  useEffect(() => {
    function apply(el: HTMLInputElement) {
      const min = Number(el.min || 0);
      const max = Number(el.max || 100);
      const val = Number(el.value);
      const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
      el.style.setProperty("--fill", `${pct}%`);
    }
    function applyAll(root: ParentNode = document) {
      root.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(apply);
    }
    function onInput(e: Event) {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.type === "range") apply(el);
    }
    applyAll();
    document.addEventListener("input", onInput);
    const mo = new MutationObserver(() => applyAll());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
    return () => {
      document.removeEventListener("input", onInput);
      mo.disconnect();
    };
  }, []);
  return null;
}
