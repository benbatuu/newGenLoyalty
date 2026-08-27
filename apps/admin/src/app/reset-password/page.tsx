"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ErrorBanner,
  Field,
  SuccessBanner,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError } from "../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Yükleniyor…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!token) {
      setError("Geçersiz bağlantı — token yok");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        let message = "Sıfırlama başarısız";
        try {
          const body = (await res.json()) as { message?: string | string[] };
          if (Array.isArray(body.message)) message = body.message.join(", ");
          else if (body.message) message = body.message;
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, message);
      }
      setOk("Şifre güncellendi. Giriş sayfasına yönlendiriliyorsun…");
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sıfırlama başarısız");
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
          Hesap
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Yeni şifre
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          En az 8 karakter; bağlantı 2 saat geçerlidir.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-lg)] sm:p-7"
        >
          <ErrorBanner message={error} />
          <SuccessBanner message={ok} />
          {!token ? (
            <p className="text-sm text-red-600">
              Bağlantıda token yok. Şifremi unuttum akışından yeniden dene.
            </p>
          ) : null}
          <Field label="Yeni şifre">
            <input
              className={inputClassName()}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field label="Şifre tekrar">
            <input
              className={inputClassName()}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <button
            type="submit"
            className={`${btnPrimary()} w-full`}
            disabled={loading || !token}
          >
            {loading ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </button>
          <p className="text-center text-sm text-[var(--muted)]">
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              ← Girişe dön
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
