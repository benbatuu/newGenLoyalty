"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  inputClassName,
} from "../../components/ui";
import { ApiError, api, apiDownload } from "../../lib/api";
import { displayPhone } from "../../lib/pii-display";
import { useApiQuery } from "../../lib/use-api-query";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { ConfirmDialog } from "../../components/confirm-dialog";

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
  /** Arama/filtreden bağımsız, tüm müşteriler için sayılar */
  summary?: { all: number; ready: number; wallet: number };
  customers: CustomerRow[];
};

type Filter = "all" | "ready" | "wallet";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "ready", label: "Ödül hazır" },
  { id: "wallet", label: "Kartı telefonunda" },
];

function formatBirthday(month: number | null, day: number | null) {
  if (!month || !day) return null;
  return `${day} ${MONTHS[month] ?? month}`;
}

function nameOf(c: CustomerRow) {
  return c.displayName?.trim() || "İsimsiz müşteri";
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
  if (phone.includes("**")) return phone.trim().split(/\s+/).pop() ?? "??";
  return displayPhone(phone).slice(-2);
}

function lastSeen(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
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
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailPhone, setDetailPhone] = useState<string | null>(null);

  const path =
    `/stamps/customers/directory?filter=${filter}&take=${PAGE_SIZE}&page=${page}` +
    (query ? `&q=${encodeURIComponent(query)}` : "");

  const { data, error, loading, refreshing, reload } = useApiQuery<Directory>(
    `customers:directory:${filter}:${query}:${page}`,
    path,
  );

  // Arama: yazarken 350 ms sonra uygulanır. Tek harfte istek atılmaz.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next.length === 1) return;
      setPage(1);
      setQuery(next);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!actionOk) return;
    const t = setTimeout(() => setActionOk(null), 4000);
    return () => clearTimeout(t);
  }, [actionOk]);

  function pickFilter(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  function clearSearch() {
    setQ("");
    setQuery("");
    setPage(1);
  }

  async function exportAllCsv() {
    setExporting(true);
    setActionError(null);
    try {
      await apiDownload("/stamps/customers/export.csv", "customers.csv");
      setActionOk("Müşteri listesi indirildi");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Liste indirilemedi");
    } finally {
      setExporting(false);
    }
  }

  async function exportOne(customerId: string, phone: string) {
    setBusyId(customerId);
    setActionError(null);
    try {
      const payload = await api<unknown>(`/stamps/customers/${customerId}/export`);
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
      setActionOk("Müşterinin verisi indirildi");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Veri indirilemedi");
    } finally {
      setBusyId(null);
    }
  }

  /** Silme önce uygulama içi onay penceresini açar */
  function deleteOne(customerId: string, label: string) {
    setPendingDelete({ id: customerId, label });
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    const customerId = target.id;
    setPendingDelete(null);
    setBusyId(customerId);
    setActionError(null);
    try {
      await api(`/stamps/customers/${customerId}`, { method: "DELETE" });
      setActionOk("Müşteri silindi");
      await reload(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Silinemedi. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  const list = data?.customers ?? [];
  const stampsRequired = data?.stampsRequired ?? 10;
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const summary = data?.summary;
  const firstLoad = loading && !data;
  const searching = query.length > 0;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Müşteriler"
        title="Müşterilerim"
        subtitle="Müşterilerinizi bulun ve her birinin durumunu görün."
        help="Ödül hazır olan müşteriler kasada ödülünü alabilir. Kartı telefonunda olanlar her damgayı anında görür."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnGhost()}
              disabled={exporting}
              onClick={() => void exportAllCsv()}
            >
              {exporting ? "İndiriliyor…" : "Listeyi indir"}
            </button>
            <Link href="/counter" className={btnGhost()}>
              Kasaya git
            </Link>
          </div>
        }
      />

      <div aria-live="polite">
        <ErrorBanner message={error || actionError} />
        <SuccessBanner message={actionOk} />
      </div>

      {detailId ? (
        <CustomerDetailDrawer customerId={detailId} phone={detailPhone} onClose={() => setDetailId(null)} />
      ) : null}

      {/* Özet kartları — tıklanınca filtre olur */}
      <section aria-label="Özet" className="grid grid-cols-3 gap-2 sm:gap-3">
        {firstLoad || !summary ? (
          [0, 1, 2].map((i) => <div key={i} className="attio-surface h-[72px] animate-pulse" />)
        ) : (
          <>
            <SummaryTile
              label="Tüm müşteriler"
              value={summary.all}
              active={filter === "all"}
              onClick={() => pickFilter("all")}
            />
            <SummaryTile
              label="Ödül hazır"
              value={summary.ready}
              tone="success"
              active={filter === "ready"}
              onClick={() => pickFilter("ready")}
            />
            <SummaryTile
              label="Kartı telefonunda"
              value={summary.wallet}
              active={filter === "wallet"}
              onClick={() => pickFilter("wallet")}
            />
          </>
        )}
      </section>

      <Panel padded={false}>
        {/* Araç çubuğu: arama + filtre */}
        <div className="flex flex-col gap-3 border-b border-[var(--line)] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <label htmlFor="customer-search" className="sr-only">
              Müşteri ara
            </label>
            <SearchIcon />
            <input
              id="customer-search"
              type="search"
              className={`${inputClassName()} h-9 pl-8 pr-8`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="İsim veya telefon ara"
              autoComplete="off"
            />
            {q ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Aramayı temizle"
                className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              >
                ×
              </button>
            ) : null}
          </div>
          <div
            role="tablist"
            aria-label="Duruma göre filtrele"
            className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => pickFilter(f.id)}
                className={`min-h-8 whitespace-nowrap rounded-md px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] ${
                  filter === f.id
                    ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sonuç başlığı */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5 text-xs text-[var(--muted)]">
          <span>
            {firstLoad
              ? "Yükleniyor…"
              : searching
                ? `«${query}» için ${total} sonuç`
                : `${total} müşteri`}
          </span>
          <button
            type="button"
            className="font-medium text-[var(--ink)] hover:underline disabled:opacity-50"
            disabled={refreshing}
            onClick={() => void reload(true)}
          >
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        </div>

        <div className={`transition-opacity ${refreshing ? "opacity-60" : ""}`}>
          {firstLoad ? (
            <div className="p-4">
              <ListSkeleton rows={5} />
            </div>
          ) : list.length === 0 ? (
            <div className="p-6">
              {searching ? (
                <EmptyState
                  title="Sonuç bulunamadı"
                  description="Yazımı kontrol edin ya da telefonun son haneleriyle deneyin."
                  action={
                    <button type="button" className={btnGhost()} onClick={clearSearch}>
                      Aramayı temizle
                    </button>
                  }
                />
              ) : filter !== "all" ? (
                <EmptyState
                  title={filter === "ready" ? "Ödül hazır müşteri yok" : "Kartı olan müşteri yok"}
                  description="Filtreyi değiştirerek tüm müşterilere bakabilirsiniz."
                  action={
                    <button type="button" className={btnGhost()} onClick={() => pickFilter("all")}>
                      Tümünü göster
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  title="Henüz müşteri yok"
                  description="Yeni müşteriyi kasadan kaydedin, kartı telefonuna ekleyin."
                  action={
                    <Link href="/counter" className={btnGhost()}>
                      Kasaya git
                    </Link>
                  }
                />
              )}
            </div>
          ) : (
            <>
              {/* Telefon: kart liste */}
              <ul className="divide-y divide-[var(--line)] md:hidden">
                {list.map((c) => (
                  <CustomerCard
                    key={c.id}
                    c={c}
                    stampsRequired={stampsRequired}
                    busy={busyId === c.id}
                    onDetail={() => { setDetailId(c.id); setDetailPhone(c.phone); }}
                    onExport={() => void exportOne(c.id, c.phone)}
                    onDelete={() => void deleteOne(c.id, nameOf(c))}
                  />
                ))}
              </ul>

              {/* Masaüstü: tablo */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">Müşteri</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Damga</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Durum</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Son işlem</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {list.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--surface)]/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar text={initials(c.displayName, c.phone)} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--ink)]">{nameOf(c)}</p>
                              <p className="tabular-nums text-xs text-[var(--muted)]">
                                {displayPhone(c.phone)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StampProgress
                            count={c.stampCount}
                            required={stampsRequired}
                            ready={c.rewardReady}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadges c={c} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--muted)]">
                          {lastSeen(c.updatedAt)}
                          <span className="opacity-70"> · {c.ledgerCount} işlem</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className={btnGhost()}
                              onClick={() => { setDetailId(c.id); setDetailPhone(c.phone); }}
                            >
                              Detay
                            </button>
                            <Link
                              href={`/counter?customerId=${encodeURIComponent(c.id)}`}
                              className={btnGhost()}
                            >
                              Kasada aç
                            </Link>
                            <MoreMenu
                              label={`${nameOf(c)} için diğer işlemler`}
                              disabled={busyId === c.id}
                              onExport={() => void exportOne(c.id, c.phone)}
                              onDelete={() => void deleteOne(c.id, nameOf(c))}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <nav
                  aria-label="Sayfalar"
                  className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3"
                >
                  <button
                    type="button"
                    className={btnGhost()}
                    disabled={page <= 1 || refreshing}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Önceki
                  </button>
                  <p className="text-xs tabular-nums text-[var(--muted)]">
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
                </nav>
              ) : null}
            </>
          )}
        </div>
      </Panel>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Müşteri silinsin mi?"
        confirmLabel="Müşteriyi sil"
        danger
        busy={busyId !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        <span className="font-medium text-[var(--ink)]">{pendingDelete?.label}</span> silinecek. Damga geçmişi ve Wallet kartları da silinir. Bu işlem geri alınamaz.
      </ConfirmDialog>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "success";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`attio-surface p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] sm:p-4 ${
        active ? "ring-2 ring-[var(--ink)]/80" : "hover:-translate-y-px"
      }`}
    >
      <p className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">{label}</p>
      <p
        className={`mt-1 font-display text-xl tabular-nums tracking-tight sm:text-2xl ${
          tone === "success" && value > 0 ? "text-[var(--success)]" : "text-[var(--ink)]"
        }`}
      >
        {value.toLocaleString("tr-TR")}
      </p>
    </button>
  );
}

function Avatar({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]"
    >
      {text}
    </span>
  );
}

function StampProgress({
  count,
  required,
  ready,
}: {
  count: number;
  required: number;
  ready: boolean;
}) {
  const pct = Math.min(100, Math.round((count / Math.max(1, required)) * 100));
  return (
    <div className="w-32">
      <div className="mb-1 flex items-center justify-between text-xs tabular-nums">
        <span className="text-[var(--ink)]">
          {count}
          <span className="text-[var(--muted)]">/{required}</span>
        </span>
        {ready ? <span className="text-[10px] font-medium text-[var(--success)]">hazır</span> : null}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={count}
        aria-label={`${count} / ${required} damga`}
      >
        <div
          className={`h-full rounded-full ${ready ? "bg-emerald-500" : "bg-[var(--accent)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadges({ c }: { c: CustomerRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {c.rewardReady ? <Badge tone="success">Ödül hazır</Badge> : null}
      {c.hasWallet ? <Badge tone="info">Kartı var</Badge> : <Badge tone="neutral">Kart yok</Badge>}
    </div>
  );
}

