"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/public-urls";

export function ContactForm({
  compact = false,
  onSuccess,
  submitLabel,
  source = "contact",
}: {
  compact?: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
  source?: string;
}) {
  const t = useTranslations("contactPage");
  const locale = useLocale();
  const API_URL = getApiUrl();
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(`${API_URL}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(raw.name ?? ""),
          cafe: String(raw.cafe ?? ""),
          email: String(raw.email ?? ""),
          phone: String(raw.phone ?? "") || undefined,
          sector: String(raw.sector ?? "") || undefined,
          message: String(raw.message ?? ""),
          source,
        }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("ok");
      form.reset();
      if (onSuccess) {
        window.setTimeout(() => onSuccess(), 900);
      }
    } catch {
      setStatus("err");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(compact ? "space-y-5" : "space-y-8")}
    >
      {status === "ok" ? (
        <p className="border-l-2 border-[var(--brass)] pl-4 text-sm font-light text-[var(--ink)]">
          {t("success")}
        </p>
      ) : null}
      {status === "err" ? (
        <p className="border-l-2 border-red-400 pl-4 text-sm text-red-300">
          {t("error")}
        </p>
      ) : null}

      {(
        [
          ["name", "text", t("name")],
          ["cafe", "text", t("cafe")],
          ["email", "email", t("email")],
          ["phone", "tel", t("phone")],
        ] as const
      ).map(([name, type, label]) => (
        <label key={name} className="block">
          <span className="text-[0.7rem] font-medium tracking-[0.14em] uppercase text-[var(--muted)]">
            {label}
          </span>
          <input
            className="field-premium"
            name={name}
            type={type}
            required={name !== "phone"}
          />
        </label>
      ))}

      <label className="block">
        <span className="text-[0.7rem] font-medium tracking-[0.14em] uppercase text-[var(--muted)]">
          {t("sector")}
        </span>
        <select className="field-premium" name="sector" defaultValue="">
          <option value="" disabled>
            —
          </option>
          <option value="cafe">Café</option>
          <option value="specialty">Specialty / coffee bar</option>
          <option value="bakery">Bakery / pastry</option>
          <option value="dessert">Ice cream / dessert</option>
          <option value="other">Other</option>
        </select>
      </label>

      {!compact ? (
        <label className="block">
          <span className="text-[0.7rem] font-medium tracking-[0.14em] uppercase text-[var(--muted)]">
            {t("message")}
          </span>
          <textarea
            className="field-premium min-h-[7rem] resize-y"
            name="message"
            rows={4}
            required
          />
        </label>
      ) : (
        <input
          type="hidden"
          name="message"
          value={
            locale === "tr" ? "Demo talebi (modal)" : "Demo request (modal)"
          }
        />
      )}

      <Button type="submit" disabled={status === "sending"} size="lg" className="w-full">
        <span className="relative z-10 inline-flex items-center gap-2">
          {status === "sending" ? t("sending") : submitLabel ?? t("submit")}
          {status !== "sending" ? (
            <span className="btn-arrow" aria-hidden>
              →
            </span>
          ) : null}
        </span>
      </Button>
    </form>
  );
}
