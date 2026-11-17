"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell, authButtonClass, authFieldClass } from "../../components/auth-shell";
import { authPost } from "../../lib/auth-request";

/** E-posta bağlantısıyla (token) şifre sıfırlama — personel/yönetici bağlantıları için. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Bağlantı geçersiz. Yeni bir sıfırlama kodu isteyin.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    setLoading(true);
    const res = await authPost<{ ok: true }>("/auth/reset-password", { token, password });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  return (
    <AuthShell
      image="/login-hero.png"
      asideTitle="Yeni şifrenizi belirleyin."
      asideText="Bağlantı tek kullanımlıktır ve kısa süre geçerlidir."
      eyebrow={done ? "Tamamlandı" : "Şifre sıfırlama"}
      title={done ? "Şifreniz güncellendi" : "Yeni şifre"}
      subtitle={done ? "Yeni şifrenizle giriş yapabilirsiniz." : "En az 8 karakter kullanın."}
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-lg border border-[rgba(239,35,60,0.35)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      {done ? (
        <Link href="/login" className={authButtonClass}>
          Giriş yap
        </Link>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">Yeni şifre</span>
            <input className={authFieldClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={100} required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">Yeni şifre (tekrar)</span>
            <input className={authFieldClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} maxLength={100} required />
          </label>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
