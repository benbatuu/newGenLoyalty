"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell, authButtonClass, authFieldClass } from "../../components/auth-shell";
import { OtpInput } from "../../components/otp-input";
import {
  authPost,
  type OtpRequestResponse,
  type OtpVerifyResponse,
} from "../../lib/auth-request";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendCode() {
    setError(null);
    setLoading(true);
    const res = await authPost<OtpRequestResponse>("/auth/otp/request", {
      email: email.trim(),
      purpose: "RESET_PASSWORD",
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return false;
    }
    setDevCode(res.data.devCode ?? null);
    setCooldown(60);
    return true;
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (await sendCode()) setStep("code");
  }

  async function onCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await authPost<OtpVerifyResponse>("/auth/otp/verify", {
      email: email.trim(),
      purpose: "RESET_PASSWORD",
      code,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setProof(res.data.verificationToken);
    setStep("password");
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    if (!proof) return;
    setLoading(true);
    const res = await authPost<{ ok: true }>("/auth/reset-password/otp", {
      verificationToken: proof,
      password,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setStep("done");
  }

  const copy: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
    email: {
      eyebrow: "Şifre sıfırlama",
      title: "Şifrenizi mi unuttunuz?",
      subtitle: "Kayıtlı e-posta adresinize 6 haneli bir kod göndereceğiz.",
    },
    code: {
      eyebrow: "Doğrulama",
      title: "Kodu girin",
      subtitle: `${email.trim()} adresine gönderilen 6 haneli kodu girin.`,
    },
    password: {
      eyebrow: "Yeni şifre",
      title: "Yeni şifrenizi belirleyin",
      subtitle: "En az 8 karakter kullanın.",
    },
    done: {
      eyebrow: "Tamamlandı",
      title: "Şifreniz güncellendi",
      subtitle: "Yeni şifrenizle giriş yapabilirsiniz.",
    },
  };

  return (
    <AuthShell
      image="/login-hero.png"
      asideTitle="Hesabınıza geri dönün."
      asideText="Kod e-postanıza gelir ve 10 dakika geçerlidir. Kodu kimseyle paylaşmayın."
      eyebrow={copy[step].eyebrow}
      title={copy[step].title}
      subtitle={copy[step].subtitle}
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-lg border border-[rgba(239,35,60,0.35)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      {step === "email" ? (
        <form onSubmit={onEmail} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">E-posta</span>
            <input className={authFieldClass} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@isletme.com" required />
          </label>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? "Gönderiliyor…" : "Kod gönder"}
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={onCode} className="space-y-5">
          {devCode ? (
            <p className="rounded-lg bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--muted)]">
              Geliştirme kodu: <span className="text-[var(--ink)]">{devCode}</span>
            </p>
          ) : null}
          <OtpInput value={code} onChange={setCode} disabled={loading} />
          <button type="submit" disabled={loading || code.length !== 6} className={authButtonClass}>
            {loading ? "Doğrulanıyor…" : "Doğrula"}
          </button>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <button type="button" onClick={() => setStep("email")} className="hover:text-[var(--ink)]">
              E-postayı değiştir
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={() => void sendCode()}
              className="font-medium text-[var(--ink)] disabled:text-[var(--muted)]"
            >
              {cooldown > 0 ? `Yeniden gönder (${cooldown}s)` : "Kodu yeniden gönder"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "password" ? (
        <form onSubmit={onPassword} className="space-y-4">
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
      ) : null}

      {step === "done" ? (
        <Link href="/login" className={authButtonClass}>
          Giriş yap
        </Link>
      ) : null}

      {step !== "done" ? (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="font-medium text-[var(--ink)] underline underline-offset-2">
            Girişe dön
          </Link>
        </p>
      ) : null}
    </AuthShell>
  );
}
