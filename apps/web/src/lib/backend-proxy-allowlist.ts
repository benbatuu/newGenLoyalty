/** Allowlist for marketing-site → API proxy (`/backend/*`). */

export type ProxyMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

const ALLOWED: { method: ProxyMethod; pattern: RegExp }[] = [
  { method: "POST", pattern: /^public\/contact$/ },
  { method: "POST", pattern: /^public\/signup$/ },
  { method: "GET", pattern: /^public\/plans$/ },
  { method: "GET", pattern: /^public\/menu\/[^/]+$/ },
  { method: "GET", pattern: /^public\/menu\/[^/]+\/table\/[^/]+$/ },
  { method: "POST", pattern: /^public\/menu\/[^/]+\/feedback$/ },
  { method: "GET", pattern: /^media\/(tenants|menu|menu-themes)\/.+$/ },
  { method: "HEAD", pattern: /^media\/(tenants|menu|menu-themes)\/.+$/ },
  { method: "GET", pattern: /^uploads\/tenants\/.+$/ },
  { method: "HEAD", pattern: /^uploads\/tenants\/.+$/ },
  // Portal lookup must be POST so phone stays out of query/access logs
  { method: "POST", pattern: /^public\/portal$/ },
  { method: "POST", pattern: /^public\/social\/claim$/ },
];

export const PROXY_MAX_BODY_BYTES = 256 * 1024;

/** Reject path traversal and non-allowlisted routes. */
export function isAllowedBackendProxy(
  method: string,
  segments: string[],
): boolean {
  if (segments.some((s) => !s || s === "." || s === ".." || s.includes("\\"))) {
    return false;
  }
  const path = segments.join("/");
  if (!path || path.includes("//")) return false;

  const m = method.toUpperCase() as ProxyMethod;
  return ALLOWED.some((rule) => rule.method === m && rule.pattern.test(path));
}

/** Tarayıcının /backend görsellerini ve menü JSON'unu tutması. */
export function browserCacheControlForProxyPath(path: string): string | null {
  if (
    path.startsWith("media/") ||
    path.startsWith("uploads/")
  ) {
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  if (path.startsWith("public/menu/")) {
    return "no-store";
  }
  return null;
}
