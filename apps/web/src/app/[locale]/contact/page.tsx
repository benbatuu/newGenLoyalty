import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/ContactForm";
import { PageShell } from "@/components/PageShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/contact",
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contactPage");

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      wide
      heroImage="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("title")}
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <ContactForm />
        <Card className="h-fit bg-[var(--panel)]">
          <CardHeader>
            <CardTitle className="text-2xl">{t("asideTitle")}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {t("asideBody")}
            </CardDescription>
            <div className="mt-8 space-y-4 border-t border-[var(--line)] pt-6 text-sm font-light text-[var(--muted)]">
              <p>
                <span className="block text-[0.65rem] tracking-[0.14em] uppercase text-[var(--brass)]">
                  GEO
                </span>
                Türkiye · İstanbul (primary)
              </p>
              <p>
                <span className="block text-[0.65rem] tracking-[0.14em] uppercase text-[var(--brass)]">
                  Languages
                </span>
                TR / EN
              </p>
              <p>
                <span className="block text-[0.65rem] tracking-[0.14em] uppercase text-[var(--brass)]">
                  Focus
                </span>
                {locale === "tr"
                  ? "Bağımsız kafe & butik tezgâh"
                  : "Independent cafés & boutique counters"}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    </PageShell>
  );
}
