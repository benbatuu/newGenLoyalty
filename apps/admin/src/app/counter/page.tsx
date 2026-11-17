"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { filterWalletPrograms } from "../../components/wallet-invite-picker-modal";
import {
  ErrorBanner,
  PageHeader,
  RequireAuth,
  Skeleton,
  SuccessBanner,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import {
  addStamp,
  earnCashback,
  earnPoints,
  parseTryToKurus,
  redeem,
  redeemCashback,
  redeemPoints,
  register,
  showWalletQr,
  submitRegister,
  submitWalletInvite,
} from "./_components/counter-handlers";
import { CounterModals } from "./_components/counter-modals";
import { CustomerList } from "./_components/customer-list";
import { CustomerWorkspace, RegisterCard } from "./_components/customer-workspace";
import { SideDrawer } from "../../components/side-drawer";
import { TodayStrip } from "./_components/today-strip";
import {
  PAGE_SIZE,
  type CashbackState,
  type Customer,
  type CounterBootstrap,
  type CustomerCounterState,
  type Directory,
  type Filter,
  type PointState,
  type Summary,
} from "./_components/types";

export default function CounterPage() {
  return (
    <RequireAuth roles={["CASHIER", "STORE_OWNER"]}>
      <Suspense fallback={<CounterSkeleton />}>
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
  const [invitePickerOpen, setInvitePickerOpen] = useState(false);
  const [invitePickerMode, setInvitePickerMode] = useState<"register" | "wallet">("wallet");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pointAmountTry, setPointAmountTry] = useState("");
  const [pointCategory, setPointCategory] = useState<string | undefined>();
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [cashbackAmountTry, setCashbackAmountTry] = useState("");
  const [cashbackBalanceTry, setCashbackBalanceTry] = useState<string | null>(null);
  const [cashbackRedeemTry, setCashbackRedeemTry] = useState("");
  const [cashbackBasketTry, setCashbackBasketTry] = useState("");

  // ── 1) Açılış: kartlar + bugünün özeti + kampanyalar + ödül kuralı (tek istek)
  const {
    data: boot,
    setData: setBoot,
    error: bootError,
  } = useApiQuery<CounterBootstrap>("counter:boot", "/stamps/counter");

  const programs = useMemo(() => boot?.programs ?? [], [boot]);
  const pointProgram = programs.find((p) => p.type === "POINT_CARD");
  const cashbackProgram = programs.find((p) => p.type === "CASHBACK_CARD");
  const primaryMultiStamp = programs.find((p) => p.type === "MULTI_STAMP" && p.isPrimary);
  const showClassicStampPanel = !primaryMultiStamp;
  const walletPrograms = useMemo(() => filterWalletPrograms(programs), [programs]);
  const needsProgramPicker = walletPrograms.length > 1;
  const stampsRequired = boot?.reward.stampsRequired ?? 10;
  const rewardLabel = boot?.reward.rewardLabel ?? "";

  // ── 2) Müşteri listesi (lean — gereksiz sayımlar yok)
  const listPath =
    `/stamps/customers/directory?lean=1&filter=${filter}&take=${PAGE_SIZE}&page=${page}` +
    (searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "");
  const {
    data: directory,
    setData: setDirectory,
    error: loadError,
    loading: listLoading,
    refreshing: listRefreshing,
    reload: reloadList,
  } = useApiQuery<Directory>(listPath, listPath);

  // ── 3) Seçili müşteri: güncel kayıt + tüm kart durumları (tek istek)
  const statePath = selected ? `/stamps/customers/${selected.id}/counter-state` : null;
  const {
    data: custState,
    loading: stateLoadingRaw,
    reload: reloadState,
  } = useApiQuery<CustomerCounterState>(statePath, statePath);
  // Önceki müşterinin verisi yeni müşteriye karışmasın
  const freshState = custState && selected && custState.customer.id === selected.id ? custState : null;
  const stateLoading = !!selected && (stateLoadingRaw || !freshState);

  const pointState = (pointProgram && (freshState?.states[pointProgram.id] as PointState | null)) || null;
  const cashbackState =
    (cashbackProgram && (freshState?.states[cashbackProgram.id] as CashbackState | null)) || null;

  // Sunucudan gelen bakiye, yerel (işlem sonrası) bakiyeyi günceller
  useEffect(() => {
    setPointBalance(pointState?.balance ?? null);
  }, [pointState]);
  useEffect(() => {
    setCashbackBalanceTry(cashbackState?.balanceTry ?? null);
  }, [cashbackState]);

  // Taze müşteri kaydı geldiğinde seçili müşteriyi ve listedeki satırı güncelle
  const patchCustomer = useCallback(
    (c: Partial<Customer> & { id: string }) => {
      setSelected((prev) => (prev && prev.id === c.id ? { ...prev, ...c } : prev));
      setDirectory((prev) =>
        prev
          ? { ...prev, customers: prev.customers.map((x) => (x.id === c.id ? { ...x, ...c } : x)) }
          : prev,
      );
    },
    [setDirectory],
  );
  useEffect(() => {
    if (freshState) patchCustomer(freshState.customer);
  }, [freshState, patchCustomer]);

  // Arama — 300 ms gecikmeyle
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Dar ekranda (liste üstte) müşteri seçilince işlem alanına kaydır
  const workspaceRef = useRef<HTMLDivElement>(null);
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    if (!selectedId || window.matchMedia("(min-width: 1024px)").matches) return;
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);

  // Esc → müşteriyi kapat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && selected && !invitePickerOpen && !inviteUrl) setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, invitePickerOpen, inviteUrl]);

  /**
   * İşlem sonrası: kasiyeri bekletmeden arka planda tazele.
   * - Seçili müşterinin durumu (tek istek)
   * - Bugünün sayıları (hafif istek)
   */
  const refreshAll = useCallback(async () => {
    void reloadState(true);
    void api<Summary & { rewardReadyCount: number }>("/stamps/summary/today")
      .then((summary) => setBoot((prev) => (prev ? { ...prev, summary } : prev)))
      .catch(() => {});
  }, [reloadState, setBoot]);

  const selectCustomer = useCallback(
    (c: Customer) => {
      setSelected((prev) => (prev?.id === c.id ? { ...prev, ...c } : c));
      patchCustomer(c);
      setError(null);
      setOk(null);
    },
    [patchCustomer],
  );

  /** Yeni kayıt: detay çekmecesi açılmaz; davet penceresi doğrudan gösterilir, liste tazelenir */
  const selectAfterRegister = useCallback(
    (_c: Customer) => {
      setSelected(null);
      void reloadList(true);
    },
    [reloadList],
  );

  const openInvite = useCallback((url: string | null | undefined) => {
    if (url) setInviteUrl(url);
  }, []);

  // ?customerId= / ?phone= bağlantıları
  const handledUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const fromCustomerId = searchParams.get("customerId");
    if (fromCustomerId && directory) {
      // Bağlantıdaki müşteri yalnızca bir kez seçilir; yoksa kapatınca yeniden açılıp döngü oluşur
      if (handledUrlRef.current === `id:${fromCustomerId}`) return;
      const match = directory.customers.find((c) => c.id === fromCustomerId);
      if (match) {
        handledUrlRef.current = `id:${fromCustomerId}`;
        selectCustomer(match);
      }
      return;
    }
    const fromUrl = searchParams.get("phone");
    if (fromUrl && !prefilled) {
      setSearchInput(fromUrl);
      setPhone(fromUrl);
      setPrefilled(true);
    }
  }, [searchParams, prefilled, directory, selectCustomer]);

  useEffect(() => {
    if (searchParams.get("customerId")) return;
    if (!directory || !searchParams.get("phone") || !prefilled) return;
    const digits = searchParams.get("phone")!.replace(/\D/g, "");
    if (handledUrlRef.current === `phone:${digits}`) return;
    const match = directory.customers.find((c) => c.phone.includes(digits));
    if (match) {
      handledUrlRef.current = `phone:${digits}`;
      selectCustomer(match);
    }
  }, [directory, searchParams, prefilled, selectCustomer]);

  const handlerDeps = {
    selected,
    pointProgram,
    cashbackProgram,
    pointAmountTry,
    pointCategory,
    cashbackAmountTry,
    cashbackRedeemTry,
    cashbackBasketTry,
    phone,
    searchInput,
    pendingPhone,
    needsProgramPicker,
    walletPrograms,
    setError,
    setOk,
    setBusy,
    setPointBalance,
    setPointAmountTry,
    setCashbackAmountTry,
    setCashbackRedeemTry,
    setCashbackBasketTry,
    setCashbackBalanceTry,
    setPhone,
    setPendingPhone,
    setInvitePickerOpen,
    setInvitePickerMode,
    selectCustomer,
    openInvite,
    refreshAll,
  };
  const registerDeps = { ...handlerDeps, selectCustomer: selectAfterRegister };

  return (
    <div className="w-full space-y-4">
      <CounterModals
        inviteUrl={inviteUrl}
        onCloseInvite={() => setInviteUrl(null)}
        selected={selected}
        pendingPhone={pendingPhone}
        invitePickerOpen={invitePickerOpen}
        invitePickerMode={invitePickerMode}
        walletPrograms={walletPrograms}
        phone={phone}
        busy={busy}
        onClosePicker={() => {
          setInvitePickerOpen(false);
          setPendingPhone(null);
        }}
        onConfirmPicker={(programIds) =>
          invitePickerMode === "register"
            ? submitRegister(registerDeps, programIds)
            : submitWalletInvite(handlerDeps, programIds)
        }
      />

      <PageHeader
        eyebrow="İşletmem"
        title="Kasa"
        subtitle="Müşteriyi bulun, damga verin veya hazır ödülü kullandırın."
        help="Telefonun tamamı, son 4 hanesi veya isimle arayın. Her ziyarette en fazla bir damga verilir; ödül dolunca «Ödülü kullandır» açılır."
        actions={
          selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)]"
            >
              ＋ Yeni müşteri
            </button>
          ) : null
        }
      />

      <ErrorBanner message={error || loadError || bootError} />
      <SuccessBanner message={ok} />

      <TodayStrip data={boot} />

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <CustomerList
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            filter={filter}
            onFilterChange={(f) => {
              setFilter(f);
              setPage(1);
            }}
            customers={listLoading && !directory ? null : (directory?.customers ?? [])}
            total={directory?.total ?? 0}
            page={page}
            totalPages={directory?.totalPages ?? 1}
            onPageChange={setPage}
            stampsRequired={stampsRequired}
            selectedId={selected?.id ?? null}
            onSelect={selectCustomer}
            onRegisterFromSearch={(p) => {
              setPhone(p);
              void register({ ...registerDeps, phone: p });
            }}
            refreshing={listRefreshing}
            busy={busy}
          />
        </div>

        <div className="min-w-0 scroll-mt-16" ref={workspaceRef}>
          {selected ? (
            <SideDrawer open onClose={() => setSelected(null)} title="Müşteri detayı">
            <CustomerWorkspace
              key={selected.id}
              customer={selected}
              stateLoading={stateLoading}
              stampsRequired={stampsRequired}
              rewardLabel={rewardLabel}
              showClassicStampPanel={showClassicStampPanel}
              busy={busy}
              onClose={() => setSelected(null)}
              onAddStamp={async () => {
                // Sonuç (başarı ya da hata) sayfa üstündeki bildirimde görünsün diye çekmece kapanır
                await addStamp(handlerDeps);
                setSelected(null);
              }}
              onRedeem={() => redeem(handlerDeps)}
              onShowWalletQr={() => showWalletQr(handlerDeps)}
              pointProgram={pointProgram}
              pointBalance={pointBalance}
              pointAmountTry={pointAmountTry}
              onPointAmountTryChange={setPointAmountTry}
              pointCategory={pointCategory}
              onPointCategoryChange={setPointCategory}
              pointCategories={pointState?.categories ?? []}
              pointRedeemOptions={pointState?.redeemOptions ?? []}
              onEarnPoints={() => earnPoints(handlerDeps)}
              onRedeemPoints={(cost, label) => redeemPoints(handlerDeps, cost, label)}
              cashbackProgram={cashbackProgram}
              cashbackBalanceTry={cashbackBalanceTry}
              cashbackEarnPercent={cashbackState?.earnPercent ?? null}
              cashbackAmountTry={cashbackAmountTry}
              onCashbackAmountTryChange={setCashbackAmountTry}
              cashbackBasketTry={cashbackBasketTry}
              onCashbackBasketTryChange={setCashbackBasketTry}
              cashbackRedeemTry={cashbackRedeemTry}
              onCashbackRedeemTryChange={setCashbackRedeemTry}
              onEarnCashback={() => earnCashback(handlerDeps)}
              onRedeemCashback={() => redeemCashback(handlerDeps)}
              parseTryToKurus={parseTryToKurus}
              programs={programs}
              states={freshState?.states}
              onCustomerUpdate={(c) => patchCustomer({ id: selected.id, ...c })}
              onRefresh={refreshAll}
              setBusy={setBusy}
              setError={setError}
              setOk={setOk}
            />
            </SideDrawer>
          ) : (
            <div className="space-y-4">
              <RegisterCard
                phone={phone}
                onPhoneChange={setPhone}
                onRegister={(e) => register(registerDeps, e)}
                busy={busy}
              />
              <div className="rounded-xl border border-dashed border-[var(--line-strong)] px-5 py-10 text-center">
                <p className="text-[0.9375rem] font-medium text-[var(--ink)]">Müşteri seçilmedi</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  Soldan bir müşteri seçin veya telefonla arayın. Damga, ödül ve kart işlemleri burada açılır.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CounterSkeleton() {
  return (
    <div className="w-full space-y-4" aria-busy="true" aria-label="Kasa yükleniyor">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <Skeleton className="h-[480px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    </div>
  );
}
