import { SECTOR_SLUGS } from "@/lib/sectors";
import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Pathnames } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/public-urls";

const pathnames: Exclude<Pathnames, "/sectors/[slug]">[] = [
  "/",
  "/how",
  "/features",
  "/programs",
  "/pricing",
  "/sectors",
  "/use-cases",
  "/contact",
  "/portal",
  "/login",
  "/signup",
  "/kvkk",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const SITE = getSiteUrl();

  const sectorEntries = SECTOR_SLUGS.map((slug) => ({
    href: { pathname: "/sectors/[slug]", params: { slug } } as const,
    key: `sectors/${slug}`,
  }));

  return routing.locales.flatMap((locale) => [
    ...pathnames.map((pathname) => ({
      url: `${SITE}${getPathname({ locale, href: pathname })}`,
      lastModified: now,
      changeFrequency: (pathname === "/" ? "weekly" : "monthly") as
        | "weekly"
        | "monthly",
      priority: pathname === "/" ? 1 : 0.7,
    })),
    ...sectorEntries.map((e) => ({
      url: `${SITE}${getPathname({ locale, href: e.href as never })}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]);
}
