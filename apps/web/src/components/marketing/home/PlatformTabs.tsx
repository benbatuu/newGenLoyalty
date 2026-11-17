"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  CounterMockup,
  ReportsMockup,
  SmsFlowMockup,
  WalletPassMockup,
} from "./ProductMockups";
import { AttioPlatformScroll, type AttioPlatformItem } from "./AttioPlatformScroll";
import { CtaLabel } from "./shared";

type Step = { n: string; title: string; body: string };

const mockByIndex = [CounterMockup, SmsFlowMockup, WalletPassMockup, ReportsMockup];

export function PlatformTabs({
  title,
  intro,
  steps,
  howPageTitle,
}: {
  title: string;
  intro: string;
  steps: Step[];
  howPageTitle: string;
}) {
  const t = useTranslations("sections");

  const items: AttioPlatformItem[] = steps.map((step, i) => {
    const Mock = mockByIndex[i] ?? CounterMockup;
    return {
      id: `step-${step.n}`,
      navLabel: step.title,
      headline: step.title,
      body: step.body,
      visual: <Mock />,
    };
  });

  return (
    <AttioPlatformScroll
      variant="split-sticky"
      previewMode="mockup"
      eyebrow={t("statsGridTitle")}
      title={title}
      intro={intro}
      navAriaLabel={t("howTitle")}
      items={items}
      panelFooter={
        <Button asChild variant="outline">
          <Link href="/how">
            <CtaLabel>{howPageTitle}</CtaLabel>
          </Link>
        </Button>
      }
    />
  );
}
