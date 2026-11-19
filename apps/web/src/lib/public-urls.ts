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
 * Client: only NEXT_PUBLIC_ADMIN_URL (inlined at build).
 * Production without env returns "" — callers must fall back to marketing `/login`.
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

/** Admin `/login`, or "" when unset in production (use marketing `/login` fallback). */
export function getAdminLoginUrl(): string {
  const base = getAdminUrl();
  return base ? `${base}/login` : "";
}

/** Admin `/register` (kayıt), yoksa "" — çağıran taraf fallback'ini seçer. */
export function getAdminRegisterUrl(): string {
  const base = getAdminUrl();
  return base ? `${base}/register` : "";
}

function mediaKeyFromUrl(raw: string): string | null {
  const mediaIdx = raw.indexOf("/media/");
  if (mediaIdx >= 0) {
    return raw.slice(mediaIdx + "/media/".length).split("?")[0] || null;
  }
  try {
    const u = new URL(raw);
    if (u.hostname.endsWith(".r2.cloudflarestorage.com")) {
      let key = u.pathname.replace(/^\//, "");
      if (
        !key.startsWith("tenants/") &&
        !key.startsWith("menu/") &&
        !key.startsWith("menu-themes/")
      ) {
        const parts = key.split("/");
        if (
          parts.length >= 2 &&
          (parts[1] === "tenants" || parts[1] === "menu" || parts[1] === "menu-themes")
        ) {
          key = parts.slice(1).join("/");
        }
      }
      if (
        key.startsWith("tenants/") ||
        key.startsWith("menu/") ||
        key.startsWith("menu-themes/")
      ) {
        return key;
      }
    }
    if (u.pathname.startsWith("/media/")) {
      return u.pathname.slice("/media/".length).split("?")[0] || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Telefon / başka cihaz: localhost veya LAN API URL'leri same-origin `/backend` üzerinden yüklenir.
 */
export function resolvePublicAssetUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const raw = url.trim();
  if (raw.startsWith("/backend/") || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const mediaKey = mediaKeyFromUrl(raw);
  if (mediaKey) {
    const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
    return `/backend/media/${mediaKey}${q}`;
  }

  const uploadsIdx = raw.indexOf("/uploads/");
  if (uploadsIdx >= 0) {
    const rest = raw.slice(uploadsIdx);
    return `/backend${rest.split("?")[0]}${rest.includes("?") ? rest.slice(rest.indexOf("?")) : ""}`;
  }

  try {
    const u = new URL(raw);
    if (u.pathname.startsWith("/uploads/")) {
      return `/backend${u.pathname}${u.search}`;
    }
    if (u.pathname.startsWith("/media/")) {
      return `/backend${u.pathname}${u.search}`;
    }
  } catch {
    if (raw.startsWith("/uploads/") || raw.startsWith("/media/")) {
      return `/backend${raw}`;
    }
  }

  return raw;
}
