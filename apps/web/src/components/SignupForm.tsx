"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/public-urls";
import { HONEYPOT_FIELD, honeypotFilled } from "@/lib/honeypot";

export function SignupForm({ adminUrl }: { adminUrl: string }) {
  const API_URL = getApiUrl();
  const locale = useLocale();
  const tr = locale === "tr";
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cafe: string;
    slug: string;
    email: string;
  } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());

    // Never show a fake “account ready” if honeypot was filled (autofill / bot)
    if (honeypotFilled(raw[HONEYPOT_FIELD])) {
      setError(
        tr
          ? "Kayıt tamamlanamadı, lütfen tekrar deneyin."
          : "Sign-up couldn’t complete. Please try again.",
      );
      setStatus("err");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/public/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeName: String(raw.cafeName ?? ""),
          slug: String(raw.slug ?? "").trim() || undefined,
          ownerName: String(raw.ownerName ?? ""),
          ownerEmail: String(raw.ownerEmail ?? ""),
          ownerPassword: String(raw.ownerPassword ?? ""),
          [HONEYPOT_FIELD]: "",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
        discarded?: boolean;
        tenant?: { id?: string; name: string; slug: string };
        owner?: { email: string };
      };

      if (res.status === 429) {
        throw new Error(
          tr
            ? "Çok fazla istek. Biraz bekleyip tekrar deneyin."
            : "Too many requests. Please wait a moment and try again.",
        );
      }

      if (!res.ok) {
        const msg = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message ||
            (tr ? "Kayıt başarısız" : "Sign-up failed");
        throw new Error(msg);
      }

      if (body.discarded || !body.tenant?.id || body.tenant.id === "ok") {
        throw new Error(
          tr
            ? "Kayıt tamamlanamadı, lütfen tekrar deneyin."
            : "Sign-up couldn’t complete. Please try again.",
        );
      }

      setResult({
        cafe: body.tenant?.name ?? String(raw.cafeName),
        slug: body.tenant?.slug ?? "",
        email: body.owner?.email ?? String(raw.ownerEmail),
      });
      setStatus("ok");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setStatus("err");
    }
  }

  if (status === "ok" && result) {
    return (
      <div className="space-y-6 border-l-2 border-primary pl-5">
        <p className="text-lg text-foreground">
          {tr
            ? `${result.cafe} hesabı hazır. 14 günlük deneme başladı.`
            : `${result.cafe} is ready. Your 14-day trial has started.`}
        </p>
        <p className="text-sm text-muted-foreground">
          {tr ? "Giriş e-postası:" : "Login email:"}{" "}
          <span className="text-foreground">{result.email}</span>
          {result.slug ? (
            <>
              <br />
              slug: <span className="text-foreground">/{result.slug}</span>
            </>
          ) : null}
        </p>
        {adminUrl ? (
          <Button asChild size="lg">
            <a href={adminUrl} rel="noopener noreferrer">
              <span className="relative z-10">
                {tr ? "Admin paneline git" : "Go to admin panel"}
              </span>
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tr
              ? "Giriş için size gönderilen admin panel bağlantısını kullanın."
              : "Use the admin panel link we sent you to sign in."}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-6">
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <label htmlFor="hp-signup">
          Fax
          <input
            id="hp-signup"
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      {status === "err" && error ? (
        <p className="border-l-2 border-red-400 pl-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {(
        [
          ["cafeName", "text", tr ? "Kafe adı" : "Café name", true],
          ["slug", "text", tr ? "Slug (opsiyonel)" : "Slug (optional)", false],
          ["ownerName", "text", tr ? "Yetkili adı" : "Owner name", true],
          ["ownerEmail", "email", tr ? "İş e-postası" : "Work email", true],
          [
            "ownerPassword",
            "password",
            tr ? "Şifre (min 8)" : "Password (min 8)",
            true,
          ],
        ] as const
      ).map(([name, type, label, required]) => (
        <label key={name} className="block">
          <span className="text-[0.7rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {label}
          </span>
          <input
            className="field-premium"
            name={name}
            type={type}
            required={required}
            minLength={name === "ownerPassword" ? 8 : undefined}
            autoComplete={
              name === "ownerPassword"
                ? "new-password"
                : name === "ownerEmail"
                  ? "email"
                  : "organization"
            }
          />
        </label>
      ))}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {tr
          ? "Kayıt ile deneme hesabı açılır. Ödeme yok — abonelik sonra."
          : "Creates a trial account. No payment — billing comes later."}{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          {tr ? "KVKK" : "Privacy"}
        </Link>
      </p>

      <Button type="submit" disabled={status === "sending"} size="lg" className="w-full">
        <span className="relative z-10">
          {status === "sending"
            ? tr
              ? "Oluşturuluyor…"
              : "Creating…"
            : tr
              ? "Deneme hesabı aç"
              : "Start free trial"}
        </span>
      </Button>
    </form>
  );
}
