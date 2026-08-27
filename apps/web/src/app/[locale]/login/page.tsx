import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/seo";

const ADMIN_LOGIN =
  (process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002").replace(
    /\/$/,
    "",
  ) + "/login";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "authPages" });
  return buildPageMetadata({
    locale,
    title: t("loginTitle"),
    description: t("loginIntro"),
    pathname: "/login",
  });
}

export default async function LoginPage({
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
      title={t("loginTitle")}
      intro={t("loginIntro")}
      wide
      heroImage="https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=2000&q=80"
      heroAlt={t("loginTitle")}
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
            <CardDescription className="text-base">
              {t("loginHint")}
            </CardDescription>
            <Button asChild className="mt-8 w-full sm:w-auto" size="lg">
              <a href={ADMIN_LOGIN}>
                <span className="relative z-10 inline-flex items-center gap-2">
                  {t("loginCta")}
                  <span className="btn-arrow" aria-hidden>
                    →
                  </span>
                </span>
              </a>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="section-label">{nav("signup")}</p>
            <CardTitle className="mt-3 text-2xl">
              {locale === "tr" ? "Hesabınız yok mu?" : "New here?"}
            </CardTitle>
            <CardDescription className="text-base">
              {locale === "tr"
                ? "Kafe kaydı için başvurun — onboarding sonrası giriş bilgileri paylaşılır."
                : "Apply for a café account — credentials are shared after onboarding."}
            </CardDescription>
            <Button asChild variant="outline" className="mt-8 w-full sm:w-auto">
              <Link href="/signup">
                <span className="relative z-10">{nav("signup")}</span>
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
    </PageShell>
  );
}
