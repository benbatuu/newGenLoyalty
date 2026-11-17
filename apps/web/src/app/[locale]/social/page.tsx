import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { SocialClaimForm } from "@/components/marketing/SocialClaimForm";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/social",
  });
}

export default async function SocialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("socialPage");

  return (
    <PageShell title={t("title")} intro={t("intro")} eyebrow="Social" narrow>
      <SocialClaimForm />
    </PageShell>
  );
}
