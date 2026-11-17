import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

/** Monorepo: merge repo-root .env when running from apps/admin (local dev). */
function loadRootEnv() {
  // Only inject vars safe for the admin app — skip API_URL (often a stale LAN IP for mobile).
  const allowed = new Set(["WEB_URL", "SITE_URL", "ADMIN_URL"]);
  const envPath = path.join(process.cwd(), "../..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!allowed.has(key) || process.env[key]) continue;
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

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_WEB_URL:
      process.env.NEXT_PUBLIC_WEB_URL ||
      process.env.SITE_URL ||
      process.env.WEB_URL ||
      "",
  },
  transpilePackages: ["@ngl/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lftz25oez4aqbxpq.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "newgenloyalty.onrender.com",
      }
    ],
  },
};

export default nextConfig;
