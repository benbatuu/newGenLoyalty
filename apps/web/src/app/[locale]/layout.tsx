import { Fraunces, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "../../i18n/routing";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { SmoothScroll } from "../../components/SmoothScroll";
import { DemoModalProvider } from "../../components/marketing/DemoModal";
import {
  JsonLd,
  organizationJsonLd,
  softwareJsonLd,
} from "../../components/JsonLd";
import "../globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <JsonLd data={organizationJsonLd(locale)} />
        <JsonLd data={softwareJsonLd(locale)} />
        <NextIntlClientProvider messages={messages}>
          <DemoModalProvider>
            <SmoothScroll>
              <SiteHeader />
              {children}
              <SiteFooter />
            </SmoothScroll>
          </DemoModalProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
