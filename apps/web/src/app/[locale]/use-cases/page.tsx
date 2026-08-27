import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "useCasesPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/use-cases",
  });
}

export default async function UseCasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("useCasesPage");
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      wide
      heroImage="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("title")}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item, i) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <p className="text-[0.7rem] tracking-[0.14em] uppercase text-[var(--brass)]">
                {String(i + 1).padStart(2, "0")}
              </p>
              <CardTitle className="mt-2 text-2xl">{item.title}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {item.body}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-16 grid gap-8 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--bg-deep)] p-8 text-white sm:grid-cols-[1.2fr_1fr] sm:p-12">
        <div>
          <h2 className="font-display text-3xl">
            {locale === "tr"
              ? "Tezgâhtan Wallet’a — 30 saniye"
              : "Counter to Wallet — in 30 seconds"}
          </h2>
          <p className="mt-4 font-light text-[var(--muted-on-dark)]">
            {locale === "tr"
              ? "Kasiyer telefonu girer, müşteri SMS linkiyle kartını ekler. Sonraki ziyaretlerde sadece damga."
              : "Cashier enters the phone, guest adds the pass via SMS link. Later visits are stamps only."}
          </p>
          <Button asChild variant="light" className="mt-8">
            <Link href="/how">
              {locale === "tr" ? "Akışı incele" : "See the flow"}
            </Link>
          </Button>
        </div>
        <div className="flex flex-col justify-center gap-3 border-t border-white/10 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          {(locale === "tr"
            ? ["Yeni müşteri kaydı", "Davet SMS / mock log", "Pass güncellemesi", "Ödül kullanımı"]
            : ["New customer enroll", "Invite SMS / mock log", "Pass update", "Reward redeem"]
          ).map((line) => (
            <p
              key={line}
              className="border-b border-white/10 pb-3 text-sm font-light text-[var(--ink-soft)] last:border-0"
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
