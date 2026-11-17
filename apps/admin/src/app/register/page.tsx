"use client";

import Link from "next/link";
import { Suspense, FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell, authButtonClass, authFieldClass } from "../../components/auth-shell";
import { OtpInput } from "../../components/otp-input";
import {
  authPost,
  type OtpRequestResponse,
  type OtpVerifyResponse,
} from "../../lib/auth-request";
import { getApiUrl } from "../../lib/public-urls";

type PlanOption = { code: string; labelTr?: string; priceTry?: number };

/** Web fiyatlandırma sayfasındaki paket adları (kaynak: apps/web messages). */
const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  business: "Business",
};
const FALLBACK_PLANS: PlanOption[] = Object.keys(PLAN_NAMES).map((code) => ({ code }));

type Step = "details" | "code" | "done";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterFlow />
    </Suspense>
  );
}

function RegisterFlow() {
  const search = useSearchParams();
  const planFromUrl = search.get("plan")?.trim() ?? "";
  const billing = search.get("billing") === "yearly" ? "yearly" : "monthly";

  const [plans, setPlans] = useState<PlanOption[]>(FALLBACK_PLANS);
  const [step, setStep] = useState<Step>("details");
  const [planCode, setPlanCode] = useState(planFromUrl);
  const [cafeName, setCafeName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/public/plans`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setPlans(data as PlanOption[]);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (planFromUrl) setPlanCode(planFromUrl);
  }, [planFromUrl]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const selected = useMemo(() => plans.find((p) => p.code === planCode) ?? null, [plans, planCode]);
  const planUnknown = planCode !== "" && !selected;

  async function sendCode() {
    setError(null);
    setLoading(true);
    const res = await authPost<OtpRequestResponse>("/auth/otp/request", {
      email: ownerEmail.trim(),
      purpose: "REGISTER",
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

  async function onDetails(e: FormEvent) {
    e.preventDefault();
    if (!planCode || planUnknown) {
      setError("Lütfen bir paket seçin.");
      return;
    }
    if (await sendCode()) {
      setCode("");
      setStep("code");
    }
  }

  async function onCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const verified = await authPost<OtpVerifyResponse>("/auth/otp/verify", {
      email: ownerEmail.trim(),
      purpose: "REGISTER",
      code,
    });
    if (!verified.ok) {
      setLoading(false);
      setError(verified.message);
      return;
    }
    const signup = await authPost<{ ok: true }>("/public/signup", {
      cafeName: cafeName.trim(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      ownerPassword,
      planCode,
      verificationToken: verified.data.verificationToken,
    });
    setLoading(false);
    if (!signup.ok) {
      setError(signup.message);
      return;
    }
    setStep("done");
  }

  const copy: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
    details: {
      eyebrow: "14 gün ücretsiz deneme",
      title: "İşletmenizi oluşturun",
      subtitle: "Kredi kartı gerekmez. Deneme bitince paketinizi seçip etkinleştirirsiniz.",
    },
    code: {
      eyebrow: "E-posta doğrulama",
      title: "Kodu girin",
      subtitle: `${ownerEmail.trim()} adresine gönderilen 6 haneli kodu girin.`,
    },
    done: {
      eyebrow: "Hesabınız hazır",
      title: "14 gün başladı",
      subtitle: `${ownerEmail.trim()} ile giriş yapıp kurulumu tamamlayabilirsiniz.`,
    },
  };

  return (
    <AuthShell
      image="/register-hero.png"
      asideTitle="14 gün, kredi kartı yok."
      asideText="Hesabınızı açın, damga kartınızı kurun. Deneme bitince paketinizi seçersiniz."
      eyebrow={copy[step].eyebrow}
      title={copy[step].title}
      subtitle={copy[step].subtitle}
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-lg border border-[rgba(239,35,60,0.35)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      {step === "details" ? (
        <form onSubmit={onDetails} className="space-y-4">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
            <label className="block space-y-1.5">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Seçilen paket</span>
              <select className={authFieldClass} value={planCode} onChange={(e) => setPlanCode(e.target.value)} required>
                <option value="" disabled>Paket seçin</option>
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>{PLAN_NAMES[p.code] ?? p.labelTr ?? p.code}</option>
                ))}
              </select>
            </label>
            {selected && typeof selected.priceTry === "number" ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {selected.priceTry.toLocaleString("tr-TR")} ₺ / {billing === "yearly" ? "yıl" : "ay"} sonrası
              </p>
            ) : null}
            {planUnknown ? (
              <p className="mt-2 text-xs text-[var(--accent)]">Bu paket artık geçerli değil. Lütfen listeden seçin.</p>
            ) : null}
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">İşletme adı</span>
            <input className={authFieldClass} value={cafeName} onChange={(e) => setCafeName(e.target.value)} minLength={2} maxLength={120} required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">Ad soyad</span>
            <input className={authFieldClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">E-posta</span>
            <input className={authFieldClass} type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} autoComplete="email" placeholder="ornek@isletme.com" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">Şifre</span>
            <input className={authFieldClass} type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} minLength={8} maxLength={100} autoComplete="new-password" placeholder="En az 8 karakter" required />
          </label>

          <button type="submit" disabled={loading || planUnknown || !planCode} className={authButtonClass}>
            {loading ? "Kod gönderiliyor…" : "Doğrulama kodu gönder"}
          </button>
          <p className="text-center text-xs text-[var(--muted)]">
            Hesabınız varsa{" "}
            <Link href="/login" className="font-medium text-[var(--ink)] underline underline-offset-2">giriş yapın</Link>.
          </p>
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
            {loading ? "Hesap oluşturuluyor…" : "Doğrula ve başla"}
          </button>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <button type="button" onClick={() => setStep("details")} className="hover:text-[var(--ink)]">
              Bilgileri düzenle
            </button>
            <button type="button" disabled={cooldown > 0 || loading} onClick={() => void sendCode()} className="font-medium text-[var(--ink)] disabled:text-[var(--muted)]">
              {cooldown > 0 ? `Yeniden gönder (${cooldown}s)` : "Kodu yeniden gönder"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "done" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Deneme süreniz şimdi başladı. Giriş yaptıktan sonra damga kartınızı kurabilirsiniz.
          </p>
          <Link href="/login" className={authButtonClass}>
            Giriş yap
          </Link>
        </div>
      ) : null}
    </AuthShell>
  );
}
