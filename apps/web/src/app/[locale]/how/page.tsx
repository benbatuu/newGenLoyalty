import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoCta } from "@/components/marketing/DemoCta";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/how",
  });
}

export default async function HowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("howPage");
  const steps = t.raw("steps") as { n: string; title: string; body: string }[];

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      wide
      heroImage="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("imageAlt")}
    >
      <ol className="grid gap-6 md:grid-cols-2">
        {steps.map((s) => (
          <li key={s.n}>
            <Card className="h-full">
              <CardHeader>
                <p className="font-display text-3xl text-[var(--brass)]">{s.n}</p>
                <CardTitle className="text-2xl">{s.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {s.body}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ol>

      <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
        <div className="relative h-72 overflow-hidden rounded-3xl border border-[var(--line)] sm:h-96">
          <Image
            src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80"
            alt={t("imageAlt")}
            fill
            className="object-cover"
            sizes="(max-width:1024px) 100vw, 50vw"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl tracking-tight">{t("opsTitle")}</h2>
          <p className="mt-4 font-light leading-relaxed text-[var(--muted)]">
            {t("opsBody")}
          </p>
          <DemoCta
            className="mt-8"
            label={locale === "tr" ? "Demo iste" : "Request a demo"}
          />
        </div>
      </div>
    </PageShell>
  );
}
