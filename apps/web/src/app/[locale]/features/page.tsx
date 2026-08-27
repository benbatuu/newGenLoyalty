import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoCta } from "@/components/marketing/DemoCta";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "featuresPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/features",
  });
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("featuresPage");
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      wide
      heroImage="https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("title")}
    >
      <div className="mb-10">
        <Badge>MVP</Badge>
      </div>
      <ul className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={item.title}
            className="bg-[var(--bg)] p-8 transition-colors duration-500 hover:bg-[var(--panel)] sm:p-9"
          >
            <p className="section-label text-[var(--muted)]">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-5 font-display text-[1.45rem] font-medium tracking-tight">
              {item.title}
            </h2>
            <p className="mt-3 text-[0.95rem] font-light leading-[1.7] text-[var(--muted)]">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-14 flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/pricing">
            <span className="relative z-10 inline-flex items-center gap-2">
              {locale === "tr" ? "Paketleri gör" : "See plans"}
              <span className="btn-arrow" aria-hidden>
                →
              </span>
            </span>
          </Link>
        </Button>
        <DemoCta
          variant="outline"
          label={locale === "tr" ? "Demo iste" : "Request a demo"}
        />
      </div>
    </PageShell>
  );
}
