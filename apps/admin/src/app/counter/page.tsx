"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InviteQrModal } from "../../components/invite-qr-modal";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  FormSkeleton,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

const PAGE_SIZE = 15;

type Customer = {
  id: string;
  phone: string;
  displayName?: string | null;
  stampCount: number;
  rewardReady: boolean;
  hasWallet?: boolean;
};

type Directory = {
  stampsRequired: number;
  rewardLabel: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  customers: Customer[];
};

type StampResult = {
  customer: Customer;
  stampsRequired: number;
  rewardLabel: string;
  stampsRemaining: number;
  walletInviteUrl?: string | null;
};

type Summary = {
  stampsToday: number;
  redeemsToday: number;
  totalCustomers: number;
};

type Filter = "all" | "ready";

function formatPhone(phone: string) {
  return phone.startsWith("0") ? phone : `0${phone}`;
}

export default function CounterPage() {
  return (
    <RequireAuth roles={["CASHIER", "STORE_OWNER"]}>
      <Suspense fallback={<FormSkeleton rows={2} />}>
        <CounterContent />
      </Suspense>
    </RequireAuth>
  );
}

function CounterContent() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const listPath =
    `/stamps/customers/directory?filter=${filter}&take=${PAGE_SIZE}&page=${page}` +
    (searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "");

  const {
    data: directory,
    error: loadError,
    loading,
    refreshing,
    reload,
  } = useApiQuery<Directory>(
    `counter:directory:${filter}:${page}:${searchQuery}`,
    listPath,
    { ttlMs: 15_000 },
  );

  const { data: summary, reload: reloadSummary } = useApiQuery<Summary>(
    "counter:summary",
    "/stamps/summary/today",
    { ttlMs: 30_000 },
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const fromUrl = searchParams.get("phone");
    if (fromUrl && !prefilled) {
      setSearchInput(fromUrl);
      setPhone(fromUrl);
      setPrefilled(true);
    }
  }, [searchParams, prefilled]);

  const refreshAll = useCallback(async () => {
    await Promise.all([reload(true), reloadSummary(true)]);
    bustCache("metrics");
    bustCache("reports");
    bustCache("customers");
  }, [reload, reloadSummary]);

  const selectCustomer = useCallback((c: Customer) => {
    setSelected(c);
    setError(null);
    setOk(null);
  }, []);

  useEffect(() => {
    if (!directory || !searchParams.get("phone") || !prefilled) return;
    const digits = searchParams.get("phone")!.replace(/\D/g, "");
    const match = directory.customers.find((c) => c.phone.includes(digits));
    if (match) selectCustomer(match);
  }, [directory, searchParams, prefilled, selectCustomer]);

  function openInvite(url: string | null | undefined) {
    if (url) setInviteUrl(url);
  }

  async function register(e?: FormEvent) {
    e?.preventDefault();
    const raw = phone.trim() || searchInput.trim();
    if (!raw) {
      setError("Kayıt için telefon girin");
      return;
    }
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api<StampResult>("/stamps/customers", {
        method: "POST",
        body: JSON.stringify({ phone: raw }),
      });
      selectCustomer(data.customer);
      setOk(
        data.walletInviteUrl
          ? "Kayıt + ilk damga tamam. Müşteri QR ile Wallet’a ekleyebilir."
          : "Kayıt + ilk damga tamam.",
      );
      openInvite(data.walletInviteUrl);
      setPhone("");
      await refreshAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function addStamp() {
    if (!selected) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api<StampResult>(
        `/stamps/customers/${selected.id}/stamp`,
        {
          method: "POST",
          body: JSON.stringify({ source: "cashier" }),
        },
      );
      selectCustomer(data.customer);
      setOk(
        data.customer.rewardReady
          ? `Damga eklendi — ödül hazır: ${data.rewardLabel}`
          : `Damga eklendi (${data.customer.stampCount}/${data.stampsRequired})`,
      );
      openInvite(data.walletInviteUrl);
      await refreshAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Damga eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function showWalletQr() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ walletInviteUrl: string }>(
        `/stamps/customers/${selected.id}/wallet-invite`,
      );
      openInvite(data.walletInviteUrl);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Davet linki alınamadı",
      );
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (!selected) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api<{ customer: Customer; redeemed: string }>(
        `/stamps/customers/${selected.id}/redeem`,
        { method: "POST" },
      );
      selectCustomer(data.customer);
      setOk(`Ödül kullanıldı: ${data.redeemed}`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ödül kullanılamadı");
    } finally {
      setBusy(false);
    }
  }

  const stampsRequired = directory?.stampsRequired ?? 10;
  const rewardLabel = directory?.rewardLabel ?? "";
  const customers = directory?.customers ?? [];
  const totalPages = directory?.totalPages ?? 1;
  const total = directory?.total ?? 0;

  if (loading && !directory) {
    return <ListSkeleton rows={6} />;
  }

  return (
    <div className="w-full space-y-5">
      {inviteUrl ? (
        <InviteQrModal
          url={inviteUrl}
          phoneLabel={
            selected
              ? selected.displayName?.trim() || formatPhone(selected.phone)
              : undefined
          }
          onClose={() => setInviteUrl(null)}
        />
      ) : null}

      <PageHeader
        eyebrow="Operasyon"
        title="Tezgâh"
        subtitle="Müşteri listesinden seç, damga ekle veya ödül kullan. Günde 1 damga (1 ziyaret)."
        actions={
          <button
            type="button"
            className={btnGhost()}
            disabled={refreshing}
            onClick={() => void refreshAll()}
          >
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      {summary ? (
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["Bugün damga", summary.stampsToday],
              ["Bugün ödül", summary.redeemsToday],
              ["Müşteri", summary.totalCustomers],
            ] as const
          ).map(([label, value]) => (
            <SoftBox key={label} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
                {value}
              </p>
            </SoftBox>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Müşteriler"
              description={`${total} kayıt · sayfa ${page}/${totalPages}`}
            />
            <div className="mt-4 flex flex-col gap-3">
              <input
                className={inputClassName()}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Telefon veya son hanelerle filtrele (isteğe bağlı)…"
              />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Tümü"],
                    ["ready", "Ödül hazır"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm font-medium transition ${
                      filter === id
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--surface)]"
                    }`}
                    onClick={() => {
                      setFilter(id);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                title="Müşteri yok"
                description={
                  searchQuery || filter === "ready"
                    ? "Filtreyi değiştir veya yeni kayıt ekle."
                    : "Sağdaki formdan ilk müşteriyi kaydedin."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {customers.map((c) => {
                const active = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition sm:px-6 ${
                        active
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--ink)]">
                          {c.displayName?.trim() || formatPhone(c.phone)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {c.displayName?.trim()
                            ? formatPhone(c.phone)
                            : null}
                          {c.displayName?.trim() ? " · " : null}
                          {c.stampCount}/{stampsRequired} damga
                          {c.hasWallet ? " · Wallet" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {c.rewardReady ? (
                          <Badge tone="success">Ödül hazır</Badge>
                        ) : (
                          <span className="text-xs tabular-nums text-[var(--muted)]">
                            {Math.max(stampsRequired - c.stampCount, 0)} kaldı
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3 sm:px-6">
              <button
                type="button"
                className={btnGhost()}
                disabled={page <= 1 || busy || refreshing}
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
                disabled={page >= totalPages || busy || refreshing}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki →
              </button>
            </div>
          ) : null}
        </Panel>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <PanelHeader
              title="Yeni müşteri"
              description="Kayıt otomatik ilk damgayı verir."
            />
            <form
              onSubmit={(e) => void register(e)}
              className="flex flex-col gap-3"
            >
              <Field label="Telefon">
                <input
                  className={inputClassName()}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                />
              </Field>
              <button
                type="submit"
                className={btnPrimary()}
                disabled={busy || !phone.trim()}
              >
                Kayıt + ilk damga
              </button>
            </form>
          </Panel>

          {selected ? (
            <Panel className="border-[var(--accent)]/20 bg-gradient-to-br from-white to-[var(--accent-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl">
                    {selected.displayName?.trim() ||
                      formatPhone(selected.phone)}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {selected.displayName?.trim()
                      ? `${formatPhone(selected.phone)} · `
                      : null}
                    {selected.stampCount}/{stampsRequired} damga
                    {selected.rewardReady
                      ? ` — ${rewardLabel}`
                      : ` · ${Math.max(stampsRequired - selected.stampCount, 0)} kaldı`}
                    {selected.hasWallet ? " · Wallet" : ""}
                  </p>
                </div>
                {selected.rewardReady ? (
                  <Badge tone="success">Ödül hazır</Badge>
                ) : null}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className={`${btnPrimary()} flex-1`}
                    disabled={busy || selected.rewardReady}
                    onClick={() => void addStamp()}
                  >
                    Damga ekle
                  </button>
                  <button
                    type="button"
                    className={`${btnGhost()} flex-1`}
                    disabled={busy || !selected.rewardReady}
                    onClick={() => void redeem()}
                  >
                    Ödül kullan
                  </button>
                </div>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={busy}
                  onClick={() => void showWalletQr()}
                >
                  Wallet davet QR
                </button>
              </div>
              {selected.rewardReady ? (
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Ödül hazır — yeni damga için önce ödülü kullanın.
                </p>
              ) : null}
            </Panel>
          ) : (
            <SoftBox>
              <p className="text-sm text-[var(--muted)]">
                Listeden bir müşteri seçin veya yeni kayıt oluşturun.
              </p>
            </SoftBox>
          )}
        </aside>
      </div>
    </div>
  );
}
