import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { NotFoundContent } from "@/components/marketing/NotFoundContent";

/** Used when notFound() is called from within the [locale] tree (e.g. invalid locale). */
export default async function NotFoundPage() {
  const t = await getTranslations("notFound");

  return (
    <PageShell title={t("title")} intro={t("intro")} eyebrow="404" wide align="center">
      <NotFoundContent homeLabel={t("home")} contactLabel={t("contact")} />
    </PageShell>
  );
}
