"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { homePathForRole, useAuth } from "../../lib/auth";
import { markAccountPassive } from "../../lib/api";

const fieldClass =
  "h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3.5 text-[0.9375rem] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-60";



export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(homePathForRole(user.role));
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const next = await login(email.trim(), password);
      if (sessionStorage.getItem("subscription:needsReactivation")) {
        router.replace("/settings/billing");
      } else {
        router.replace(homePathForRole(next.role));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Giriş başarısız";
      // Hesap pasif / erişim kapalıysa destek sayfasına yönlendir
      if (/pasif|erişim|askıda|dondurul/i.test(message)) {
        markAccountPassive();
        router.replace(`/passive?reason=${encodeURIComponent(message)}`);
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[var(--background)] lg:grid-cols-[1.1fr_1fr]">

      {/* Sol: tam kaplama marka görseli (yalnızca masaüstü) */}
      <aside className="auth-fade relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-hero.png"
          alt="Damga kartı ve kauçuk damga"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-[var(--background)]/40"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="StampWell" className="h-auto w-36" />
          <p className="max-w-sm text-sm leading-relaxed text-[var(--ink)]/80">
            Her ziyaret bir damga. Müşteri kartı Wallet&apos;ta yaşar, personel
            panelden yönetir.
          </p>
        </div>
      </aside>

      {/* Sağ: giriş formu */}
      <main className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 50% -10%, rgba(239,35,60,0.18), transparent 70%)",
          }}
        />

        <div className="relative w-full max-w-[380px]">
          <div className="auth-rise flex flex-col items-center text-center lg:items-start lg:text-left" style={{ animationDelay: "80ms" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-header.png" alt="StampWell" className="h-auto w-36 lg:hidden" />
            <p className="mt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] lg:mt-0">
              Operasyon paneli
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Tekrar hoş geldiniz
            </h1>
            <p className="mt-2 text-sm leading-snug text-[var(--muted)]">
              Hesabınızla devam edin.
            </p>
          </div>

          <form onSubmit={onSubmit} className="auth-rise mt-8 space-y-4" style={{ animationDelay: "220ms" }}>
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-[rgba(239,35,60,0.35)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              >
                {error}
              </div>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--ink)]">
                E-posta
              </span>
              <input
                className={fieldClass}
                type="email"
                autoComplete="username"
                placeholder="ornek@isletme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center justify-between text-sm font-medium text-[var(--ink)]">
                Şifre
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
                >
                  Şifremi unuttum
                </Link>
              </span>
              <input
                className={fieldClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--accent)] text-[0.9375rem] font-semibold text-white shadow-[0_8px_24px_rgba(239,35,60,0.3)] transition hover:bg-[var(--accent-deep)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-10">
                {loading ? "Giriş yapılıyor…" : "Giriş yap"}
              </span>
            </button>
          </form>

        <p className="auth-rise mt-6 text-center text-sm text-[var(--muted)]" style={{ animationDelay: "360ms" }}>
          Hesabınız yok mu?{" "}
          <Link href="/register" className="font-medium text-[var(--ink)] underline underline-offset-2 hover:text-[var(--accent)]">
            Kayıt olun
          </Link>
        </p>
        </div>
      </main>
    </div>
  );
}
