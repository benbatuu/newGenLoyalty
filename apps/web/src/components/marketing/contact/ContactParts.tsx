import type { ReactNode } from "react";

/** Mono red eyebrow used above every section title across the site. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[#EF233C]">
      {children}
    </p>
  );
}

/** Ruled row with a label and value, used for contact facts. */
export function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-white/[0.08] py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <dt className="text-xs uppercase tracking-[0.14em] text-[#DFE5EB]/50">{label}</dt>
      <dd className="text-[0.95rem] leading-[1.7] text-[#DFE5EB]/85">{value}</dd>
    </div>
  );
}
