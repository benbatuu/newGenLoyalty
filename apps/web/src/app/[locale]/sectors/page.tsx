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
  const t = await getTranslations({ locale, namespace: "sectorsPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/sectors",
  });
}

export default async function SectorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sectorsPage");
  const items = t.raw("items") as {
    title: string;
    body: string;
    image: string;
  }[];

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      wide
      heroImage="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("title")}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title} className="overflow-hidden p-0">
            <div className="relative h-56">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {item.body}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="mt-14 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 sm:p-12">
        <h2 className="font-display text-2xl sm:text-3xl">
          {locale === "tr"
            ? "Sektörünüz listede yok mu?"
            : "Don't see your sector?"}
        </h2>
        <p className="mt-3 max-w-xl font-light text-[var(--muted)]">
          {locale === "tr"
            ? "Tekrar ziyaret ve tezgâh damgası modeline uyan her butik işletme için konuşabiliriz."
            : "If you have a counter and repeat visits, we can adapt the stamp model to your boutique business."}
        </p>
        <DemoCta
          className="mt-6"
          label={locale === "tr" ? "Demo iste" : "Request a demo"}
        />
      </div>
    </PageShell>
  );
}
