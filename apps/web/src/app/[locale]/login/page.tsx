import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/PageShell";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";
import { Button } from "@/components/ui/button";
import { getAdminLoginUrl } from "@/lib/public-urls";
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
  const adminLogin = getAdminLoginUrl();

  return (
    <PageShell
      title={t("loginTitle")}
      intro={t("loginIntro")}
      eyebrow="Login"
      wide
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketingSurface>
          <h2 className="font-display text-2xl tracking-tight text-foreground">
            {t("loginTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("loginHint")}
          </p>
          {adminLogin ? (
            <Button asChild className="mt-8 w-full sm:w-auto" size="lg">
              <a href={adminLogin}>
                <span className="relative z-10 inline-flex items-center gap-2">
                  {t("loginCta")}
                  <span className="btn-arrow" aria-hidden>
                    →
                  </span>
                </span>
              </a>
            </Button>
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">{t("loginHint")}</p>
          )}
        </MarketingSurface>
        <MarketingSurface>
          <p className="text-sm font-medium text-muted-foreground">{nav("signup")}</p>
          <h2 className="mt-3 font-display text-2xl tracking-tight text-foreground">
            {locale === "tr" ? "Hesabınız yok mu?" : "New here?"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {locale === "tr"
              ? "Kafe kaydı için başvurun — onboarding sonrası giriş bilgileri paylaşılır."
              : "Apply for a café account — credentials are shared after onboarding."}
          </p>
          <Button asChild variant="outline" className="mt-8 w-full sm:w-auto">
            <Link href="/pricing">
              <span className="relative z-10">{nav("signup")}</span>
            </Link>
          </Button>
        </MarketingSurface>
      </div>
    </PageShell>
  );
}
