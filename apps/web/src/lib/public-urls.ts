/** Public URLs for marketing site — no production localhost fallbacks. */

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function vercelHttpsUrl(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return stripSlash(raw);
  }
  return `https://${stripSlash(raw)}`;
}

const isProd = process.env.NODE_ENV === "production";

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return stripSlash(fromEnv);
  const vercel = vercelHttpsUrl();
  if (vercel) return vercel;
  if (!isProd) return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_SITE_URL (or VERCEL_URL) is required in production");
}

export function getAdminUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (fromEnv) return stripSlash(fromEnv);
  if (!isProd) return "http://localhost:3002";
  throw new Error("NEXT_PUBLIC_ADMIN_URL is required in production");
}

export function getAdminLoginUrl(): string {
  return `${getAdminUrl()}/login`;
}

export function getApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return stripSlash(fromEnv);
  if (!isProd) return "http://localhost:3001";
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
}
