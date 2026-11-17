"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, SessionExpiredError, api } from "./api";

/**
 * Aynı anda aynı adrese giden GET isteklerini tek isteğe indirir
 * (ör. React Strict Mode'un çift effect'i, iki bileşenin aynı veriyi istemesi).
 * Veri saklamaz: istek bitince kayıt silinir.
 */
const inflight = new Map<string, Promise<unknown>>();

function sharedGet<T>(path: string): Promise<T> {
  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;
  const p = api<T>(path).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/**
 * Basit veri çekme hook'u — cache yok.
 * Bileşen her açıldığında (veya `key` değiştiğinde) sunucudan taze veri ister.
 * `key` yalnızca isteği yeniden tetiklemek için kullanılır; `null` ise istek atılmaz.
 */
export function useApiQuery<T>(
  key: string | null,
  path: string | null,
  opts?: { enabled?: boolean },
) {
  const enabled = opts?.enabled ?? true;
  const active = enabled && !!key && !!path;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(active);
  const [refreshing, setRefreshing] = useState(false);

  const pathRef = useRef(path);
  pathRef.current = path;
  /** Yarışan isteklerde sadece en sonuncusu state'e yazılsın */
  const requestId = useRef(0);
  const hasData = useRef(false);

  const reload = useCallback(
    // force=true → devam eden ortak isteğe bağlanma; yazma sonrası taze veri garanti
    async (force?: boolean) => {
      if (!active || !pathRef.current) return;
      const id = ++requestId.current;
      if (hasData.current) setRefreshing(true);
      else setLoading(true);

      try {
        const next = force
          ? await api<T>(pathRef.current)
          : await sharedGet<T>(pathRef.current);
        if (id !== requestId.current) return;
        hasData.current = true;
        setData(next);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof SessionExpiredError) return;
        setError(err instanceof ApiError ? err.message : "Veri alınamadı");
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [active],
  );

  useEffect(() => {
    // Önceki veri yeni yanıt gelene kadar ekranda kalır (filtre/arama değişiminde
    // liste boşalıp yanıp sönmesin); bu sırada `refreshing` true olur.
    setError(null);
    if (!active) {
      requestId.current++;
      setLoading(false);
      return;
    }
    void reload();
    // key/path değişince yeniden çek
  }, [key, path, active, reload]);

  return { data, error, loading, refreshing, reload, setData };
}