/** Sekonder işlemler: KVKK verisi, silme */
function MoreMenu({
  label,
  disabled,
  onExport,
  onDelete,
}: {
  label: string;
  disabled?: boolean;
  /** Eski prop; konum artık tetikleyiciye göre hesaplanır */
  up?: boolean;
  onExport: () => void;
  onDelete: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Menü tablo kapsayıcısının dışında (fixed) açılır; böylece kaydırma alanı tarafından kesilmez
  function onToggle() {
    const el = detailsRef.current;
    if (!el?.open) {
      setPos(null);
      return;
    }
    const rect = el.querySelector("summary")?.getBoundingClientRect();
    if (!rect) return;
    const menuH = 96;
    const below = window.innerHeight - rect.bottom;
    const top = below < menuH + 8 ? rect.top - menuH - 4 : rect.bottom + 4;
    setPos({ top, left: Math.max(8, rect.right - 192) });
  }

  return (
    <details ref={detailsRef} className="relative" onToggle={onToggle}>
      <summary
        aria-label={label}
        className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden"
      >
        <DotsIcon />
      </summary>
      {pos ? (
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-48 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1 text-left shadow-[var(--shadow-md)]"
        >
          <button
            type="button"
            disabled={disabled}
            onClick={onExport}
            className="block w-full rounded-md px-2.5 py-2 text-left text-[0.8125rem] hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Verisini indir (KVKK)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="block w-full rounded-md px-2.5 py-2 text-left text-[0.8125rem] text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
          >
            Müşteriyi sil
          </button>
        </div>
      ) : null}
    </details>
  );
}

function CustomerCard({
  c,
  stampsRequired,
  busy,
  onDetail,
  onExport,
  onDelete,
}: {
  c: CustomerRow;
  stampsRequired: number;
  busy: boolean;
  onDetail: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const bday = formatBirthday(c.birthMonth, c.birthDay);
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Avatar text={initials(c.displayName, c.phone)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--ink)]">{nameOf(c)}</p>
              <p className="tabular-nums text-xs text-[var(--muted)]">
                {displayPhone(c.phone)}
                {bday ? ` · ${bday}` : ""}
              </p>
            </div>
            <MoreMenu
              label={`${nameOf(c)} için diğer işlemler`}
              disabled={busy}
              onExport={onExport}
              onDelete={onDelete}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <StampProgress count={c.stampCount} required={stampsRequired} ready={c.rewardReady} />
            <StatusBadges c={c} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={`${btnGhost()} flex-1`} onClick={onDetail}>
              Detay
            </button>
            <Link
              href={`/counter?customerId=${encodeURIComponent(c.id)}`}
              className={`${btnGhost()} flex-1`}
            >
              Kasada aç
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function DotsIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
