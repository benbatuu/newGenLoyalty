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
  type AuthUser,
  type Role,
} from "./api";
import { invalidateCache } from "./query-cache";

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
    setUser(getStoredUser());
    setReady(true);
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      clearSession();
      invalidateCache();
      setUser(null);
      router.replace("/login");
    });
  }, [router]);

  /** Sekme tekrar açıldığında access token süresi dolmadan yenile. */
  useEffect(() => {
    async function refreshIfNeeded() {
      if (!getStoredTokens()?.refreshToken) return;
      try {
        await api("/auth/me");
      } catch {
        /* refresh veya login yönlendirmesi api katmanında */
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
    invalidateCache();
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
