import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale, type Pathnames } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/public-urls";

type Params = Record<string, string>;

function localizedPath(locale: Locale, pathname: Pathnames, params?: Params) {
  return getPathname({
    locale,
    // next-intl types dynamic routes as {pathname, params}; both shapes are valid here
    href: (params ? { pathname, params } : pathname) as never,
  });
}

export function buildPageMetadata({
  locale,
  title,
  description,
  pathname,
  params,
  keywords,
}: {
  locale: string;
  title: string;
  description: string;
  pathname: Pathnames;
  params?: Params;
  keywords?: string;
}): Metadata {
  const SITE = getSiteUrl();
  const loc = locale as Locale;
  const url = `${SITE}${localizedPath(loc, pathname, params)}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE}${localizedPath(l, pathname, params)}`;
  }
  languages["x-default"] = `${SITE}${localizedPath(
    routing.defaultLocale,
    pathname,
    params,
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
      siteName: "StampWell",
      title,
      description,
      images: [
        {
          url: `${SITE}/logo.png`,
          width: 1200,
          height: 630,
          alt: "StampWell",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE}/logo.png`],
    },
    other: {
      "geo.region": "TR",
      "geo.placename": "Istanbul",
      language: locale,
    },
  };
}

export function absoluteUrl(locale: Locale, pathname: Pathnames) {
  return `${getSiteUrl()}${localizedPath(locale, pathname)}`;
}
