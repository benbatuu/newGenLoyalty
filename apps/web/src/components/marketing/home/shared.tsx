"use client";

import type { Transition } from "framer-motion";

export const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } satisfies Transition,
};

export function CtaLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {children}
      <span className="btn-arrow" aria-hidden>
        →
      </span>
    </span>
  );
}

export type ProofItem = { stat: string; label: string; hint: string };
export type FeatureItem = { title: string; body: string };
export type PlanItem = {
  id: string;
  name: string;
  price: string;
  period: string;
  badge: string;
  note: string;
  includes: string[];
  cta: string;
};
export type FaqItem = { q: string; a: string };
