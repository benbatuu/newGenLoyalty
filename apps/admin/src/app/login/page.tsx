"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ErrorBanner,
  Field,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { homePathForRole, useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("cashier@demo-kafe.local");
  const [password, setPassword] = useState("Password123!");
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
      router.replace(homePathForRole(next.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 20%, rgba(26,61,46,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(26,61,46,0.08), transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Operasyon paneli
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Dokun &amp; Kazan
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Personel girişi — müşteri uygulaması yok; kart Wallet’ta yaşar.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-lg)] sm:p-7"
        >
          <ErrorBanner message={error} />
          <Field label="E-posta">
            <input
              className={inputClassName()}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Şifre">
            <input
              className={inputClassName()}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <button
            type="submit"
            className={`${btnPrimary()} w-full`}
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
          <p className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-[var(--accent)] hover:underline"
            >
              Şifremi unuttum
            </Link>
          </p>
          <p className="rounded-[var(--radius-sm)] bg-[var(--surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)]">
            Demo: admin@dokunkazan.local · owner@demo-kafe.local ·
            cashier@demo-kafe.local — şifre Password123!
          </p>
        </form>
      </div>
    </div>
  );
}
