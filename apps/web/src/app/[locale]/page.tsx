import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { HomePageClient } from "@/components/marketing/HomePageClient";
import { JsonLd, faqJsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    pathname: "/",
    keywords: t("keywords"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const faq = await getTranslations({ locale, namespace: "faq" });
  const items = faq.raw("items") as { q: string; a: string }[];

  return (
    <>
      <JsonLd data={faqJsonLd(items)} />
      <HomePageClient />
    </>
  );
}
