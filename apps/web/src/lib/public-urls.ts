/** Public URLs — accepts API_URL / ADMIN_URL / WEB_URL (Vercel) or NEXT_PUBLIC_* */

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

function vercelHttpsUrl(): string | undefined {
  const raw = firstEnv(
    "NEXT_PUBLIC_SITE_URL",
    "SITE_URL",
    "WEB_URL",
    "NEXT_PUBLIC_VERCEL_URL",
    "VERCEL_URL",
  );
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

const isProd = process.env.NODE_ENV === "production";

/** Avoid crashing SSG/prerender when env is only available at runtime. */
function missingInProd(label: string): string {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.VERCEL === "1"
  ) {
    console.warn(`[urls] ${label} missing at build time — set it in Vercel (Build + Runtime)`);
    return "";
  }
  throw new Error(`${label} is required in production (set API_URL / ADMIN_URL / WEB_URL on Vercel)`);
}

export function getSiteUrl(): string {
  const fromEnv = firstEnv("NEXT_PUBLIC_SITE_URL", "SITE_URL", "WEB_URL");
  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv;
    return `https://${fromEnv}`;
  }
  const vercel = vercelHttpsUrl();
  if (vercel) return vercel;
  if (!isProd) return "http://localhost:3000";
  return missingInProd("WEB_URL / SITE_URL");
}

export function getAdminUrl(): string {
  const fromEnv = firstEnv("NEXT_PUBLIC_ADMIN_URL", "ADMIN_URL");
  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv;
    return `https://${fromEnv}`;
  }
  if (!isProd) return "http://localhost:3002";
  return missingInProd("ADMIN_URL");
}

export function getAdminLoginUrl(): string {
  const base = getAdminUrl();
  return base ? `${base}/login` : "/login";
}

export function getApiUrl(): string {
  const fromEnv = firstEnv("NEXT_PUBLIC_API_URL", "API_URL");
  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv;
    return `https://${fromEnv}`;
  }
  if (!isProd) return "http://localhost:3001";
  return missingInProd("API_URL");
}
