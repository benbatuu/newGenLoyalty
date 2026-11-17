"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";
import { getApiUrl } from "@/lib/public-urls";

const PLATFORMS = ["google", "instagram"] as const;
type Platform = (typeof PLATFORMS)[number];

export function SocialClaimForm() {
  const t = useTranslations("socialPage");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState<Platform>("google");
  const [proofUrl, setProofUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const s = slug.trim();
    const p = phone.replace(/\D/g, "");
    if (!s || p.length < 10) {
      setError(t("invalidInput"));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${getApiUrl()}/public/social/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: s,
          phone: p,
          platform,
          proofUrl: proofUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(
          typeof body.message === "string" ? body.message : t("submitFailed"),
        );
        return;
      }
      setSuccess(true);
      setProofUrl("");
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingSurface>
      <h2 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
        {t("formTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t("formBody")}
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-2.5">
        <label className="block">
          <span className="text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {t("slugLabel")}
          </span>
          <input
            className="field-premium field-premium-compact"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t("slugPlaceholder")}
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className="text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {t("phoneLabel")}
          </span>
          <input
            className="field-premium field-premium-compact"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        <label className="block">
          <span className="text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {t("platformLabel")}
          </span>
          <select
            className="field-premium field-premium-compact"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {t(`platforms.${p}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {t("proofUrlLabel")}
          </span>
          <input
            className="field-premium field-premium-compact"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder={t("proofUrlPlaceholder")}
            inputMode="url"
            autoComplete="url"
          />
        </label>
        <Button type="submit" disabled={loading} className="mt-4 w-full sm:w-auto">
          {loading ? t("loading") : t("submit")}
        </Button>
      </form>

      {error ? (
        <p className="mt-4 border-l-2 border-red-400 pl-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 border-l-2 border-primary pl-4 text-sm text-foreground">
          {t("success")}
        </p>
      ) : null}
    </MarketingSurface>
  );
}
