import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoCta } from "@/components/marketing/DemoCta";
import { buildPageMetadata } from "@/lib/seo";
import { Check, X } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/pricing",
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricingPage");
  const plans = t.raw("plans") as {
    id: string;
    name: string;
    price: string;
    period: string;
    badge: string;
    note: string;
    includes: string[];
    cta: string;
  }[];
  const compareIn = t.raw("compareIn") as string[];
  const compareOut = t.raw("compareOut") as string[];

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      wide
      heroImage="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("title")}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={
              plan.id === "cafe"
                ? "border-[var(--accent)]/40 shadow-[0_20px_50px_rgba(22,53,40,0.08)]"
                : undefined
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.id === "cafe" ? "default" : "outline"}>
                  {plan.badge}
                </Badge>
              </div>
              <p className="mt-4 font-display text-5xl tracking-tight">
                {plan.price}
                <span className="ml-2 font-sans text-base font-light text-[var(--muted)]">
                  {plan.period}
                </span>
              </p>
              <CardDescription>{plan.note}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {plan.includes.map((line) => (
                  <li key={line} className="flex gap-2 text-sm font-light">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    {line}
                  </li>
                ))}
              </ul>
              <DemoCta label={plan.cta} className="mt-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-20">
        <h2 className="font-display text-3xl tracking-tight">{t("compareTitle")}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {locale === "tr" ? "Dahil" : "Included"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {compareIn.map((line) => (
                  <li key={line} className="flex gap-2 text-sm font-light">
                    <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {locale === "tr" ? "Şimdilik yok" : "Not yet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {compareOut.map((line) => (
                  <li key={line} className="flex gap-2 text-sm font-light text-[var(--muted)]">
                    <X className="h-4 w-4 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
