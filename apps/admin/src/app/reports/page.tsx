"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Badge,
  ErrorBanner,
  PageHeader,
  PageSkeleton,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  StatCard,
  SuccessBanner,
  btnGhost,
} from "../../components/ui";
import { ApiError, apiDownload } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type ActivityRow = {
  id: string;
  type: "STAMP" | "REDEEM" | "ADJUST";
  createdAt: string;
  phone: string;
  customerId: string;
  byName: string | null;
  note: string | null;
};

type NearReward = {
  id: string;
  phone: string;
  stampCount: number;
  remaining: number;
};

type Reports = {
  stampsRequired: number;
  rewardLabel: string;
  totals: {
    stampsToday: number;
    redeemsToday: number;
    stampsWeek: number;
    redeemsWeek: number;
    stampsMonth: number;
    redeemsMonth: number;
    totalCustomers: number;
    newCustomersWeek: number;
    rewardReadyCount: number;
  };
  recentActivity: ActivityRow[];
  nearReward: NearReward[];
};

export default function ReportsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <ReportsContent />
    </RequireAuth>
  );
}

function activityLabel(type: ActivityRow["type"]) {
  switch (type) {
    case "STAMP":
      return "Damga";
    case "REDEEM":
      return "Ödül";
    case "ADJUST":
      return "Düzeltme";
  }
}

function activityTone(type: ActivityRow["type"]) {
  switch (type) {
    case "STAMP":
      return "neutral" as const;
    case "REDEEM":
      return "success" as const;
    case "ADJUST":
      return "warning" as const;
  }
}

function ReportsContent() {
  const { data, error, loading, refreshing, reload } = useApiQuery<Reports>(
    "reports:stamps",
    "/stamps/reports",
    { ttlMs: 30_000 },
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const redeemRate = useMemo(() => {
    if (!data?.totals.stampsMonth) return 0;
    return Math.round(
      (data.totals.redeemsMonth / data.totals.stampsMonth) * 100,
    );
  }, [data]);

  async function exportLedger() {
    setExporting(true);
    setExportError(null);
    setExportOk(null);
    try {
      await apiDownload("/stamps/ledger/export.csv", "stamp-ledger.csv");
      setExportOk("Damga defteri indirildi");
    } catch (err) {
      setExportError(
        err instanceof ApiError ? err.message : "CSV indirilemedi",
      );
    } finally {
      setExporting(false);
    }
  }

  if (loading && !data) {
    return <PageSkeleton cards={6} chart />;
  }

  const t = data?.totals;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Genel"
        title="Raporlar"
        subtitle="Damga, ödül ve müşteri hareketlerini dönem bazında incele."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnGhost()}
              disabled={exporting}
              onClick={() => void exportLedger()}
            >
              {exporting ? "İndiriliyor…" : "Defter CSV"}
            </button>
            <button
              type="button"
              className={btnGhost()}
              disabled={refreshing}
              onClick={() => void reload(true)}
            >
              {refreshing ? "Yenileniyor…" : "Yenile"}
            </button>
          </div>
        }
      />
      <ErrorBanner message={error || exportError} />
      <SuccessBanner message={exportOk} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bugün damga / ödül"
          value={`${t?.stampsToday ?? "—"} / ${t?.redeemsToday ?? "—"}`}
          hint="00:00’dan beri"
          accent
        />
        <StatCard
          label="Bu hafta damga / ödül"
          value={`${t?.stampsWeek ?? "—"} / ${t?.redeemsWeek ?? "—"}`}
          hint="Son 7 gün"
        />
        <StatCard
          label="Bu ay damga / ödül"
          value={`${t?.stampsMonth ?? "—"} / ${t?.redeemsMonth ?? "—"}`}
          hint={`Ödül oranı %${redeemRate}`}
        />
        <StatCard
          label="Ödül hazır"
          value={t?.rewardReadyCount ?? "—"}
          hint={data?.rewardLabel ? `Hedef: ${data.rewardLabel}` : undefined}
          accent
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Toplam müşteri
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {t?.totalCustomers ?? "—"}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Bu hafta yeni kayıt
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {t?.newCustomersWeek ?? "—"}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Ödül kuralı
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">
            {data?.stampsRequired ?? 10} damga → {data?.rewardLabel || "—"}
          </p>
        </SoftBox>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Son hareketler"
              description="En son 15 damga, ödül ve düzeltme kaydı."
            />
          </div>
          {!data?.recentActivity.length ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--muted)] sm:px-6">
              Henüz hareket yok.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.recentActivity.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={activityTone(row.type)}>
                        {activityLabel(row.type)}
                      </Badge>
                      <span className="font-medium tabular-nums text-[var(--ink)]">
                        0{row.phone}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {row.byName ? `${row.byName} · ` : ""}
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/counter?phone=${encodeURIComponent(row.phone)}`}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Tezgâhta aç →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Ödüle yakın"
              description="En çok damgaya sahip müşteriler."
            />
          </div>
          {!data?.nearReward.length ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--muted)] sm:px-6">
              Henüz aktif müşteri yok.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.nearReward.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                >
                  <div>
                    <p className="font-medium tabular-nums">0{c.phone}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {c.stampCount}/{data.stampsRequired} damga
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-[var(--accent)]">
                      {c.remaining} kaldı
                    </p>
                    <Link
                      href={`/counter?phone=${encodeURIComponent(c.phone)}`}
                      className="text-[11px] text-[var(--muted)] hover:text-[var(--accent)]"
                    >
                      Tezgâh →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
