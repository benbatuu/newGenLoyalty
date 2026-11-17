"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, SessionExpiredError, api, getStoredUser } from "./api";

/**
 * Oturum boyunca nadiren değişen veriler (paket menüsü, kurulum durumu).
 * Girişte bir kez çekilir, sayfa yenilense de localStorage'dan okunur.
 * Yeniden çekilme anları: token yenilenince (~15 dk), çıkış/giriş, ya da
 * veriyi değiştiren bir işlemden sonra `refreshSessionData()` çağrılınca.
 */

export const SESSION_DATA_PATHS = {
  plan: "/tenants/me/plan",
  onboarding: "/tenants/me/onboarding",
  /** Marka ve kart ayarları: oturumda bir kez çekilir, sayfalar tekrar istemez */
  tenant: "/tenants/me",
} as const;

export type SessionDataKey = keyof typeof SESSION_DATA_PATHS;

// api.ts'de de aynı değerler var (clearSession / login / refresh)
const STORAGE_KEY = "ngl_session_data_v1";
const CHANGE_EVENT = "ngl:session-data";
/** api.ts token yenileyince bu olayı yayar */
export const TOKENS_REFRESHED_EVENT = "ngl:tokens-refreshed";

type Stored = {
  /** Başka kullanıcının verisi okunmasın */
  owner: string;
  entries: Partial<Record<SessionDataKey, unknown>>;
};

function ownerId(): string | null {
  const u = getStoredUser();
  return u ? `${u.id}:${u.tenantId ?? ""}` : null;
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    return parsed.owner === ownerId() ? parsed : null;
  } catch {
    return null;
  }
}

function write(key: SessionDataKey, value: unknown) {
  const owner = ownerId();
  if (!owner) return;
  const current = read() ?? { owner, entries: {} };
  current.entries[key] = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* private mode — yalnızca bellekte kalır */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

export function peekSessionData<T>(key: SessionDataKey): T | undefined {
  if (typeof window === "undefined") return undefined;
  return read()?.entries[key] as T | undefined;
}

export function setSessionData<T>(key: SessionDataKey, value: T) {
  write(key, value);
}

/** Çıkış ve yeni girişte çağrılır */
export function clearSessionData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const inflight = new Map<SessionDataKey, Promise<unknown>>();

function fetchAndStore<T>(key: SessionDataKey): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = api<T>(SESSION_DATA_PATHS[key])
    .then((data) => {
      write(key, data);
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Elde olan kayıtları sessizce tazele (hepsi veya verilenler) */
export function refreshSessionData(...keys: SessionDataKey[]) {
  if (typeof window === "undefined") return;
  const stored = read();
  const targets = keys.length
    ? keys
    : (Object.keys(stored?.entries ?? {}) as SessionDataKey[]);
  for (const k of targets) void fetchAndStore(k).catch(() => {});
}

// Token yenilendiğinde oturum verisini de tazele (modül bir kez yüklenir)
if (typeof window !== "undefined") {
  window.addEventListener(TOKENS_REFRESHED_EVENT, () => refreshSessionData());
}

/**
 * Oturum verisini okur; yoksa bir kez çeker. Sayfa yenilemede istek atmaz.
 * Başka sekme veya `setSessionData` değiştirirse anında güncellenir.
 */
/** Süper admin'in tenant'ı yok; tenant'a bağlı uçlar ona hiç çağrılmaz */
function isTenantlessUser(): boolean {
  return getStoredUser()?.role === "SUPER_ADMIN";
}

export function useSessionData<T>(key: SessionDataKey, requested = true) {
  const enabled = requested && !isTenantlessUser();
  const [data, setData] = useState<T | undefined>(() =>
    enabled ? peekSessionData<T>(key) : undefined,
  );
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(() => {
    setData(peekSessionData<T>(key));
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    sync();
    if (peekSessionData(key) === undefined) {
      fetchAndStore<T>(key).catch((err) => {
        if (err instanceof SessionExpiredError) return;
        setError(err instanceof ApiError ? err.message : "Veri alınamadı");
      });
    }
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === key) {
        setError(null);
        sync();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [key, enabled, sync]);

  return { data: enabled ? data : undefined, error: enabled ? error : null };
}
