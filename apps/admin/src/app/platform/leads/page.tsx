"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  inputClassName,
} from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";
import { bustCache, useApiQuery } from "../../../lib/use-api-query";

type Lead = {
  id: string;
  name: string;
  cafe: string;
  email: string;
  phone: string | null;
  sector: string | null;
  message: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

type LeadsResponse = { total: number; items: Lead[] };

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  NEW: "Yeni",
  CONTACTED: "İletişimde",
  CONVERTED: "Dönüştü",
  CLOSED: "Kapalı",
};

export default function PlatformLeadsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <LeadsContent />
    </RequireAuth>
  );
}

function LeadsContent() {
  const [status, setStatus] = useState<"ALL" | (typeof STATUSES)[number]>("ALL");
  const path =
    status === "ALL"
      ? "/public/leads"
      : `/public/leads?status=${encodeURIComponent(status)}`;
  const { data, error: loadError, loading, reload } = useApiQuery<LeadsResponse>(
    `leads:${status}`,
    path,
    { ttlMs: 15_000 },
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.cafe.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q),
    );
  }, [items, query]);

  async function patchStatus(id: string, next: string) {
    setError(null);
    setOk(null);
    try {
      await api(`/public/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setOk("Durum güncellendi");
      bustCache("leads");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    }
  }

  if (loading && !data) {
    return <ListSkeleton rows={5} />;
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Platform"
        title="İletişim talepleri"
        subtitle="Marketing formundan gelen lead’ler ve self-serve kayıtlar."
        actions={
          <button
            type="button"
            className={btnGhost()}
            onClick={() => void reload(true)}
          >
            Yenile
          </button>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <div className="grid gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <SoftBox key={s}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {STATUS_LABEL[s]}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
              {items.filter((i) => i.status === s).length}
            </p>
          </SoftBox>
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Ara
            </span>
            <input
              className={inputClassName()}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İsim, kafe, e-posta…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus("ALL")}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                status === "ALL"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              Tümü ({data?.total ?? items.length})
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  status === s
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader
            title="Talepler"
            description={`${filtered.length} kayıt`}
          />
        </div>
        {filtered.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Lead yok"
              description="İletişim formu veya kayıt sayfasından gelenler burada listelenir."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {filtered.map((l) => (
              <li key={l.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--ink)]">{l.cafe}</p>
                      <Badge
                        tone={
                          l.status === "NEW"
                            ? "warning"
                            : l.status === "CONVERTED"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {STATUS_LABEL[l.status as (typeof STATUSES)[number]] ??
                          l.status}
                      </Badge>
                      <Badge tone="neutral">{l.source}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {l.name} · {l.email}
                      {l.phone ? ` · ${l.phone}` : ""}
                      {l.sector ? ` · ${l.sector}` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
                      {l.message}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      {new Date(l.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <select
                    className={`${inputClassName()} w-full max-w-[180px]`}
                    value={l.status}
                    onChange={(e) => void patchStatus(l.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
