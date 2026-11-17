import { resolveMenuTheme } from "@ngl/shared";
import type { PublicMenuPayload } from "@/components/menu-themes/menu-theme-types";

/** Anlık boya için son kopya; her açılışta ağdan doğrulanır. */
export const MENU_CACHE_STALE_MS = 10 * 60_000;
const STORAGE_PREFIX = "ngl:qr-menu:";

type CacheEntry = { at: number; data: PublicMenuPayload };

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PublicMenuPayload>>();

export function publicMenuCacheKey(opts: {
  slug: string;
  branchId?: string;
  qrCode?: string;
}): string {
  return [opts.slug, opts.qrCode || "", opts.branchId || ""].join("|");
}

export function hydratePublicMenu(data: PublicMenuPayload): PublicMenuPayload {
  const resolved = resolveMenuTheme(
    data.theme?.preset,
    data.theme?.document ?? data.theme?.config,
    data.tenant.primaryColor,
  );
  return {
    ...data,
    theme: {
      ...resolved,
      document: data.theme?.document,
    },
  };
}

function readStorage(key: string): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.data?.tenant || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(key: string, entry: CacheEntry) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function readPublicMenuCache(key: string): CacheEntry | null {
  const mem = memory.get(key);
  if (mem) return mem;
  const stored = readStorage(key);
  if (stored) memory.set(key, stored);
  return stored;
}

export function writePublicMenuCache(key: string, data: PublicMenuPayload) {
  const entry: CacheEntry = { at: Date.now(), data };
  memory.set(key, entry);
  writeStorage(key, entry);
}

export function isMenuCacheUsable(entry: CacheEntry, now = Date.now()): boolean {
  return now - entry.at < MENU_CACHE_STALE_MS;
}

export async function fetchPublicMenuJson(
  url: string,
  cacheKey: string,
): Promise<PublicMenuPayload> {
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error("Menü bulunamadı");
    const data = hydratePublicMenu((await res.json()) as PublicMenuPayload);
    writePublicMenuCache(cacheKey, data);
    return data;
  })();

  inflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inflight.delete(cacheKey);
  }
}
