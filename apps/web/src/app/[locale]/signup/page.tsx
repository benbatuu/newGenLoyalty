import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/PageShell";
import { SignupForm } from "@/components/SignupForm";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "authPages" });
  return buildPageMetadata({
    locale,
    title: t("signupTitle"),
    description: t("signupIntro"),
    pathname: "/signup",
  });
}

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("authPages");
  const nav = await getTranslations("nav");

  return (
    <PageShell
      title={t("signupTitle")}
      intro={t("signupIntro")}
      wide
      heroImage="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("signupTitle")}
    >
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <SignupForm />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-2xl">{t("signupAside")}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {locale === "tr"
                ? "Hesap hemen açılır (TRIAL). Ödeme / abonelik sonra; SuperAdmin gerekirse dondurabilir."
                : "Account opens immediately (TRIAL). Billing comes later; SuperAdmin can freeze if needed."}
            </CardDescription>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/login">
                <span className="relative z-10">{nav("login")}</span>
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
    </PageShell>
  );
}
