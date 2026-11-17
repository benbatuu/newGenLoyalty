"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { homePathForRole, useAuth } from "../lib/auth";
import { AdminShell } from "./admin-shell";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/passive"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div
        className="w-full max-w-sm space-y-3"
        aria-busy
        aria-label="Yükleniyor"
      >
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--wash)]" />
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--wash)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[var(--wash)]" />
      </div>
    </div>
  );
}

export function PanelChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (!ready || isPublic) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (
      user.role === "STORE_OWNER" &&
      typeof window !== "undefined" &&
      sessionStorage.getItem("subscription:needsReactivation") === "1" &&
      !pathname.startsWith("/settings/billing") &&
      pathname !== "/login"
    ) {
      router.replace("/settings/billing");
    }
  }, [ready, user, isPublic, pathname, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (!ready) {
    return <AuthLoading />;
  }

  if (!user) {
    return <AuthLoading />;
  }

  // QR tasarım editörü full-bleed — panel sidebar yok
  if (pathname.startsWith("/qr-design")) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
