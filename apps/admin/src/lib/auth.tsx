"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearSession,
  getStoredTokens,
  getStoredUser,
  homePathForRole,
  login as apiLogin,
  onSessionExpired,
  api,
  SessionExpiredError,
  type AuthUser,
  type Role,
} from "./api";

/** Eski sürümlerin bıraktığı cache kayıtlarını temizle (cache kaldırıldı). */
function clearLegacyCacheStorage() {
  try {
    sessionStorage.removeItem("ngl_query_cache_v1");
    sessionStorage.removeItem("ngl_query_cache");
    localStorage.removeItem("ngl_plan_menu_v1");
  } catch {
    /* ignore */
  }
}

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setReady(true);
    clearLegacyCacheStorage();
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      router.replace("/login");
    });
  }, [router]);

  /** Oturum süresi dolduğunda Next.js error overlay'i engelle. */
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof SessionExpiredError) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  /** Sekme tekrar açıldığında access token süresi dolmadan yenile. */
  useEffect(() => {
    /** Sekmeler arası hızlı geçişte her seferinde /auth/me atma */
    let lastCheck = 0;
    async function refreshIfNeeded() {
      if (!getStoredTokens()?.refreshToken) return;
      if (Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      try {
        await api("/auth/me");
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await apiLogin(email, password);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo(
    () => ({ user, ready, login, logout, hasRole }),
    [user, ready, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider içinde kullanılmalı");
  return ctx;
}

export { homePathForRole };
