"use client";

import { Check, X } from "lucide-react";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";

export function PricingCompareSection({
  title,
  includedLabel,
  excludedLabel,
  compareIn,
  compareOut,
}: {
  title: string;
  includedLabel: string;
  excludedLabel: string;
  compareIn: string[];
  compareOut: string[];
}) {
  return (
    <section className="mt-14 sm:mt-16">
      <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <MarketingSurface>
          <h3 className="font-display text-lg tracking-tight text-foreground">
            {includedLabel}
          </h3>
          <ul className="mt-5 space-y-3">
            {compareIn.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a6e]" />
                {line}
              </li>
            ))}
          </ul>
        </MarketingSurface>
        <MarketingSurface>
          <h3 className="font-display text-lg tracking-tight text-foreground">
            {excludedLabel}
          </h3>
          <ul className="mt-5 space-y-3">
            {compareOut.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </MarketingSurface>
      </div>
    </section>
  );
}
