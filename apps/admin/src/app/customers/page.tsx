"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  inputClassName,
} from "../../components/ui";
import { ApiError, api, apiDownload } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

const PAGE_SIZE = 20;

const MONTHS = [
  "",
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

type CustomerRow = {
  id: string;
  phone: string;
  displayName: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  stampCount: number;
  rewardReady: boolean;
  hasWallet: boolean;
  consentAt: string | null;
  createdAt: string;
  updatedAt: string;
  ledgerCount: number;
};

type Directory = {
  stampsRequired: number;
  rewardLabel: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  customers: CustomerRow[];
};

type Filter = "all" | "ready" | "wallet";

function formatPhone(phone: string) {
  return phone.startsWith("0") ? phone : `0${phone}`;
}

function formatBirthday(month: number | null, day: number | null) {
  if (!month || !day) return null;
  return `${day} ${MONTHS[month] ?? month}`;
}

function initials(name: string | null, phone: string) {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return formatPhone(phone).slice(-2);
}

export default function CustomersPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <CustomersContent />
    </RequireAuth>
  );
}

function CustomersContent() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const path =
    `/stamps/customers/directory?filter=${filter}&take=${PAGE_SIZE}&page=${page}` +
    (query ? `&q=${encodeURIComponent(query)}` : "");

  const { data, error, loading, refreshing, reload } = useApiQuery<Directory>(
    `customers:directory:${filter}:${query}:${page}`,
    path,
    { ttlMs: 20_000 },
  );

  const search = useCallback((e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(q.trim());
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length >= 2 || q.trim().length === 0) {
        setPage(1);
        setQuery(q.trim());
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  async function exportAllCsv() {
    setExporting(true);
    setActionError(null);
    setActionOk(null);
    try {
      await apiDownload("/stamps/customers/export.csv", "customers.csv");
      setActionOk("Müşteri listesi indirildi");
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "CSV indirilemedi",
      );
    } finally {
      setExporting(false);
    }
  }

  async function exportOne(customerId: string, phone: string) {
    setBusyId(customerId);
    setActionError(null);
    setActionOk(null);
    try {
      const payload = await api<unknown>(
        `/stamps/customers/${customerId}/export`,
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer-${phone}-kvkk.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setActionOk("KVKK veri paketi indirildi");
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Veri export başarısız",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOne(customerId: string, label: string) {
    if (
      !window.confirm(
        `${label} kaydını silmek istediğine emin misin? Damga geçmişi ve Wallet pass’leri de silinir (KVKK).`,
      )
    ) {
      return;
    }
    setBusyId(customerId);
    setActionError(null);
    setActionOk(null);
    try {
      await api(`/stamps/customers/${customerId}`, { method: "DELETE" });
      setActionOk("Müşteri silindi");
      bustCache("customers");
      bustCache("metrics");
      bustCache("reports");
      await reload(true);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Silme başarısız",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return <FormSkeleton rows={2} />;
  }

  const list = data?.customers ?? [];
  const stampsRequired = data?.stampsRequired ?? 10;
  const total = data?.total ?? list.length;
  const totalPages = data?.totalPages ?? 1;
  const readyOnPage = list.filter((c) => c.rewardReady).length;
  const walletOnPage = list.filter((c) => c.hasWallet).length;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Müşteriler"
        title="Müşteri listesi"
        subtitle="İsim, telefon, damga ve Wallet durumunu tek bakışta gör."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnGhost()}
              disabled={exporting}
              onClick={() => void exportAllCsv()}
            >
              {exporting ? "İndiriliyor…" : "CSV indir"}
            </button>
            <Link href="/counter" className={btnGhost()}>
              Tezgâha git
            </Link>
          </div>
        }
      />
      <ErrorBanner message={error || actionError} />
      <SuccessBanner message={actionOk} />

      <div className="grid gap-3 sm:grid-cols-4">
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Toplam
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {total}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Ödül hazır
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {filter === "ready" ? total : readyOnPage}
            {filter !== "ready" ? (
              <span className="ml-1 text-sm font-normal text-[var(--muted)]">
                (sayfa)
              </span>
            ) : null}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Wallet’ta
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {filter === "wallet" ? total : walletOnPage}
            {filter !== "wallet" ? (
              <span className="ml-1 text-sm font-normal text-[var(--muted)]">
                (sayfa)
              </span>
            ) : null}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Ödül kuralı
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">
            {stampsRequired} damga → {data?.rewardLabel || "—"}
          </p>
        </SoftBox>
      </div>

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form onSubmit={search} className="min-w-0 flex-1">
            <Field label="Ara">
              <input
                className={inputClassName()}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="İsim veya telefon…"
              />
            </Field>
          </form>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Tümü"],
                ["ready", "Ödül hazır"],
                ["wallet", "Wallet’ta"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  filter === id
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={btnGhost()}
              disabled={refreshing}
              onClick={() => void reload(true)}
            >
              {refreshing ? "…" : "Yenile"}
            </button>
          </div>
        </div>
      </Panel>

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader
            title="Kayıtlar"
            description={
              query
                ? `"${query}" · ${total} sonuç`
                : `${total} müşteri · sayfa ${page}/${totalPages}`
            }
          />
        </div>
        {list.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Müşteri bulunamadı"
              description={
                filter === "ready"
                  ? "Ödül hazır müşteri yok."
                  : filter === "wallet"
                    ? "Henüz Wallet’a eklenmiş müşteri yok."
                    : "Arama kriterlerini değiştir veya tezgâhtan yeni kayıt ekle."
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-[var(--line)] lg:hidden">
              {list.map((c) => (
                <CustomerCard
                  key={c.id}
                  c={c}
                  stampsRequired={stampsRequired}
                  busy={busyId === c.id}
                  onExport={() => void exportOne(c.id, c.phone)}
                  onDelete={() =>
                    void deleteOne(
                      c.id,
                      c.displayName?.trim() || formatPhone(c.phone),
                    )
                  }
                />
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-5 py-3 font-semibold sm:px-6">Müşteri</th>
                    <th className="px-3 py-3 font-semibold">Damga</th>
                    <th className="px-3 py-3 font-semibold">Durum</th>
                    <th className="px-3 py-3 font-semibold">Doğum günü</th>
                    <th className="px-3 py-3 font-semibold">Son işlem</th>
                    <th className="px-5 py-3 font-semibold sm:px-6">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {list.map((c) => {
                    const bday = formatBirthday(c.birthMonth, c.birthDay);
                    const pct = Math.min(
                      100,
                      Math.round((c.stampCount / stampsRequired) * 100),
                    );
                    const label = c.displayName?.trim() || formatPhone(c.phone);
                    return (
                      <tr key={c.id} className="hover:bg-[var(--surface)]/60">
                        <td className="px-5 py-3.5 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                              {initials(c.displayName, c.phone)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--ink)]">
                                {c.displayName?.trim() || "İsimsiz"}
                              </p>
                              <p className="tabular-nums text-xs text-[var(--muted)]">
                                {formatPhone(c.phone)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="w-28">
                            <div className="mb-1 flex justify-between text-xs tabular-nums">
                              <span>
                                {c.stampCount}/{stampsRequired}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                              <div
                                className={`h-full rounded-full ${
                                  c.rewardReady
                                    ? "bg-emerald-500"
                                    : "bg-[var(--accent)]"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {c.rewardReady ? (
                              <Badge tone="success">Ödül hazır</Badge>
                            ) : (
                              <Badge tone="neutral">Devam</Badge>
                            )}
                            {c.hasWallet ? (
                              <Badge tone="info">Wallet</Badge>
                            ) : (
                              <Badge tone="neutral">Kart yok</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-[var(--muted)]">
                          {bday ?? "—"}
                        </td>
                        <td className="px-3 py-3.5 text-xs text-[var(--muted)]">
                          {new Date(c.updatedAt).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <span className="ml-1 opacity-70">
                            · {c.ledgerCount} hareket
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right sm:px-6">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/counter?phone=${encodeURIComponent(c.phone)}`}
                              className="text-xs font-medium text-[var(--accent)] hover:underline"
                            >
                              Tezgâh
                            </Link>
                            <button
                              type="button"
                              className="text-xs font-medium text-[var(--muted)] hover:underline"
                              disabled={busyId === c.id}
                              onClick={() => void exportOne(c.id, c.phone)}
                            >
                              KVKK
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:underline"
                              disabled={busyId === c.id}
                              onClick={() => void deleteOne(c.id, label)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3 sm:px-6">
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={page <= 1 || refreshing}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Önceki
                </button>
                <p className="text-xs text-[var(--muted)]">
                  {page} / {totalPages}
                </p>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={page >= totalPages || refreshing}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki →
                </button>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}

function CustomerCard({
  c,
  stampsRequired,
  busy,
  onExport,
  onDelete,
}: {
  c: CustomerRow;
  stampsRequired: number;
  busy?: boolean;
  onExport: () => void;
  onDelete: () => void;
}) {
  const bday = formatBirthday(c.birthMonth, c.birthDay);
  const pct = Math.min(100, Math.round((c.stampCount / stampsRequired) * 100));
  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
          {initials(c.displayName, c.phone)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--ink)]">
                {c.displayName?.trim() || "İsimsiz"}
              </p>
              <p className="tabular-nums text-xs text-[var(--muted)]">
                {formatPhone(c.phone)}
                {bday ? ` · ${bday}` : ""}
              </p>
            </div>
            <Link
              href={`/counter?phone=${encodeURIComponent(c.phone)}`}
              className="shrink-0 text-xs font-medium text-[var(--accent)]"
            >
              Tezgâh
            </Link>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {c.rewardReady ? (
              <Badge tone="success">Ödül hazır</Badge>
            ) : (
              <Badge tone="neutral">
                {c.stampCount}/{stampsRequired}
              </Badge>
            )}
            {c.hasWallet ? (
              <Badge tone="info">Wallet</Badge>
            ) : (
              <Badge tone="neutral">Kart yok</Badge>
            )}
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className={`h-full rounded-full ${
                c.rewardReady ? "bg-emerald-500" : "bg-[var(--accent)]"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="text-xs font-medium text-[var(--muted)]"
              disabled={busy}
              onClick={onExport}
            >
              KVKK export
            </button>
            <button
              type="button"
              className="text-xs font-medium text-red-600"
              disabled={busy}
              onClick={onDelete}
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
