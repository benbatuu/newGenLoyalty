"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  RequireAuth,
  SuccessBanner,
  btnPrimary,
  inputClassName,
} from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

type SubStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: SubStatus;
  _count: { customers: number; users: number };
};

const STATUSES: SubStatus[] = ["TRIAL", "ACTIVE", "CANCELLED", "SUSPENDED"];
const STATUS_LABEL: Record<SubStatus, string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  SUSPENDED: "Askıda",
};
const STATUS_STYLE: Record<SubStatus, string> = {
  ACTIVE: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]",
  TRIAL: "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]",
  CANCELLED: "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]",
  SUSPENDED: "bg-[var(--accent-soft)] text-[var(--accent-deep)] border-[var(--accent-glow)]",
};

type Filter = "ALL" | SubStatus;

export default function PlatformSubscriptionsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <SubscriptionsContent />
    </RequireAuth>
  );
}

function SubscriptionsContent() {
  const { data: rows, error: loadError, loading, reload } = useApiQuery<TenantRow[]>(
    "tenants:list",
    "/tenants",
  );
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const list = useMemo(() => rows ?? [], [rows]);

  const summary = useMemo(() => {
    const byStatus: Record<SubStatus, number> = { TRIAL: 0, ACTIVE: 0, CANCELLED: 0, SUSPENDED: 0 };
    let mrr = 0;
    for (const t of list) {
      byStatus[t.subscriptionStatus] += 1;
      if (t.subscriptionStatus === "ACTIVE") mrr += t.planPriceTry;
    }
    return { byStatus, mrr };
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((t) => {
      if (filter !== "ALL" && t.subscriptionStatus !== filter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
    });
  }, [list, filter, query]);

  async function patchStatus(id: string, subscriptionStatus: SubStatus) {
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      await api(`/tenants/${id}`, { method: "PATCH", body: JSON.stringify({ subscriptionStatus }) });
      setOk("Abonelik durumu güncellendi");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !rows) return <ListSkeleton rows={5} />;

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: "ALL", label: "Tümü", count: list.length },
    ...STATUSES.map((s) => ({ key: s as Filter, label: STATUS_LABEL[s], count: summary.byStatus[s] })),
  ];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Abonelikler"
        subtitle="Paket, fiyat ve abonelik durumunu takip edin; durumu buradan değiştirin."
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      {/* Özet */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Toplam kafe" value={list.length} hint="Tüm abonelikler" />
        <Kpi label="Aktif" value={summary.byStatus.ACTIVE} hint="Ödeme yapan" accent />
        <Kpi label="Deneme" value={summary.byStatus.TRIAL} hint="Ücretsiz dönem" />
        <Kpi label="Askıda" value={summary.byStatus.SUSPENDED} hint="Geçici durdurulmuş" />
        <Kpi label="Aylık gelir" value={`₺${summary.mrr.toLocaleString("tr-TR")}`} hint="Aktif abonelikler (MRR)" accent />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
        <div className="space-y-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Abonelik listesi</h2>
              <p className="text-xs text-[var(--muted)]">
                {filtered.length} / {list.length} kayıt
              </p>
            </div>
            <input
              className={inputClassName() + " sm:w-72"}
              placeholder="Kafe veya slug ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key)}
                  className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {c.label}
                  <span className="tabular-nums opacity-70">{c.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Kayıt bulunamadı" description="Filtreyi ya da aramayı değiştirin." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <colgroup>
                <col className="w-[36%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Kafe</th>
                  <th className="px-3 py-3 font-semibold">Abonelik</th>
                  <th className="px-3 py-3 font-semibold">Paket</th>
                  <th className="px-3 py-3 text-right font-semibold">Müşteri</th>
                  <th className="px-6 py-3 text-right font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filtered.map((t) => (
                  <tr key={t.id} className="align-middle transition hover:bg-[var(--surface)]">
                    <td className="px-6 py-3.5">
                      <Link href={`/tenants/${t.id}`} className="block truncate font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                        {t.name}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted)]">/{t.slug}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Pill className={STATUS_STYLE[t.subscriptionStatus]}>{STATUS_LABEL[t.subscriptionStatus]}</Pill>
                        {!t.isActive ? (
                          <Pill className="bg-[var(--surface)] text-[var(--muted)] border-[var(--line-strong)]">Dondurulmuş</Pill>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[var(--ink)]">{t.planCode}</p>
                      <p className="text-xs tabular-nums text-[var(--muted)]">₺{t.planPriceTry}/ay</p>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-[var(--ink)]">{t._count.customers}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <select
                          aria-label="Abonelik durumu"
                          className={inputClassName() + " h-8 w-32 py-1 text-xs"}
                          value={t.subscriptionStatus}
                          disabled={busyId === t.id}
                          onChange={(e) => void patchStatus(t.id, e.target.value as SubStatus)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        {t.subscriptionStatus !== "ACTIVE" ? (
                          <button
                            type="button"
                            className={btnPrimary() + " h-8 px-3 text-xs"}
                            disabled={busyId === t.id}
                            onClick={() => void patchStatus(t.id, "ACTIVE")}
                          >
                            Aktifleştir
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string | number; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-[var(--shadow-sm)] ${accent ? "border-[var(--accent-glow)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel)]"}`}>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
