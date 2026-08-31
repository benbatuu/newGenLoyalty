/** Public URLs — marketing site */

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return stripSlash(v);
  }
  return undefined;
}

const isProd = process.env.NODE_ENV === "production";

function withHttps(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

/**
 * API calls from the browser go through same-origin `/backend/*` proxy
 * (see app/backend/[...path]/route.ts) — reads API_URL at runtime on the server.
 */
export function getApiUrl(): string {
  return "/backend";
}

export function getSiteUrl(): string {
  const fromEnv = firstEnv("NEXT_PUBLIC_SITE_URL", "SITE_URL", "WEB_URL");
  if (fromEnv) return withHttps(fromEnv);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return withHttps(vercel);

  if (!isProd) return "http://localhost:3000";

  throw new Error(
    "WEB_URL / SITE_URL is required in production (Vercel Environment)",
  );
}

/**
 * Admin panel base URL.
 * Server: reads ADMIN_URL at request time (Vercel Runtime).
 * Client: only NEXT_PUBLIC_ADMIN_URL (inlined at build) — never throws; pass from server when possible.
 */
export function getAdminUrl(): string {
  const onServer = typeof window === "undefined";
  const fromEnv = onServer
    ? firstEnv("ADMIN_URL", "NEXT_PUBLIC_ADMIN_URL")
    : firstEnv("NEXT_PUBLIC_ADMIN_URL");
  if (fromEnv) return withHttps(fromEnv);

  if (!isProd) return "http://localhost:3002";

  return "";
}

export function getAdminLoginUrl(): string {
  const base = getAdminUrl();
  return base ? `${base}/login` : "";
}
