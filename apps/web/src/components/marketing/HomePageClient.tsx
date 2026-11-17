"use client";

import { useLocale, useTranslations } from "next-intl";
import { HeroSection } from "./home/HeroSection";
import { ProductSection } from "./home/ProductSection";
import { FeatureBento } from "./home/FeatureBento";
import { UseCasesTeaser } from "./home/UseCasesTeaser";
import { PricingCards } from "./home/PricingCards";
import { FAQSection } from "./home/FAQSection";
import { CtaBand } from "./home/CtaBand";
import type { DisplayPlan } from "@/lib/plans";

export function HomePageClient({ plans }: { plans: DisplayPlan[] }) {
  const t = useTranslations("home");
  const s = useTranslations("sections");
  const features = useTranslations("featuresPage");
  const pricing = useTranslations("pricingPage");
  const faq = useTranslations("faq");
  const nav = useTranslations("nav");
  const useCases = useTranslations("useCasesPage");
  const useCasesItems = useCases.raw("items") as { title: string; body: string }[];
  const locale = useLocale();
  const teaserEyebrow =
    locale === "tr" ? "Gerçek kullanım" : locale === "ru" ? "Реальные сценарии" : "Real use";
  const teaserLink =
    locale === "tr" ? "Tüm senaryolar" : locale === "ru" ? "Все сценарии" : "All use cases";

  const productPoints = s.raw("productPoints") as string[];
  const featureItems = features.raw("items") as { title: string; body: string }[];
  const faqItems = faq.raw("items") as { q: string; a: string }[];

  return (
    <main className="page-enter">
      <HeroSection
        headline={t("headline")}
        sub={t("sub")}
        ctaPrimary={t("ctaPrimary")}
        ctaSecondary={t("ctaSecondary")}
      />

      <ProductSection
        title={s("productTitle")}
        body={s("productBody")}
        points={productPoints}
      />

      <UseCasesTeaser
        eyebrow={teaserEyebrow}
        title={nav("useCases")}
        linkLabel={teaserLink}
        items={useCasesItems}
      />

      <FeatureBento
        title={s("featuresTitle")}
        intro={s("featuresIntro")}
        items={featureItems}
        featuresPageTitle={features("title")}
      />

      <PricingCards
        title={s("plansTitle")}
        intro={s("plansIntro")}
        plans={plans}
        pricingPageTitle={pricing("title")}
      />

      <FAQSection title={s("faqTitle")} items={faqItems} />

    </main>
  );
}
