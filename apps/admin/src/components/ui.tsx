"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { homePathForRole, useAuth } from "../lib/auth";
import type { Role } from "../lib/api";

type NavItem = { href: string; label: string; hint?: string; roles: Role[] };
type NavGroup = { id: string; label: string; roles: Role[]; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "platform",
    label: "Platform",
    roles: ["SUPER_ADMIN"],
    items: [
      {
        href: "/platform",
        label: "Özet",
        hint: "Metrikler & nabız",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/tenants",
        label: "Kafeler",
        hint: "Oluştur, dondur, yönet",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/subscriptions",
        label: "Abonelikler",
        hint: "Trial / aktif / askı",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/leads",
        label: "Lead’ler",
        hint: "İletişim & self-serve",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/sms",
        label: "SMS raporları",
        hint: "Gönderim & teslimat",
        roles: ["SUPER_ADMIN"],
      },
      {
        href: "/platform/help",
        label: "Yardım",
        hint: "Platform rehberi",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    id: "ops",
    label: "Operasyon",
    roles: ["STORE_OWNER", "CASHIER"],
    items: [
      {
        href: "/counter",
        label: "Tezgâh",
        hint: "Kayıt, damga, ödül",
        roles: ["CASHIER", "STORE_OWNER"],
      },
      {
        href: "/metrics",
        label: "Özet",
        hint: "Günün nabzı",
        roles: ["STORE_OWNER"],
      },
      {
        href: "/reports",
        label: "Raporlar",
        hint: "Hareket & CSV export",
        roles: ["STORE_OWNER"],
      },
    ],
  },
  {
    id: "customers",
    label: "Müşteriler",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/customers",
        label: "Müşteri listesi",
        hint: "Ara, CSV, KVKK",
        roles: ["STORE_OWNER"],
      },
    ],
  },
  {
    id: "program",
    label: "Sadakat",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/reward",
        label: "Ödül kuralı",
        hint: "X damga → ödül",
        roles: ["STORE_OWNER"],
      },
      {
        href: "/settings",
        label: "Kart tasarımı",
        hint: "Wallet görünümü",
        roles: ["STORE_OWNER"],
      },
      {
        href: "/business",
        label: "Davet sayfası",
        hint: "Profil, form, KVKK",
        roles: ["STORE_OWNER"],
      },
      {
        href: "/notifications",
        label: "Bildirimler",
        hint: "Wallet duyurusu",
        roles: ["STORE_OWNER"],
      },
    ],
  },
  {
    id: "store",
    label: "İşletme",
    roles: ["STORE_OWNER"],
    items: [
      {
        href: "/staff",
        label: "Kasiyerler",
        hint: "Davet & şifre reset",
        roles: ["STORE_OWNER"],
      },
      {
        href: "/billing",
        label: "Abonelik",
        hint: "Paket durumu",
        roles: ["STORE_OWNER"],
      },
      {
        href: "/help",
        label: "Yardım",
        hint: "Kurulum & SSS",
        roles: ["STORE_OWNER"],
      },
    ],
  },
];

function navItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Nested platform routes: /platform/leads aktifken /platform özeti aktif olmasın
  if (href !== "/platform" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(homePathForRole(user.role));
    }
  }, [ready, user, roles, router]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-sm space-y-3" aria-busy aria-label="Yükleniyor">
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--wash)]" />
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--wash)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--wash)]" />
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return null;
  }

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.includes(user.role)),
  })).filter((g) => g.items.length > 0 && g.roles.includes(user.role));

  const flatItems = groups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="relative z-30 flex shrink-0 flex-col border-b border-[var(--line)] bg-[var(--sidebar)] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(255,255,255,0.12), transparent 55%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-3 px-5 py-5 lg:block">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[1.35rem] leading-tight tracking-tight">
              Dokun &amp; Kazan
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">
              Operasyon paneli
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="rounded-[var(--radius-sm)] border border-[var(--sidebar-line)] bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10 lg:mt-5 lg:w-full"
          >
            Çıkış
          </button>
        </div>

        {/* Mobile: horizontal chips */}
        <nav className="relative flex gap-1.5 overflow-x-auto px-3 pb-3 lg:hidden">
          {flatItems.map((item) => {
            const active = navItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
                  active
                    ? "bg-white text-[var(--sidebar)]"
                    : "bg-white/8 text-white/80 hover:bg-white/12"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: grouped nav */}
        <nav className="relative hidden min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4 lg:block">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = navItemActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition ${
                          active
                            ? "bg-white text-[var(--sidebar)] shadow-[var(--shadow-sm)]"
                            : "text-white/85 hover:bg-[var(--sidebar-hover)]"
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            active ? "bg-[var(--accent)]" : "bg-white/25 group-hover:bg-white/50"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-snug">
                            {item.label}
                          </span>
                          {item.hint ? (
                            <span
                              className={`mt-0.5 block text-[11px] leading-snug ${
                                active ? "text-[var(--muted)]" : "text-white/40"
                              }`}
                            >
                              {item.hint}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative mt-auto hidden shrink-0 border-t border-[var(--sidebar-line)] px-5 py-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-[var(--sidebar-muted)]">
                {user.email}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                {roleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
        {children}
      </main>
    </div>
  );
}

function roleLabel(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Süper admin";
    case "STORE_OWNER":
      return "Kafe sahibi";
    case "CASHIER":
      return "Kasiyer";
  }
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] leading-tight tracking-tight text-[var(--ink)] sm:text-[2.1rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function inputClassName() {
  return "w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-60";
}

export function btnPrimary() {
  return "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_12px_rgba(15,31,24,0.18)] transition hover:bg-[var(--accent-deep)] active:translate-y-px disabled:opacity-50";
}

export function btnGhost() {
  return "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface)] disabled:opacity-50";
}

export function Panel({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-md)] ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  step,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  step?: string | number;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {step != null ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] px-1.5 text-[11px] font-bold text-[var(--accent)]">
              {step}
            </span>
          ) : null}
          <h2 className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)] sm:text-xl">
            {title}
          </h2>
        </div>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] sm:text-[13px]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
      {children}
    </p>
  );
}

export function SoftBox({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] p-3.5 sm:p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        role="tablist"
        className="inline-flex min-w-full gap-1 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-1 sm:min-w-0"
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`relative flex-1 whitespace-nowrap rounded-[calc(var(--radius-sm)-2px)] px-3 py-2.5 text-left transition sm:px-4 ${
                active
                  ? "bg-white text-[var(--ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">
                {tab.label}
              </span>
              {tab.hint ? (
                <span
                  className={`mt-0.5 hidden text-[10px] leading-tight sm:block ${
                    active ? "text-[var(--muted)]" : "text-[var(--muted)]/70"
                  }`}
                >
                  {tab.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Panel className={accent ? "border-[var(--accent)]/20 bg-gradient-to-br from-white to-[var(--accent-soft)]" : ""}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tabular-nums tracking-tight text-[var(--ink)] sm:text-[2.1rem]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p> : null}
    </Panel>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-red-200",
    info: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-[var(--radius-sm)] border border-red-200 bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
      {message}
    </p>
  );
}

export function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-[var(--radius-sm)] border border-emerald-200 bg-[var(--success-soft)] px-3.5 py-2.5 text-sm text-[var(--success)]">
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] px-4 py-8 text-center">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
  );
}

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--wash)] ${className}`}
      aria-hidden
    />
  );
}

export function PageSkeleton({
  cards = 6,
  chart = false,
}: {
  cards?: number;
  chart?: boolean;
}) {
  return (
    <div className="w-full space-y-6" aria-busy aria-label="Yükleniyor">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: cards }).map((_, i) => (
          <Panel key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-3 h-3 w-28" />
          </Panel>
        ))}
      </div>
      {chart ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel>
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-48 w-full" />
          </Panel>
          <Panel>
            <Skeleton className="mb-4 h-5 w-36" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="w-full space-y-5" aria-busy aria-label="Yükleniyor">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="mt-2 h-10 w-40" />
          </div>
        </Panel>
        <Panel>
          <Skeleton className="mb-4 h-5 w-28" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </Panel>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-5" aria-busy aria-label="Yükleniyor">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Panel>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Panel>
        <Panel padded={false}>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3.5 last:border-0"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
