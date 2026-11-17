"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { PLAN_MENU_KEYS } from "@ngl/shared";
import { PageHeader } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { useSessionData } from "../../../lib/session-data";
import {
  DEFAULT_SETTINGS_PATH,
  visibleSettingsNav,
} from "../_lib/settings-nav";

type TenantPlanMenu = {
  menuKeys: string[];
  features: string[];
};

function navActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  if (pathname === base) return true;
  return pathname.startsWith(`${base}/`);
}

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: plan, error: planError } = useSessionData<TenantPlanMenu>(
    "plan",
    !!user?.tenantId,
  );

  const groups = useMemo(
    () =>
      visibleSettingsNav(
        // Paket gelene kadar sadece her zaman açık olanlar; hata olursa başlangıç menüsü
        plan?.menuKeys ?? (planError ? [...PLAN_MENU_KEYS.starter] : []),
        plan?.features.includes("all") ?? false,
      ),
    [plan, planError],
  );

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="Kafem"
        title="Ayarlar"
        subtitle="Hesap, işletme ve abonelik ayarlarını tek yerden yönetin."
        help="Üstteki menüden ilgili bölüme geçin. Paketinizde olmayan bölümler listede görünmez."
      />

      <nav
        className="attio-surface overflow-x-auto p-1.5"
        aria-label="Ayarlar menüsü"
      >
        {groups.length === 0 ? (
          <p className="px-2.5 py-2 text-[0.8125rem] text-[var(--muted)]">
            Bu pakette ayar bölümü yok.{" "}
            <Link href={DEFAULT_SETTINGS_PATH} className="font-medium text-[var(--ink)] underline underline-offset-2">
              Hesap
            </Link>
          </p>
        ) : (
          <div className="flex min-w-max items-center gap-1">
            {groups.flatMap((group) => group.items).map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.hint}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-9 items-center rounded-lg px-3.5 text-[0.8125rem] font-medium transition ${
                    active
                      ? "bg-[var(--accent)] text-white shadow-[0_6px_18px_-8px_rgba(239,35,60,0.6)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
