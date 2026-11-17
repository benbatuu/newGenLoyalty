"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MarketingSurface } from "@/components/marketing/MarketingSurface";
import { getApiUrl } from "@/lib/public-urls";

type PortalProgram = {
  programId: string;
  name: string;
  type: string;
  typeLabel: string;
  balance: number;
  balances?: Record<string, number> | null;
  rewardReady?: boolean;
  summary: string;
};

type PortalHistoryItem = {
  type: string;
  amount: number;
  note?: string | null;
  at: string;
};

type PortalStatus = {
  stampCount?: number;
  stampsRequired?: number;
  rewardLabel?: string;
  rewardReady?: boolean;
  tenantName?: string;
  tenantSlug?: string;
  vipTier?: string | null;
  programs?: PortalProgram[];
  history?: PortalHistoryItem[];
};

function formatHistoryDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PortalLookupForm() {
  const t = useTranslations("portalPage");
  const locale = useLocale();
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    const s = slug.trim();
    const p = phone.replace(/\D/g, "");
    if (!s || p.length < 10) {
      setError(t("invalidInput"));
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(`${getApiUrl()}/public/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s, phone: p }),
      });
      if (res.status === 404) {
        setError(t("notActive"));
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(
          typeof body.message === "string" ? body.message : t("queryFailed"),
        );
        return;
      }
      const data = (await res.json()) as PortalStatus;
      setStatus(data);
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  }

  const programs = status?.programs ?? [];
  const history = status?.history ?? [];
  const hasPrograms = programs.length > 0;

  return (
    <MarketingSurface>
      <h2 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
        {t("formTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t("formBody")}
      </p>

      <form onSubmit={(e) => void lookup(e)} className="mt-8 space-y-2.5">
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
        <Button type="submit" disabled={loading} className="mt-4 w-full sm:w-auto">
          {loading ? t("loading") : t("submit")}
        </Button>
      </form>

      {error ? (
        <p className="mt-4 border-l-2 border-red-400 pl-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {status ? (
        <div className="mt-6 border-t border-foreground/[0.08] pt-6">
          {status.tenantName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {status.tenantName}
              {status.vipTier ? ` · ${status.vipTier}` : ""}
            </p>
          ) : null}

          {hasPrograms ? (
            <div className="mt-4 space-y-3">
              <p className="text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                {t("programsTitle")}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {programs.map((program) => (
                  <li
                    key={program.programId}
                    className="rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] p-4"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {program.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {program.typeLabel}
                    </p>
                    <p className="mt-2 stat-number text-2xl tabular-nums">
                      {program.summary}
                    </p>
                    {program.rewardReady ? (
                      <p className="mt-1 text-xs font-medium text-[#ff5a6e]">
                        {t("programRewardReady")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4">
              <p className="mt-2 stat-number text-4xl tabular-nums">
                {status.stampCount ?? 0}
                {status.stampsRequired != null ? ` / ${status.stampsRequired}` : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {status.rewardReady
                  ? t("rewardReady", {
                      reward: status.rewardLabel ? `: ${status.rewardLabel}` : "",
                    })
                  : t("stampCount")}
              </p>
            </div>
          )}

          {history.length > 0 ? (
            <div className="mt-6">
              <p className="text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                {t("historyTitle")}
              </p>
              <ul className="mt-3 divide-y divide-foreground/[0.06]">
                {history.map((item, i) => (
                  <li
                    key={`${item.at}-${i}`}
                    className="flex items-start justify-between gap-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.type}</p>
                      {item.note ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular-nums text-foreground">
                        {item.amount > 0 ? `+${item.amount}` : item.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatHistoryDate(item.at, locale)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </MarketingSurface>
  );
}
