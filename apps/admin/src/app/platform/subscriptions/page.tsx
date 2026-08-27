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
  StatCard,
  SuccessBanner,
  btnGhost,
  inputClassName,
} from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";
import { bustCache, useApiQuery } from "../../../lib/use-api-query";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  _count: { customers: number; users: number };
};

const STATUSES = ["TRIAL", "ACTIVE", "CANCELLED", "SUSPENDED"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  SUSPENDED: "Askıda",
};

export default function PlatformSubscriptionsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <SubscriptionsContent />
    </RequireAuth>
  );
}

function SubscriptionsContent() {
  const { data: rows, error: loadError, loading, reload } = useApiQuery<
    TenantRow[]
  >("tenants:list", "/tenants", { ttlMs: 20_000 });
  const [filter, setFilter] = useState<"ALL" | (typeof STATUSES)[number]>(
    "ALL",
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const list = rows ?? [];

  const summary = useMemo(() => {
    const byStatus = { TRIAL: 0, ACTIVE: 0, CANCELLED: 0, SUSPENDED: 0 };
    let mrr = 0;
    for (const t of list) {
      byStatus[t.subscriptionStatus] += 1;
      if (t.subscriptionStatus === "ACTIVE") mrr += t.planPriceTry;
    }
    return { byStatus, mrr, total: list.length };
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((t) => {
      if (filter !== "ALL" && t.subscriptionStatus !== filter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
      );
    });
  }, [list, filter, query]);

  async function patchStatus(id: string, subscriptionStatus: string) {
    setError(null);
    setOk(null);
    try {
      await api(`/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ subscriptionStatus }),
      });
      setOk("Abonelik durumu güncellendi");
      bustCache("tenants");
      bustCache("platform");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    }
  }

  if (loading && !rows) {
    return <ListSkeleton rows={5} />;
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Platform"
        title="Abonelikler"
        subtitle="Tüm kafelerin paket, fiyat ve abonelik durumu."
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Toplam" value={summary.total} accent />
        {STATUSES.map((s) => (
          <StatCard
            key={s}
            label={STATUS_LABEL[s]}
            value={summary.byStatus[s]}
            hint={s === "ACTIVE" ? `₺${summary.mrr} MRR` : undefined}
          />
        ))}
      </div>

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader
            title="Abonelik listesi"
            description={`${filtered.length} kayıt gösteriliyor`}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className={inputClassName() + " sm:max-w-xs"}
              placeholder="Kafe veya slug ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={inputClassName() + " w-auto"}
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as typeof filter)
              }
            >
              <option value="ALL">Tüm durumlar</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Kayıt bulunamadı"
              description="Filtreleri değiştir veya yeni kafe oluştur."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {filtered.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--ink)]">{t.name}</p>
                    <Badge tone={t.isActive ? "success" : "warning"}>
                      {t.isActive ? "Açık" : "Dondurulmuş"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    /{t.slug} · {t.planCode} · ₺{t.planPriceTry}/ay ·{" "}
                    {t._count.customers} müşteri
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      t.subscriptionStatus === "ACTIVE" ||
                      t.subscriptionStatus === "TRIAL"
                        ? "success"
                        : t.subscriptionStatus === "SUSPENDED"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {STATUS_LABEL[t.subscriptionStatus]}
                  </Badge>
                  <select
                    className={inputClassName() + " w-auto"}
                    value={t.subscriptionStatus}
                    onChange={(e) =>
                      void patchStatus(t.id, e.target.value)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  {t.subscriptionStatus !== "ACTIVE" && (
                    <button
                      type="button"
                      className={btnGhost()}
                      onClick={() => void patchStatus(t.id, "ACTIVE")}
                    >
                      Aktifleştir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
