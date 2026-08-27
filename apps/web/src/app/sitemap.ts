import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Pathnames } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/public-urls";

const pathnames: Pathnames[] = [
  "/",
  "/how",
  "/features",
  "/pricing",
  "/sectors",
  "/use-cases",
  "/contact",
  "/login",
  "/signup",
  "/kvkk",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const SITE = getSiteUrl();

  return routing.locales.flatMap((locale) =>
    pathnames.map((pathname) => ({
      url: `${SITE}${getPathname({ locale, href: pathname })}`,
      lastModified: now,
      changeFrequency: (pathname === "/" ? "weekly" : "monthly") as
        | "weekly"
        | "monthly",
      priority: pathname === "/" ? 1 : 0.7,
    })),
  );
}
