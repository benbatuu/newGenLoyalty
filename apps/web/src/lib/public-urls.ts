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

export function getAdminUrl(): string {
  const fromEnv = firstEnv("NEXT_PUBLIC_ADMIN_URL", "ADMIN_URL");
  if (fromEnv) return withHttps(fromEnv);

  if (!isProd) return "http://localhost:3002";

  throw new Error(
    "ADMIN_URL is required in production — set it in Vercel (Build + Runtime for client links)",
  );
}

export function getAdminLoginUrl(): string {
  return `${getAdminUrl()}/login`;
}
