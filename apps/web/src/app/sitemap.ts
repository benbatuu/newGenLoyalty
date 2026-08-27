import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Pathnames } from "@/i18n/routing";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

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
