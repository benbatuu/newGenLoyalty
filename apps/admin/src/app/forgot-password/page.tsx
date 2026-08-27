"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ErrorBanner,
  Field,
  SuccessBanner,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError } from "../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setResetUrl(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        let message = "İstek başarısız";
        try {
          const body = (await res.json()) as { message?: string | string[] };
          if (Array.isArray(body.message)) message = body.message.join(", ");
          else if (body.message) message = body.message;
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, message);
      }
      const data = (await res.json()) as { ok: true; resetUrl?: string };
      setOk(
        "E-posta kayıtlıysa sıfırlama bağlantısı oluşturuldu. Pilot ortamda bağlantı aşağıda görünür.",
      );
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İstek başarısız");
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
          Şifremi unuttum
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Kayıtlı e-posta adresine sıfırlama bağlantısı üretilir.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow-lg)] sm:p-7"
        >
          <ErrorBanner message={error} />
          <SuccessBanner message={ok} />
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
          {resetUrl ? (
            <p className="break-all rounded-[var(--radius-sm)] bg-[var(--surface)] px-3 py-2 text-xs leading-relaxed text-[var(--ink)]">
              <a href={resetUrl} className="text-[var(--accent)] underline">
                {resetUrl}
              </a>
            </p>
          ) : null}
          <button
            type="submit"
            className={`${btnPrimary()} w-full`}
            disabled={loading}
          >
            {loading ? "Gönderiliyor…" : "Sıfırlama bağlantısı al"}
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
