import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export default async function NotFoundPage() {
  const t = await getTranslations("notFound");

  return (
    <PageShell title={t("title")} intro={t("intro")} narrow>
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild size="lg">
          <Link href="/">
            <span className="relative z-10">{t("home")}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/contact">
            <span className="relative z-10">{t("contact")}</span>
          </Link>
        </Button>
      </div>
      <p className="mt-12 font-display text-[clamp(5rem,18vw,11rem)] font-light leading-none tracking-[-0.06em] text-[var(--ink)]/10">
        404
      </p>
    </PageShell>
  );
}
