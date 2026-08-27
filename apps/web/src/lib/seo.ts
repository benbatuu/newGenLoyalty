import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale, type Pathnames } from "@/i18n/routing";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function localizedPath(locale: Locale, pathname: Pathnames) {
  return getPathname({
    locale,
    href: pathname,
  });
}

export function buildPageMetadata({
  locale,
  title,
  description,
  pathname,
  keywords,
}: {
  locale: string;
  title: string;
  description: string;
  pathname: Pathnames;
  keywords?: string;
}): Metadata {
  const loc = locale as Locale;
  const url = `${SITE}${localizedPath(loc, pathname)}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE}${localizedPath(l, pathname)}`;
  }
  languages["x-default"] = `${SITE}${localizedPath(
    routing.defaultLocale,
    pathname,
  )}`;

  return {
    title,
    description,
    keywords: keywords?.split(",").map((k) => k.trim()),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      alternateLocale: locale === "tr" ? ["en_US"] : ["tr_TR"],
      url,
      siteName: "Dokun & Kazan",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      "geo.region": "TR",
      "geo.placename": "Istanbul",
      language: locale,
    },
  };
}

export function absoluteUrl(locale: Locale, pathname: Pathnames) {
  return `${SITE}${localizedPath(locale, pathname)}`;
}

export { SITE };
