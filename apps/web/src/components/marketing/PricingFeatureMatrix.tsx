"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisplayPlan } from "@/lib/plans";

export type PricingFeatureRow = {
  label: string;
  cells: (boolean | string)[];
};

export function PricingFeatureMatrix({
  title,
  plans,
  rows,
  featureLabel,
}: {
  title: string;
  plans: DisplayPlan[];
  rows: PricingFeatureRow[];
  featureLabel: string;
}) {
  return (
    <section className="mt-14 sm:mt-16">
      <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] tracking-tight text-foreground">
        {title}
      </h2>

      {/* No overflow wrapper on desktop so sticky thead sticks to viewport */}
      <div className="attio-surface mt-8 overflow-x-auto md:overflow-visible p-0">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th
                className="sticky top-14 z-20 bg-background/95 px-5 py-4 font-medium text-muted-foreground backdrop-blur-md sm:top-16 sm:px-6"
              >
                {featureLabel}
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className={cn(
                    "sticky top-14 z-20 min-w-[7.5rem] bg-background/95 px-3 py-4 text-center font-display text-base tracking-tight text-foreground backdrop-blur-md sm:top-16 sm:px-4",
                    plan.featured && "bg-primary/[0.06]",
                  )}
                >
                  <span className="block">{plan.name}</span>
                  {plan.featured ? (
                    <span className="mt-1 block font-sans text-[0.65rem] font-medium uppercase tracking-wide text-[#ff5a6e]">
                      {plan.badge}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-foreground/[0.06] last:border-b-0"
              >
                <td className="px-5 py-3.5 font-medium text-foreground sm:px-6">
                  {row.label}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.label}-${plans[i]?.id ?? i}`}
                    className={cn(
                      "px-3 py-3.5 text-center sm:px-4",
                      plans[i]?.featured && "bg-primary/[0.03]",
                    )}
                  >
                    <MatrixCell value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MatrixCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <Check className="mx-auto h-4 w-4 text-[#ff5a6e]" aria-label="Included" />
    );
  }
  if (value === false) {
    return (
      <Minus
        className="mx-auto h-4 w-4 text-muted-foreground/45"
        aria-label="Not included"
      />
    );
  }
  return (
    <span className="text-xs font-medium text-muted-foreground">{value}</span>
  );
}
