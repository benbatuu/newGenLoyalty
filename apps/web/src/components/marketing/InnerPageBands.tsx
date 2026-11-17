"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DemoCta } from "@/components/marketing/DemoCta";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";
import { CtaLabel } from "@/components/marketing/home/shared";

export function UseCaseFlowBand({
  title,
  body,
  flowLabel,
  steps,
  howLabel,
}: {
  title: string;
  body: string;
  flowLabel: string;
  steps: string[];
  howLabel: string;
}) {
  return (
    <MarketingSurface className="grid gap-8 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#ff5a6e]">
          {flowLabel}
        </p>
        <h2 className="mt-3 font-display text-2xl tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {body}
        </p>
        <Button asChild className="mt-6">
          <Link href="/how">
            <CtaLabel>{howLabel}</CtaLabel>
          </Link>
        </Button>
      </div>
      <div className="flex flex-col justify-center gap-3 border-t border-foreground/[0.08] pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
        {steps.map((line) => (
          <p
            key={line}
            className="border-b border-foreground/[0.08] pb-3 text-sm text-foreground/90 last:border-0"
          >
            {line}
          </p>
        ))}
      </div>
    </MarketingSurface>
  );
}

export function SectorContactBand({
  title,
  body,
  demoLabel,
}: {
  title: string;
  body: string;
  demoLabel: string;
}) {
  return (
    <MarketingSurface className="mt-14 sm:mt-16">
      <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {body}
      </p>
      <DemoCta className="mt-6" label={demoLabel} />
    </MarketingSurface>
  );
}
