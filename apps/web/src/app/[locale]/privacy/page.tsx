import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/marketing/legal/LegalDocument";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildPageMetadata({
    locale,
    title: t("privacyTitle"),
    description: t("lastUpdated"),
    pathname: "/privacy",
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const paragraphs = t.raw("privacyBody") as string[];

  return (
    <LegalDocument
      eyebrow="Privacy"
      title={t("privacyTitle")}
      updated={t("lastUpdated")}
      paragraphs={paragraphs}
    />
  );
}
