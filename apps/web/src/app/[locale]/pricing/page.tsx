import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { PricingCompareSection } from "@/components/marketing/PricingCompareSection";
import { PricingFeatureMatrix } from "@/components/marketing/PricingFeatureMatrix";
import { PricingCards } from "@/components/marketing/home/PricingCards";
import {
  InnerChecklistPanel,
  InnerFaqAccordion,
  InnerMetricStrip,
  InnerPageSection,
  InnerSectionIntro,
} from "@/components/marketing/inner";
import { CtaBand } from "@/components/marketing/home/CtaBand";
import { buildPageMetadata } from "@/lib/seo";
import { fetchPublicPlans, resolveDisplayPlans } from "@/lib/plans";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/pricing",
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricingPage");
  const sections = await getTranslations("sections");
  const staticPlans = t.raw("plans") as {
    id: string;
    name: string;
    price: string;
    period: string;
    badge: string;
    note: string;
    includes: string[];
  }[];
  const compareIn = t.raw("compareIn") as string[];
  const compareOut = t.raw("compareOut") as string[];
  const metrics = t.raw("metrics") as { value: string; label: string; hint?: string }[];
  const billingBullets = t.raw("billingBullets") as string[];
  const faq = t.raw("faq") as { q: string; a: string }[];
  const featureMatrix = t.raw("featureMatrix") as {
    label: string;
    cells: (boolean | string)[];
  }[];
  const dbPlans = await fetchPublicPlans();
  const plans = resolveDisplayPlans(locale, dbPlans, staticPlans, t("buyCta"));

  return (
    <>
      <PageShell
        title={t("title")}
        intro={t("intro")}
        eyebrow={t("eyebrow")}
        wide
      >
        <PricingCards
          title={t("title")}
          intro={t("intro")}
          plans={plans}
          pricingPageTitle={t("title")}
          hideHeader
          hidePricingPageLink
          embedded
        />

        <InnerPageSection bordered={false}>
          <InnerMetricStrip items={metrics} />
        </InnerPageSection>

        <PricingFeatureMatrix
          title={t("featureMatrixTitle")}
          featureLabel={t("featureMatrixLabel")}
          plans={plans}
          rows={featureMatrix}
        />

        <PricingCompareSection
          title={t("compareTitle")}
          includedLabel={locale === "tr" ? "Dahil" : "Included"}
          excludedLabel={locale === "tr" ? "Şimdilik yok" : "Not yet"}
          compareIn={compareIn}
          compareOut={compareOut}
        />

        <InnerPageSection>
          <InnerChecklistPanel
            title={t("billingTitle")}
            description={t("billingIntro")}
            items={billingBullets}
          />
        </InnerPageSection>

        <InnerPageSection>
          <InnerSectionIntro title={t("faqTitle")} />
          <InnerFaqAccordion items={faq} />
        </InnerPageSection>
      </PageShell>
      <CtaBand
        title={sections("ctaBandTitle")}
        body={sections("ctaBandBody")}
        button={sections("ctaBandButton")}
      />
    </>
  );
}
