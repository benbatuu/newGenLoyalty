import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { PortalLookupForm } from "@/components/marketing/PortalLookupForm";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portalPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/portal",
  });
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portalPage");

  return (
    <PageShell title={t("title")} intro={t("intro")} eyebrow="Portal" narrow>
      <PortalLookupForm />
    </PageShell>
  );
}
