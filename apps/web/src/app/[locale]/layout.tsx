import { DM_Sans, Space_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "../../i18n/routing";
import { MarketingShell } from "../../components/MarketingShell";
import { DemoModalProvider } from "../../components/marketing/DemoModal";
import {
  JsonLd,
  organizationJsonLd,
  softwareJsonLd,
} from "../../components/JsonLd";
import "../globals.css";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
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
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      shortcut: "/favicon.png",
      apple: "/favicon.png",
    },
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
      <body className={`${sans.variable} ${mono.variable} overflow-x-hidden font-sans antialiased`}>
        <JsonLd data={organizationJsonLd(locale)} />
        <JsonLd data={softwareJsonLd(locale)} />
        <NextIntlClientProvider messages={messages}>
          <DemoModalProvider>
            <MarketingShell>{children}</MarketingShell>
          </DemoModalProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
