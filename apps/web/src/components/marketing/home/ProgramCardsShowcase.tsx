"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getProgramCardTypes, type ProgramCardId } from "@/lib/program-types";
import { AppleWalletPass } from "./AppleWalletPass";
import { AttioPlatformScroll } from "./AttioPlatformScroll";
import { CtaLabel } from "./shared";

export function ProgramCardsShowcase({
  hideHeader = false,
  embedded = false,
}: {
  hideHeader?: boolean;
  embedded?: boolean;
} = {}) {
  const locale = useLocale();
  const isTr = locale === "tr";
  const cards = getProgramCardTypes(locale);

  const items = cards.map((card) => ({
    id: card.id,
    navLabel: card.title,
    headline: card.headline,
    body: card.howItWorks,
    tags: card.useCases,
    visual: (
      <AppleWalletPass
        type={card.id as ProgramCardId}
        locale={locale}
        compact
        className="w-full max-w-[200px] sm:max-w-[248px]"
      />
    ),
  }));

  const t = useTranslations("featuresPage")
  return (
    <AttioPlatformScroll
      variant="split-sticky"
      previewMode="pass"
      hideHeader={hideHeader}
      eyebrow={t("label")}
      title={t("headTitle")}
      intro={t("headSubtitle")}
      navAriaLabel={t("label")}
      tagsLabel={t("bestFor")}
      items={items}
      panelFooter={
        embedded ? (
          <>
            <Button asChild>
              <Link href="/pricing">
                <CtaLabel>{t("seePlans")}</CtaLabel>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">
                <CtaLabel>{isTr ? "Satın al" : "Subscribe"}</CtaLabel>
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link href="/programs">
                <CtaLabel>{t("allProgramTypes")}</CtaLabel>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">
                <CtaLabel>{t("seePlans")}</CtaLabel>
              </Link>
            </Button>
          </>
        )
      }
    />
  );
}
