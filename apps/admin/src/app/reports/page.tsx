"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ErrorBanner,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  Skeleton,
  SuccessBanner,
} from "../../components/ui";
import { ApiError, apiDownload } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import {
  detectPreset,
  formatRangeLabel,
  isoDaysAgo,
  isoToday,
  presetRange,
  type DatePreset,
} from "./_components/date-utils";
import {
  ActivityFeed,
  BranchBreakdown,
  BusyHeatmap,
  NearRewardList,
  ProgramBreakdown,
} from "./_components/insights";
import { KpiCard, MiniStat } from "./_components/kpi-card";
import { RangeBar } from "./_components/range-bar";
import { TrendChart } from "./_components/trend-chart";
import { fmtInt, fmtKurus, pct, SERIES, type Dashboard } from "./_components/types";

export default function ReportsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent />
      </Suspense>
    </RequireAuth>
  );
}

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? isoDaysAgo(6);
  const to = searchParams.get("to") ?? isoToday();
  const [preset, setPreset] = useState<DatePreset>(() => detectPreset(from, to));

  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"ledger" | "near" | null>(null);

  const setRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      const params = new URLSearchParams({ from: nextFrom, to: nextTo });
      router.replace(`/reports?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  // Eski ?tab= bağlantıları
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history" || tab === "today") {
      const r = tab === "history" ? presetRange("30d") : presetRange("today");
      setRange(r.from, r.to);
    }
  }, [searchParams, setRange]);

  useEffect(() => {
    setPreset(detectPreset(from, to));
  }, [from, to]);

  // Tek istek — sayfanın tüm verisi
  const path = `/analytics/dashboard?from=${from}&to=${to}`;
  const { data, error, loading, refreshing, reload } = useApiQuery<Dashboard>(path, path);

  /** Elle "Yenile" → veri ekranda kalır; dönem değişimi → iskelet */
  const [manualRefresh, setManualRefresh] = useState(false);
  useEffect(() => {
    if (!refreshing) setManualRefresh(false);
  }, [refreshing]);
  const showSkeleton = (loading && !data) || (refreshing && !manualRefresh);

  async function download(kind: "ledger" | "near") {
    setExporting(kind);
    setExportError(null);
    setExportOk(null);
    try {
      if (kind === "ledger") {
        await apiDownload("/stamps/ledger/export.csv", "hareketler.csv");
        setExportOk("Tüm hareketler indirildi.");
      } else {
        await apiDownload("/stamps/reports/near-reward/export.csv", "odule-yakin-musteriler.csv");
        setExportOk("Ödüle yakın müşteri listesi indirildi.");
      }
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : "Dosya indirilemedi");
    } finally {
      setExporting(null);
    }
  }

  const rangeLabel = formatRangeLabel(from, to);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="İşletmem"
        title="Özet ve raporlar"
        subtitle={`${rangeLabel} · önceki aynı uzunluktaki dönemle karşılaştırılır`}
        help="Üstten dönem seçin. Kartlardaki yüzdeler, seçtiğiniz dönemi bir önceki aynı uzunluktaki dönemle karşılaştırır. Müşteri durumu ve ödüle yakın müşteriler anlık bilgidir."
        actions={
          <button
            type="button"
            onClick={() => void download("ledger")}
            disabled={exporting !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {exporting === "ledger" ? "İndiriliyor…" : "Tüm hareketleri indir"}
          </button>
        }
      />

      <RangeBar
        preset={preset}
        from={from}
        to={to}
        refreshing={refreshing}
        onPreset={(id) => {
          setPreset(id);
          const r = presetRange(id);
          setRange(r.from, r.to);
        }}
        onApplyCustom={(a, b) => {
          setPreset("custom");
          setRange(a, b);
        }}
        onRefresh={() => {
          setManualRefresh(true);
          void reload(true);
        }}
      />

      <ErrorBanner message={error || exportError} />
      <SuccessBanner message={exportOk} />

      {showSkeleton ? (
        <ReportsSkeleton bare />
      ) : data ? (
        <div className={`space-y-5 transition-opacity duration-200 ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
          {/* Ana göstergeler */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ana göstergeler">
            <KpiCard
              primary
              label="Gelen müşteri"
              hint="Dönemde en az bir kez işlem yapan farklı müşteri"
              metric={data.kpis.visitors}
            />
            <KpiCard
              label="Verilen damga"
              metric={data.kpis.stamps}
              trend={data.daily.map((d) => d.stamps)}
              color={SERIES.stamps.color}
            />
            <KpiCard
              label="Kullanılan ödül"
              metric={data.kpis.redeems}
              trend={data.daily.map((d) => d.redeems)}
              color={SERIES.redeems.color}
              hint={
                data.kpis.stamps.value
                  ? `Damgaların %${pct(data.kpis.redeems.value, data.kpis.stamps.value)}'i kadar ödül`
                  : undefined
              }
            />
            <KpiCard
              label="Yeni müşteri"
              metric={data.kpis.newCustomers}
              trend={data.daily.map((d) => d.newCustomers)}
              color={SERIES.stamps.color}
            />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHeader
                title="Günlük hareket"
                description="Grafiğin üzerinde gezinerek gün gün görün"
              />
              <TrendChart rows={data.daily} />
            </Panel>

            <Panel>
              <PanelHeader title="Müşteri durumu" description="Şu anki tablo" />
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Toplam müşteri" value={fmtInt(data.snapshot.totalCustomers)} />
                <MiniStat
                  label="Kartını kullanan"
                  value={`%${pct(data.snapshot.activeCustomers, data.snapshot.totalCustomers)}`}
                  sub={`${fmtInt(data.snapshot.activeCustomers)} müşteri`}
                />
                <MiniStat
                  label="Telefonunda kart"
                  value={`%${pct(data.snapshot.walletPasses, data.snapshot.totalCustomers)}`}
                  sub={`${fmtInt(data.snapshot.walletPasses)} Apple Wallet`}
                />
                <MiniStat
                  label="Ödülü hazır"
                  value={fmtInt(data.snapshot.rewardReadyCount)}
                  sub={data.reward.rewardLabel || undefined}
                />
                {data.kpis.pointsEarned.value > 0 ? (
                  <MiniStat label="Kazanılan puan" value={fmtInt(data.kpis.pointsEarned.value)} sub="Seçilen dönem" />
                ) : null}
                {data.snapshot.cashbackOutstandingKurus > 0 || data.kpis.cashbackEarnKurus.value > 0 ? (
                  <>
                    <MiniStat
                      label="Cashback kazanılan"
                      value={fmtKurus(data.kpis.cashbackEarnKurus.value)}
                      sub={`Kullanılan ${fmtKurus(data.kpis.cashbackRedeemKurus.value)}`}
                    />
                    <MiniStat
                      label="Bekleyen cashback"
                      value={fmtKurus(data.snapshot.cashbackOutstandingKurus)}
                      sub={`${fmtInt(data.snapshot.cashbackCustomers)} müşteride`}
                    />
                  </>
                ) : null}
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHeader title="En yoğun saatler" description="Hangi gün ve saatte daha çok müşteri geliyor" />
              <BusyHeatmap grid={data.heatmap} />
            </Panel>

            <Panel>
              <PanelHeader
                title="Ödüle yakın müşteriler"
                description={`${data.reward.stampsRequired} damgada ödül`}
                action={
                  <button
                    type="button"
                    onClick={() => void download("near")}
                    disabled={exporting !== null}
                    className="text-[0.75rem] font-medium text-[var(--brand)] hover:underline disabled:opacity-60"
                  >
                    {exporting === "near" ? "İndiriliyor…" : "Listeyi indir"}
                  </button>
                }
              />
              <NearRewardList rows={data.nearReward} stampsRequired={data.reward.stampsRequired} />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel>
              <PanelHeader title="Son hareketler" description="Seçilen dönemdeki en yeni işlemler" />
              <ActivityFeed rows={data.recentActivity} />
            </Panel>

            <div className="space-y-5">
              {data.byProgramType.length > 0 ? (
                <Panel>
                  <PanelHeader title="Kart türüne göre" description="Hangi kartınız daha çok kullanılıyor" />
                  <ProgramBreakdown rows={data.byProgramType} />
                </Panel>
              ) : null}
              {data.branches.length > 1 ? (
                <Panel>
                  <PanelHeader title="Şubelere göre" description="Verilen damga" />
                  <BranchBreakdown rows={data.branches} />
                </Panel>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportsSkeleton({ bare = false }: { bare?: boolean }) {
  return (
    <div className="w-full space-y-5" aria-busy="true" aria-label="Raporlar yükleniyor">
      {bare ? null : (
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-80" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Panel key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-3 h-8 w-full" />
          </Panel>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-[240px] w-full" />
        </Panel>
        <Panel>
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="mb-4 h-3 w-56" />
          <div className="grid grid-cols-[34px_repeat(15,minmax(0,1fr))] gap-[3px]">
            {Array.from({ length: 7 * 16 }).map((_, i) =>
              i % 16 === 0 ? (
                <Skeleton key={i} className="h-3 w-6 self-center" />
              ) : (
                <Skeleton key={i} className="h-6 rounded-[4px]" />
              ),
            )}
          </div>
        </Panel>
        <Panel>
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-1.5 flex-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, p) => (
          <Panel key={p}>
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
