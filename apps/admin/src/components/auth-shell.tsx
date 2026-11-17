import type { ReactNode } from "react";

/**
 * Giriş / kayıt / şifre akışlarının ortak düzeni:
 * solda marka görseli (yalnızca masaüstü), sağda form kartı.
 */
export function AuthShell({
  image,
  asideTitle,
  asideText,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  image: string;
  asideTitle: string;
  asideText: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[var(--background)] lg:grid-cols-[1.1fr_1fr]">
      <aside className="auth-fade relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-[var(--background)]/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="StampWell" className="h-auto w-36" />
          <div className="max-w-sm">
            <p className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{asideTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/80">{asideText}</p>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden" style={{ background: "radial-gradient(ellipse 60% 45% at 50% -10%, rgba(239,35,60,0.18), transparent 70%)" }} />
        <div className="relative w-full max-w-[400px]">
          <div className="auth-rise flex flex-col items-center text-center lg:items-start lg:text-left" style={{ animationDelay: "80ms" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-header.png" alt="StampWell" className="h-auto w-36 lg:hidden" />
            <p className="mt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] lg:mt-0">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-snug text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          <div className="auth-rise mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-7" style={{ animationDelay: "220ms" }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export const authFieldClass =
  "h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3.5 text-[0.9375rem] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-60";

export const authButtonClass =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] text-[0.9375rem] font-semibold text-white shadow-[0_8px_24px_rgba(239,35,60,0.3)] transition hover:bg-[var(--accent-deep)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
