"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/public-urls";
import { HONEYPOT_FIELD, honeypotFilled } from "@/lib/honeypot";

const SECTOR_VALUES = [
  "cafe",
  "specialty",
  "bakery",
  "dessert",
  "restaurant",
  "fastfood",
  "retail",
  "boutique",
  "beauty",
  "gym",
  "other",
] as const;

/** Dark, hairline-bordered field styling shared by inputs, selects and textareas. */
function fieldCls(compact: boolean, extra = "") {
  return cn(
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[#DFE5EB] placeholder:text-[#DFE5EB]/40 transition-colors duration-200 hover:border-white/20 focus:border-[#EF233C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]/40",
    compact ? "py-2.5 text-[0.95rem]" : "py-3.5 text-base",
    extra,
  );
}

const LABEL_CLS = "font-medium tracking-[0.14em] uppercase text-[#DFE5EB]/70";

export function ContactForm({
  compact = false,
  showMessage,
  defaultMessage = "",
  messagePlaceholder,
  onSuccess,
  submitLabel,
  source = "contact",
  variant = "default",
}: {
  compact?: boolean;
  showMessage?: boolean;
  defaultMessage?: string;
  messagePlaceholder?: string;
  onSuccess?: () => void;
  submitLabel?: string;
  source?: string;
  /** suggestion = name/email/message only (program idea) */
  variant?: "default" | "suggestion";
}) {
  const t = useTranslations("contactPage");
  const locale = useLocale();
  const API_URL = getApiUrl();
  const isSuggestion = variant === "suggestion";
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sector, setSector] = useState<string>("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());

    // Client-side honeypot: pretend success without calling API (bots leave)
    if (honeypotFilled(raw[HONEYPOT_FIELD])) {
      setStatus("ok");
      form.reset();
      setSector("");
      if (onSuccess) {
        successTimer.current = setTimeout(() => onSuccess(), 900);
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(raw.name ?? ""),
          cafe: isSuggestion
            ? locale === "tr"
              ? "Program önerisi"
              : "Program suggestion"
            : String(raw.cafe ?? ""),
          email: String(raw.email ?? ""),
          phone: String(raw.phone ?? "") || undefined,
          sector: isSuggestion
            ? undefined
            : raw.sector === "other"
              ? String(raw.sectorOther ?? "").trim() || "other"
              : String(raw.sector ?? "") || undefined,
          message: String(raw.message ?? ""),
          source,
          [HONEYPOT_FIELD]: "",
        }),
      });
      if (res.status === 429) {
        setErrorMsg(t("errorRateLimit"));
        setStatus("err");
        return;
      }
      if (res.status === 413) {
        setErrorMsg(t("error"));
        setStatus("err");
        return;
      }
      if (!res.ok) throw new Error("fail");
      setStatus("ok");
      form.reset();
      setSector("");
      if (onSuccess) {
        successTimer.current = setTimeout(() => onSuccess(), 900);
      }
    } catch {
      setErrorMsg(t("error"));
      setStatus("err");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("relative", compact ? "space-y-2.5" : "space-y-8")}
    >
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <label htmlFor={`hp-${source}`}>
          Fax
          <input
            id={`hp-${source}`}
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      {status === "ok" ? (
        <p className="border-l-2 border-primary pl-4 text-sm text-foreground">
          {t("success")}
        </p>
      ) : null}
      {status === "err" ? (
        <p className="border-l-2 border-red-400 pl-4 text-sm text-red-600">
          {errorMsg ?? t("error")}
        </p>
      ) : null}

      {(
        [
          ["name", "text", t("name"), true],
          ...(isSuggestion
            ? []
            : ([["cafe", "text", t("cafe"), true]] as const)),
          ["email", "email", t("email"), true],
          ["phone", "tel", t("phone"), false],
        ] as const
      ).map(([name, type, label, required]) => (
        <label key={name} className={cn("block", compact && "space-y-0")}>
          <span
            className={cn(
              LABEL_CLS,
              compact ? "text-[0.65rem] leading-none" : "text-[0.7rem]",
            )}
          >
            {label}
          </span>
          <input
            className={fieldCls(compact)}
            name={name}
            type={type}
            required={required}
          />
        </label>
      ))}

      {!isSuggestion ? (
        <label className={cn("block", compact && "space-y-0")}>
          <span
            className={cn(
              LABEL_CLS,
              compact ? "text-[0.65rem] leading-none" : "text-[0.7rem]",
            )}
          >
            {t("sector")}
          </span>
          <span className="relative mt-2 block">
            <select
              className={fieldCls(compact, "appearance-none pr-11 [&>option]:bg-[#1a1c23]")}
              name="sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              required
            >
              <option value="" disabled>
                —
              </option>
              {SECTOR_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`sectors.${value}`)}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#DFE5EB]/60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </span>
          {sector === "other" ? (
            <input
              className={fieldCls(compact, "mt-2")}
              name="sectorOther"
              placeholder={t("sectorOtherPlaceholder")}
              required
              maxLength={80}
            />
          ) : null}
        </label>
      ) : null}

      {!compact || showMessage ? (
        <label className={cn("block", compact && "space-y-0")}>
          <span
            className={cn(
              LABEL_CLS,
              compact ? "text-[0.65rem] leading-none" : "text-[0.7rem]",
            )}
          >
            {t("message")}
          </span>
          <textarea
            className={fieldCls(compact, `resize-y ${compact ? "min-h-[4.5rem]" : "min-h-[7rem]"}`)}
            name="message"
            rows={compact ? 3 : 4}
            required
            defaultValue={defaultMessage}
            placeholder={messagePlaceholder}
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

      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-[#DFE5EB]/75">
          <input
            type="checkbox"
            name="kvkkConsent"
            required
            className="mt-1 size-4 shrink-0 accent-[#D91E33]"
          />
          <span>
            {t("kvkkConsent").split(t("kvkkLink"))[0]}
            <Link href="/kvkk" className="underline underline-offset-4 hover:text-[#DFE5EB]">
              {t("kvkkLink")}
            </Link>
            {t("kvkkConsent").split(t("kvkkLink"))[1] ?? ""}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-[#DFE5EB]/60">
          <input type="checkbox" name="marketingConsent" className="mt-1 size-4 shrink-0 accent-[#D91E33]" />
          <span>{t("marketingConsent")}</span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={status === "sending"}
        size={compact ? "default" : "lg"}
        className="w-full"
      >
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
