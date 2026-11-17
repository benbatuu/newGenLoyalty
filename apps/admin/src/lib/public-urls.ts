/**
 * Admin talks to the API via same-origin `/backend/*` proxy
 * (see app/backend/[...path]/route.ts). That way Vercel only needs
 * server-side API_URL — no NEXT_PUBLIC_ required in the browser.
 */

export function getApiUrl(): string {
  return "/backend";
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
      // Bucket may appear as first path segment on some endpoints
      if (
        !key.startsWith("tenants/") &&
        !key.startsWith("menu/") &&
        !key.startsWith("menu-themes/")
      ) {
        const parts = key.split("/");
        if (
          parts.length >= 2 &&
          (parts[1] === "tenants" ||
            parts[1] === "menu" ||
            parts[1] === "menu-themes")
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
      return null;
    }
    if (u.pathname.startsWith("/media/")) {
      return u.pathname.slice("/media/".length).split("?")[0] || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** API / R2 görsel URL → admin same-origin /backend proxy (önizleme kırık img fix) */
export function resolveAdminAssetUrl(url: string | null | undefined): string {
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
    const path = raw.slice(uploadsIdx);
    const q = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    const pathname = path.split("?")[0]!;
    return `/backend${pathname}${q}`;
  }

  try {
    const u = new URL(raw);
    if (u.pathname.startsWith("/uploads/")) {
      return `/backend${u.pathname}${u.search}`;
    }
  } catch {
    if (raw.startsWith("/uploads/") || raw.startsWith("/media/")) {
      return `/backend${raw}`;
    }
  }

  return raw;
}

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

/** Marketing site base URL (public menu, QR links). */
export function getWebUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (fromEnv) return stripSlash(fromEnv);

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes("admin.")) {
      return stripSlash(origin.replace("admin.", ""));
    }
    if (origin.includes(":3002")) {
      return stripSlash(origin.replace(":3002", ":3000"));
    }
    return origin;
  }

  return "http://localhost:3000";
}

export function getPublicMenuPath(slug: string, qrCode?: string): string {
  const locale = "tr";
  if (qrCode) {
    return `/${locale}/menu/${slug}/t/${qrCode}`;
  }
  return `/${locale}/menu/${slug}`;
}

export function getPublicMenuUrl(slug: string, qrCode?: string): string {
  return `${getWebUrl()}${getPublicMenuPath(slug, qrCode)}`;
}
