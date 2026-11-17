"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { homePathForRole, useAuth } from "../lib/auth";
import type { Role } from "../lib/api";

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, ready } = useAuth();
  const router = useRouter();

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

  if (!ready || !user) return null;
  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}

/** Soru işareti — tıklayınca veya üzerine gelince açıklama gösterir */
export function HelpHint({
  text,
  label = "Bu ne demek?",
}: {
  text: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[10px] font-bold leading-none text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        ?
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] p-3 text-xs leading-relaxed text-[var(--ink)] shadow-[var(--shadow-md)]"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  help,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  /** Sayfa hakkında kısa açıklama — ? ikonunda gösterilir */
  help?: string;
}) {
  return (
    <header className="mb-4 flex flex-col gap-2.5 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="attio-eyebrow mb-1.5">{eyebrow}</p>
        ) : null}
        <h1 className="flex flex-wrap items-center gap-1.5 font-display text-xl leading-tight tracking-tight text-[var(--ink)] sm:text-[1.35rem]">
          {title}
          {help ? <HelpHint text={help} label={`${title} hakkında`} /> : null}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-[0.8125rem] leading-snug text-[var(--muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

export function Field({
  label,
  children,
  hint,
  help,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  help?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--ink)]">
        {label}
        {help ? <HelpHint text={help} label={`${label} hakkında`} /> : null}
      </span>
      {children}
      {hint ? <span className="block text-[0.6875rem] leading-snug text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function inputClassName() {
  return "h-8 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 text-[0.8125rem] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/55 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-60";
}

export function btnPrimary() {
  return "inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 text-[0.8125rem] font-medium text-white transition hover:bg-[var(--accent-deep)] active:translate-y-px disabled:opacity-50";
}

export function btnGhost() {
  return "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-50";
}

export function btnSecondary() {
  return "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--panel)] disabled:opacity-50";
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
      className={`attio-surface overflow-hidden ${
        padded ? "p-3.5 sm:p-4" : ""
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
  help,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  step?: string | number;
  help?: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {step != null ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-[var(--brand-soft)] px-1 text-[10px] font-bold text-[var(--brand)]">
              {step}
            </span>
          ) : null}
          <h2 className="flex flex-wrap items-center gap-1.5 font-display text-[0.95rem] tracking-tight text-[var(--ink)] sm:text-base">
            {title}
            {help ? <HelpHint text={help} label={`${title} hakkında`} /> : null}
          </h2>
        </div>
        {description ? (
          <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label mb-1.5">{children}</p>;
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
      className={`rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5 sm:p-3 ${className}`}
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
        className="inline-flex min-w-full gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5 sm:min-w-0"
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
              className={`relative flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left transition sm:px-3 ${
                active
                  ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="block text-[0.8125rem] font-medium leading-tight">
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
    <Panel
      className={
        accent
          ? "border-black/15 bg-gradient-to-br from-[var(--panel)] to-[var(--surface)]"
          : ""
      }
    >
      <p className="section-label">{label}</p>
      <p className="mt-1.5 font-display text-2xl tabular-nums tracking-tight text-[var(--ink)] sm:text-[1.65rem]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[0.6875rem] text-[var(--muted)]">{hint}</p> : null}
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
    success: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]",
    warning: "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]",
    danger: "bg-[var(--accent-soft)] text-[var(--accent-deep)] border-[var(--accent-glow)]",
    info: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Hata bildirimi: marka kırmızısı, sayfa üstünde net görünür. */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3.5 py-3 text-[0.8125rem] leading-snug text-[var(--ink)] shadow-[var(--shadow-sm)]"
    >
      <span aria-hidden="true" className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
        !
      </span>
      <p className="min-w-0">{message}</p>
    </div>
  );
}

/** Başarı bildirimi: nötr yüzey, koyu ✓ işareti. */
export function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-3 text-[0.8125rem] leading-snug text-[var(--ink)] shadow-[var(--shadow-sm)]"
    >
      <span aria-hidden="true" className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-[var(--background)]">
        ✓
      </span>
      <p className="min-w-0">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--surface)] px-3 py-5 text-center">
      <p className="text-[0.8125rem] font-medium text-[var(--ink)]">{title}</p>
      {description ? (
        <p className="mt-0.5 text-[0.6875rem] text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
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
    <div className="w-full space-y-4" aria-busy aria-label="Yükleniyor">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: cards }).map((_, i) => (
          <Panel key={i}>
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2.5 h-6 w-14" />
            <Skeleton className="mt-2 h-2.5 w-24" />
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

/** Panel içinde kullanılan, iç kenarlığı olmayan satır iskeleti. */
export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--line)]" aria-busy aria-label="Yükleniyor">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
