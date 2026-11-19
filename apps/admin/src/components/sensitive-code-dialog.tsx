"use client";

import { useEffect, useState } from "react";
import { api, getStoredUser } from "../lib/api";

export type SensitivePurpose = "PASSWORD_CHANGE" | "ACCOUNT_CANCEL" | "ACCOUNT_DELETE";

const COPY: Record<SensitivePurpose, { title: string; action: string }> = {
  PASSWORD_CHANGE: { title: "Şifre değişikliğini onaylayın", action: "Şifrenizi değiştirmek" },
  ACCOUNT_CANCEL: { title: "Aboneliği iptal etmeyi onaylayın", action: "Aboneliğinizi iptal etmek" },
  ACCOUNT_DELETE: { title: "Hesap silme talebini onaylayın", action: "Hesabınızı silmek" },
};

/**
 * Hassas işlem öncesi e-posta ile gelen 6 haneli kodu ister.
 * Doğrulanınca `onVerified(verificationToken)` çağrılır; işlem o token ile tamamlanır.
 */
export function SensitiveCodeDialog({
  open,
  purpose,
  onVerified,
  onClose,
}: {
  open: boolean;
  purpose: SensitivePurpose;
  onVerified: (verificationToken: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const email = getStoredUser()?.email ?? "";

  useEffect(() => {
    if (!open) return;
    setCode("");
    setError(null);
    setSent(false);
    setBusy(true);
    api("/auth/sensitive/otp/request", { method: "POST", body: JSON.stringify({ purpose }) })
      .then(() => setSent(true))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Kod gönderilemedi"))
      .finally(() => setBusy(false));
  }, [open, purpose]);

  if (!open) return null;

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ verificationToken: string }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, purpose, code: code.trim() }),
      });
      onVerified(res.verificationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod doğrulanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await api("/auth/sensitive/otp/request", { method: "POST", body: JSON.stringify({ purpose }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={COPY[purpose].title} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)]">
        <h2 className="text-base font-semibold text-[var(--ink)]">{COPY[purpose].title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {COPY[purpose].action} için {email || "e-posta adresinize"} gönderilen 6 haneli kodu girin.
        </p>
        {sent ? null : busy ? <p className="mt-3 text-xs text-[var(--muted)]">Kod gönderiliyor…</p> : null}
        <input
          className="mt-4 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-[var(--ink)]"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-label="Doğrulama kodu"
          placeholder="------"
        />
        {error ? <p role="alert" className="mt-2 text-xs text-[var(--accent)]">{error}</p> : null}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => void resend()} disabled={busy} className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-50">
            Kodu yeniden gönder
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[var(--line-strong)] px-3 text-xs font-semibold text-[var(--ink)]">
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void verify()}
              disabled={busy || code.length !== 6}
              className="h-9 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              Onayla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
