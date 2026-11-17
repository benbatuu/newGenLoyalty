import type { ReactNode } from "react";

/** Bordered dark panel that holds the contact form. */
export function ContactFormPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-10">{children}</div>
  );
}
