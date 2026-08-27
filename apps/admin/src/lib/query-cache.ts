type CacheEntry = {
  data: unknown;
  updatedAt: number;
  inflight?: Promise<unknown>;
};

const store = new Map<string, CacheEntry>();
export const DEFAULT_TTL_MS = 45_000;

export function peekCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  return entry.data as T;
}

export function isFresh(key: string, ttlMs = DEFAULT_TTL_MS): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.updatedAt < ttlMs;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, updatedAt: Date.now() });
}

export function invalidateCache(match?: string | RegExp): void {
  if (!match) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    const hit =
      typeof match === "string"
        ? key === match || key.startsWith(match)
        : match.test(key);
    if (hit) store.delete(key);
  }
}

/** Deduped fetch with stale-while-revalidate support. */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number; force?: boolean },
): Promise<{ data: T; fromCache: boolean }> {
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const force = opts?.force ?? false;

  if (!force && isFresh(key, ttlMs)) {
    return { data: peekCache<T>(key) as T, fromCache: true };
  }

  const existing = store.get(key);
  if (existing?.inflight) {
    const data = (await existing.inflight) as T;
    return { data, fromCache: false };
  }

  const inflight = fetcher().then((data) => {
    setCache(key, data);
    const entry = store.get(key);
    if (entry) delete entry.inflight;
    return data;
  });

  store.set(key, {
    data: existing?.data,
    updatedAt: existing?.updatedAt ?? 0,
    inflight,
  });

  try {
    const data = await inflight;
    return { data, fromCache: false };
  } catch (err) {
    const entry = store.get(key);
    if (entry) delete entry.inflight;
    if (existing?.data !== undefined) {
      return { data: existing.data as T, fromCache: true };
    }
    throw err;
  }
}
