import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import fs from "fs";
import path from "path";

/** Monorepo: merge repo-root .env when running from apps/web (local dev). */
function loadRootEnv() {
  const envPath = path.join(process.cwd(), "../..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadRootEnv();

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * API: browser uses `/backend` proxy (runtime API_URL on server only).
 * ADMIN_URL / WEB_URL: mapped to NEXT_PUBLIC_* for client links (signup → admin).
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ADMIN_URL:
      process.env.NEXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL || "",
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.WEB_URL ||
      "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  transpilePackages: ["three"],
};

export default withNextIntl(nextConfig);
