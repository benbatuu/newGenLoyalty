"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../lib/auth";
import { api, type SubscriptionSnapshot } from "../lib/api";
import { TrialBanner } from "./trial-banner";
import { useSessionData } from "../lib/session-data";
import { resolveAdminAssetUrl } from "../lib/public-urls";
import { Icon } from "./sidebar/icons";
import {
  NAV_GROUPS,
  navItemActive,
  navItemVisible,
  roleLabel,
  type NavGroup,
  type OnboardingMenuStatus,
  type TenantPlanMenu,
} from "./sidebar/nav-config";

/** UI tercihleri (veri cache'i değil) — sidebar daraltma ve kapalı gruplar */
const COLLAPSED_KEY = "ngl_sidebar_collapsed";
const CLOSED_GROUPS_KEY = "ngl_sidebar_closed_groups";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function readClosedGroups(): string[] {
  try {
    const raw = localStorage.getItem(CLOSED_GROUPS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  // AdminShell sadece client'ta, kullanıcı yüklendikten sonra çizilir → localStorage güvenli
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [closedGroups, setClosedGroups] = useState<string[]>(readClosedGroups);

  const needsPlanMenu =
    !!user && (user.role === "STORE_OWNER" || user.role === "CASHIER");
  // Girişte bir kez çekilir; sayfa yenilemede tarayıcıdan okunur
  const { data: brandTenant } = useSessionData<{ logoUrl?: string | null; notifyIconUrl?: string | null }>("tenant");
  const avatarLogoUrl = brandTenant?.notifyIconUrl ?? brandTenant?.logoUrl ?? null;
  const { data: tenantPlan, error: planError } = useSessionData<TenantPlanMenu>(
    "plan",
    needsPlanMenu && !!user?.tenantId,
  );

  const needsOnboardingMenu =
    !!user && user.role === "STORE_OWNER" && !!user.tenantId;
  const { data: onboardingStatus } = useSessionData<OnboardingMenuStatus>(
    "onboarding",
    needsOnboardingMenu,
  );

  /** Paket henüz gelmedi → yanlış menü göstermek yerine iskelet */
  const planPending = needsPlanMenu && !tenantPlan && !planError;

  const groups: NavGroup[] = useMemo(() => {
    if (!user) return [];
    return NAV_GROUPS.filter((g) => g.roles.includes(user.role))
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.roles.includes(user.role) &&
            !(item.menuKey === "onboarding" && onboardingStatus?.complete) &&
            (user.role === "SUPER_ADMIN" || navItemVisible(item, tenantPlan)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [user, tenantPlan, onboardingStatus?.complete]);

  const activeGroupId = groups.find((g) =>
    g.items.some((i) => navItemActive(pathname, i.href)),
  )?.id;

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writePref(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setClosedGroups((prev) => {
      const next = prev.includes(id)
        ? prev.filter((g) => g !== id)
        : [...prev, id];
      writePref(CLOSED_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ⌘B / Ctrl+B ile daralt-genişlet
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        const t = e.target as HTMLElement | null;
        if (t?.closest("input, textarea, [contenteditable=true]")) return;
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (!user) return null;

  const currentPage =
    groups
      .flatMap((g) => g.items)
      .find((item) => navItemActive(pathname, item.href))?.label ?? "Panel";

  const me = user;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  /** `rail` = masaüstünde daraltılmış ikon şeridi */
  function renderSidebarBody(rail: boolean) {
    return (
      <div className="flex h-full flex-col">
        {/* Başlık */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-[var(--sidebar-line)] ${
            rail ? "justify-center px-2" : "justify-between gap-2 px-3"
          }`}
        >
          {!rail ? (
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-semibold text-[var(--ink)]">
                  StampWell
                </span>
                <span className="block truncate text-[0.6875rem] text-[var(--sidebar-muted)]">
                  Yönetim paneli
                </span>
              </span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] lg:grid"
            aria-label={rail ? "Menüyü genişlet" : "Menüyü daralt"}
            title={`${rail ? "Genişlet" : "Daralt"} (⌘B)`}
          >
            <Icon name="panel" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] lg:hidden"
            aria-label="Menüyü kapat"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        {/* Menü */}
        <nav
          aria-label="Ana menü"
          className={`sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 ${
            rail ? "px-2" : "px-2.5"
          }`}
        >
          {planPending ? (
            <NavSkeleton rail={rail} />
          ) : (
            <div className={rail ? "space-y-2" : "space-y-1"}>
              {groups.map((group, gi) => {
                const open =
                  rail ||
                  group.id === activeGroupId ||
                  !closedGroups.includes(group.id);
                const listId = `nav-group-${group.id}`;
                return (
                  <div key={group.id}>
                    {rail ? (
                      gi > 0 ? (
                        <div className="mx-2 mb-2 border-t border-[var(--sidebar-line)]" />
                      ) : null
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={open}
                        aria-controls={listId}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--sidebar-muted)] transition hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                      >
                        <span className="truncate">{group.label}</span>
                        <Icon
                          name="chevron"
                          size={14}
                          className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                            open ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    )}
                    <div
                      id={listId}
                      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <ul
                        className={`min-h-0 space-y-0.5 overflow-hidden ${
                          rail ? "" : "pb-2"
                        }`}
                        inert={!open}
                      >
                        {group.items.map((item) => {
                          const active = navItemActive(pathname, item.href);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                title={rail ? item.label : item.hint}
                                className={`relative flex items-center rounded-lg text-[0.8125rem] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)] ${
                                  rail
                                    ? "h-9 w-full justify-center"
                                    : "h-8 gap-2.5 px-2"
                                } ${
                                  active
                                    ? "bg-[var(--sidebar-active)] text-[var(--ink)] shadow-[var(--shadow-sm)] ring-1 ring-black/[0.06]"
                                    : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--ink)]"
                                }`}
                              >
                                <Icon
                                  name={item.icon}
                                  size={17}
                                  className={`shrink-0 ${
                                    active ? "text-[var(--brand)]" : ""
                                  }`}
                                />
                                {rail ? (
                                  <span className="sr-only">{item.label}</span>
                                ) : (
                                  <span className="min-w-0 truncate">
                                    {item.label}
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Kullanıcı */}
        <div
          className={`shrink-0 border-t border-[var(--sidebar-line)] ${
            rail ? "flex flex-col items-center gap-1.5 px-2 py-3" : "p-3"
          }`}
        >
          {rail ? (
            <>
              {avatarLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAdminAssetUrl(avatarLogoUrl)} alt="" title={me.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-[0.75rem] font-semibold text-white"
                title={`${me.name} · ${roleLabel(me.role)}`}
              >
                {me.name.slice(0, 1).toUpperCase()}
              </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-[var(--danger)]"
                aria-label="Çıkış yap"
                title="Çıkış yap"
              >
                <Icon name="logout" size={17} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              {avatarLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAdminAssetUrl(avatarLogoUrl)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[0.75rem] font-semibold text-white">
                  {me.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-[var(--ink)]">
                  {me.name}
                </p>
                <p className="truncate text-[0.6875rem] text-[var(--sidebar-muted)]">
                  {roleLabel(me.role)} · {me.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-[var(--danger)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                aria-label="Çıkış yap"
                title="Çıkış yap"
              >
                <Icon name="logout" size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Masaüstü sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-[var(--sidebar-line)] bg-[var(--sidebar)] transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block ${
          collapsed ? "w-[64px]" : "w-[252px]"
        }`}
      >
        {renderSidebarBody(collapsed)}
      </aside>

      {/* Mobil çekmece */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-hidden={!mobileOpen}
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          inert={!mobileOpen}
          className={`absolute inset-y-0 left-0 w-[min(86vw,288px)] bg-[var(--sidebar)] shadow-[var(--shadow-lg)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {renderSidebarBody(false)}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil üst bar */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2.5 border-b border-[var(--line)] bg-[var(--panel)]/90 px-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            aria-label="Menüyü aç"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
          >
            <Icon name="menu" size={18} />
          </button>
          <p className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold text-[var(--ink)]">
            {currentPage}
          </p>
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          <TrialBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

function NavSkeleton({ rail }: { rail: boolean }) {
  return (
    <div className="space-y-1.5" aria-busy="true" aria-label="Menü yükleniyor">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg bg-black/[0.05] ${
            rail ? "mx-auto h-9 w-9" : "h-8"
          }`}
          style={rail ? undefined : { width: `${55 + ((i * 17) % 40)}%` }}
        />
      ))}
    </div>
  );
}
