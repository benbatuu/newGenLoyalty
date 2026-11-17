import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { NotFoundContent } from "@/components/marketing/NotFoundContent";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Unknown paths under /[locale]/* (e.g. /en/termss).
 * Renders the themed 404 inside the locale layout (fonts + CSS).
 * Calling notFound() would fall back to the root error shell without styles.
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notFound");

  return (
    <PageShell title={t("title")} intro={t("intro")} eyebrow="404" wide align="center">
      <NotFoundContent homeLabel={t("home")} contactLabel={t("contact")} />
    </PageShell>
  );
}
