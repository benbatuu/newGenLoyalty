"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, SessionExpiredError, api } from "./api";
import {
  cachedFetch,
  invalidateCache,
  isFresh,
  peekCache,
  DEFAULT_TTL_MS,
} from "./query-cache";

export function useApiQuery<T>(
  key: string | null,
  path: string | null,
  opts?: { ttlMs?: number; enabled?: boolean },
) {
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const enabled = opts?.enabled ?? true;
  const cached = key ? peekCache<T>(key) : undefined;

  const [data, setData] = useState<T | null>(cached ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled && !!key && cached == null);
  const [refreshing, setRefreshing] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const reload = useCallback(
    async (force = false) => {
      if (!key || !pathRef.current || !enabled) return;
      const hasStale = peekCache<T>(key) != null;
      const fresh = isFresh(key, ttlMs);

      if (!force && fresh && hasStale) {
        setData(peekCache<T>(key) ?? null);
        setLoading(false);
        return;
      }

      if (hasStale) {
        setData(peekCache<T>(key) ?? null);
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const { data: next } = await cachedFetch<T>(
          key,
          () => api<T>(pathRef.current!),
          { ttlMs, force },
        );
        setData(next);
        setError(null);
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
        setError(err instanceof ApiError ? err.message : "Veri alınamadı");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [key, ttlMs, enabled],
  );

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload,
    setData,
  };
}

export function bustCache(match?: string | RegExp) {
  invalidateCache(match);
}
