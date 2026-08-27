import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/public-urls";

export default function robots(): MetadataRoute.Robots {
  const SITE = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
