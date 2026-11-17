"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DemoCta } from "@/components/marketing/DemoCta";
import { CtaLabel } from "@/components/marketing/home/shared";

export function InnerPageActions({
  pricingLabel,
  demoLabel,
  extra,
}: {
  pricingLabel: string;
  demoLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mt-12 flex flex-wrap items-center gap-3">
      <Button asChild>
        <Link href="/pricing">
          <CtaLabel>{pricingLabel}</CtaLabel>
        </Link>
      </Button>
      <DemoCta variant="outline" label={demoLabel} />
      {extra}
    </div>
  );
}
