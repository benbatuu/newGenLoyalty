import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { UseCaseFlowBand } from "@/components/marketing/InnerPageBands";
import { UseCasesSection } from "@/components/marketing/home/UseCasesSection";
import {
  InnerChecklistPanel,
  InnerFaqAccordion,
  InnerPageSection,
  InnerQuoteBand,
  InnerRelatedPages,
  InnerSectionIntro,
  InnerTimeline,
} from "@/components/marketing/inner";
import { CtaBand } from "@/components/marketing/home/CtaBand";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "useCasesPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/use-cases",
  });
}

export default async function UseCasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("useCasesPage");
  const sections = await getTranslations("sections");
  const items = t.raw("items") as { title: string; body: string }[];
  const quote = t.raw("quote") as {
    text: string;
    attribution: string;
    role: string;
  };
  const timeline = t.raw("timeline") as { title: string; body: string }[];
  const checklist = t.raw("checklist") as {
    title: string;
    description: string;
    items: string[];
  };
  const faq = t.raw("faq") as { q: string; a: string }[];
  const related = t.raw("related") as {
    href: "/how" | "/features" | "/programs" | "/pricing" | "/sectors" | "/use-cases" | "/contact";
    label: string;
    description: string;
  }[];

  return (
    <>
      <PageShell
        title={t("title")}
        intro={t("intro")}
        eyebrow="Use cases"
        wide
      >
        <UseCasesSection
          title={t("title")}
          intro={t("intro")}
          items={items}
          useCasesPageTitle={t("title")}
          hideHeader
          hideLink
          embedded
        />

        <InnerPageSection bordered={false}>
          <InnerQuoteBand
            quote={quote.text}
            attribution={quote.attribution}
            role={quote.role}
          />
        </InnerPageSection>

        <InnerPageSection>
          <InnerSectionIntro
            eyebrow="Day in the life"
            title={t("timelineTitle")}
            description={t("timelineIntro")}
          />
          <InnerTimeline steps={timeline} />
        </InnerPageSection>

        <InnerPageSection>
          <UseCaseFlowBand
            flowLabel={locale === "tr" ? "Akış" : "Flow"}
            title={
              locale === "tr"
                ? "Tezgâhtan Wallet'a — 30 saniye"
                : "Counter to Wallet — in 30 seconds"
            }
            body={
              locale === "tr"
                ? "Kasiyer telefonu girer, müşteri SMS linkiyle kartını ekler. Sonraki ziyaretlerde sadece damga."
                : "Cashier enters the phone, guest adds the pass via SMS link. Later visits are stamps only."
            }
            steps={
              locale === "tr"
                ? [
                    "Yeni müşteri kaydı",
                    "Davet SMS / mock log",
                    "Pass güncellemesi",
                    "Ödül kullanımı",
                  ]
                : [
                    "New customer enroll",
                    "Invite SMS / mock log",
                    "Pass update",
                    "Reward redeem",
                  ]
            }
            howLabel={locale === "tr" ? "Akışı incele" : "See the flow"}
          />
        </InnerPageSection>

        <InnerPageSection>
          <InnerChecklistPanel
            title={checklist.title}
            description={checklist.description}
            items={checklist.items}
          />
        </InnerPageSection>

        <InnerPageSection>
          <InnerSectionIntro title={t("faqTitle")} />
          <InnerFaqAccordion items={faq} />
        </InnerPageSection>

        <InnerPageSection>
          <InnerSectionIntro title={t("relatedTitle")} />
          <InnerRelatedPages links={related} />
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
