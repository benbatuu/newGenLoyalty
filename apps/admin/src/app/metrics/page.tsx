"use client";

import Link from "next/link";
import { useMemo } from "react";
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
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { useApiQuery } from "../../lib/use-api-query";

type DayPoint = {
  date: string;
  label: string;
  stamps: number;
  redeems: number;
};

type Metrics = {
  totalCustomers: number;
  stampsToday: number;
  redeemsToday: number;
  stampsMonth: number;
  redeemsMonth: number;
  rewardReadyCount: number;
  applePassCount: number;
  registeredDevices: number;
  staffCount: number;
  activeCustomers: number;
  stampsRequired: number;
  rewardLabel: string | null;
  last7Days: DayPoint[];
};

const QUICK_LINKS = [
  {
    href: "/counter",
    label: "Tezgâh",
    hint: "Damga ekle / ödül kullan",
  },
  {
    href: "/reports",
    label: "Raporlar",
    hint: "Hareket geçmişi",
  },
  {
    href: "/customers",
    label: "Müşteriler",
    hint: "Liste & arama",
  },
  {
    href: "/reward",
    label: "Ödül kuralı",
    hint: "X damga → ödül",
  },
  {
    href: "/business",
    label: "Kafe profili",
    hint: "İletişim & adres",
  },
  {
    href: "/help",
    label: "Yardım",
    hint: "Nasıl kullanılır",
  },
] as const;

export default function MetricsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <MetricsContent />
    </RequireAuth>
  );
}

function MetricsContent() {
  const { data, error, loading, refreshing, reload } = useApiQuery<Metrics>(
    "metrics:me",
    "/tenants/me/metrics",
    { ttlMs: 30_000 },
  );

  const chartMax = useMemo(() => {
    if (!data?.last7Days?.length) return 1;
    return Math.max(
      1,
      ...data.last7Days.map((d) => Math.max(d.stamps, d.redeems)),
    );
  }, [data]);

  if (loading && !data) {
    return <PageSkeleton cards={6} chart />;
  }

  const walletCoverage = data
    ? pct(data.applePassCount, data.totalCustomers)
    : 0;
  const activeRate = data
    ? pct(data.activeCustomers, data.totalCustomers)
    : 0;
  const redeemRate = data ? pct(data.redeemsMonth, data.stampsMonth) : 0;
  const rewardReadyRate = data
    ? pct(data.rewardReadyCount, data.totalCustomers)
    : 0;

  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Genel"
        title="Özet"
        subtitle="Operasyonun nabzı — müşteri, Wallet, damga ve ödül tek bakışta."
        actions={
          <button
            type="button"
            className={btnGhost()}
            disabled={refreshing}
            onClick={() => void reload(true)}
          >
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        }
      />
      <ErrorBanner message={error} />

      {/* Hero */}
      <Panel className="relative overflow-hidden border-[var(--accent)]/15 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-deep)] p-0 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(255,255,255,0.18), transparent 55%)",
          }}
        />
        <div className="relative grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {today}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
              Bugün {data?.stampsToday ?? "—"} damga
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              {data?.redeemsToday ?? 0} ödül kullanıldı
              {data?.rewardLabel ? ` · hedef: ${data.rewardLabel}` : ""}.
              {data?.rewardReadyCount
                ? ` ${data.rewardReadyCount} müşterinin ödülü hazır.`
                : " Bekleyen ödül yok."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/counter" className={`${btnPrimary()} !bg-white !text-[var(--accent)] hover:!bg-white/90`}>
                Tezgâha git
              </Link>
              <Link
                href="/notifications"
                className="inline-flex items-center rounded-[var(--radius-sm)] border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Duyuru gönder
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Müşteri", data?.totalCustomers],
                ["Wallet kart", data?.applePassCount],
                ["Ödül hazır", data?.rewardReadyCount],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[var(--radius-sm)] border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  {label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Primary stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Toplam müşteri"
          value={data?.totalCustomers ?? "—"}
          hint={`${data?.activeCustomers ?? 0} aktif (en az 1 damga)`}
          accent
        />
        <StatCard
          label="Bugün damga"
          value={data?.stampsToday ?? "—"}
          hint="Bugün 00:00’dan beri"
        />
        <StatCard
          label="Bugün ödül"
          value={data?.redeemsToday ?? "—"}
          hint="Kullanılan ödüller"
        />
        <StatCard
          label="Bu ay damga"
          value={data?.stampsMonth ?? "—"}
          hint={`Ayın ${new Date().getDate()}. günü`}
        />
        <StatCard
          label="Bu ay ödül"
          value={data?.redeemsMonth ?? "—"}
          hint={`Ödül oranı %${redeemRate}`}
        />
        <StatCard
          label="Ödül hazır"
          value={data?.rewardReadyCount ?? "—"}
          hint={`${data?.stampsRequired ?? 10} damga kuralı`}
          accent
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Son 7 gün"
            description="Damga ve ödül kullanımı — günlük karşılaştırma."
            action={
              <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  Damga
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                  Ödül
                </span>
              </div>
            }
          />
          <div className="flex h-48 items-end gap-2 sm:gap-3">
            {(data?.last7Days ?? Array.from({ length: 7 }, () => null)).map(
              (day, i) => {
                const stamps = day?.stamps ?? 0;
                const redeems = day?.redeems ?? 0;
                const stampH = `${Math.max(4, (stamps / chartMax) * 100)}%`;
                const redeemH = `${Math.max(4, (redeems / chartMax) * 100)}%`;
                return (
                  <div
                    key={day?.date ?? i}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-36 w-full items-end justify-center gap-1">
                      <div
                        className="w-[42%] max-w-5 rounded-t-md bg-[var(--accent)] transition-all"
                        style={{ height: stampH }}
                        title={`${stamps} damga`}
                      />
                      <div
                        className="w-[42%] max-w-5 rounded-t-md bg-emerald-500/70 transition-all"
                        style={{ height: redeemH }}
                        title={`${redeems} ödül`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-medium text-[var(--ink)]">
                        {day?.label ?? "—"}
                      </p>
                      <p className="text-[10px] tabular-nums text-[var(--muted)]">
                        {day ? `${stamps}/${redeems}` : "—"}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Wallet sağlığı"
            description="Kart ekleme ve cihaz kaydı."
          />
          <div className="space-y-4">
            <MetricBar
              label="Wallet kapsaması"
              value={walletCoverage}
              detail={`${data?.applePassCount ?? 0} / ${data?.totalCustomers ?? 0} müşteri`}
            />
            <MetricBar
              label="Aktif üyeler"
              value={activeRate}
              detail={`${data?.activeCustomers ?? 0} en az 1 damga almış`}
            />
            <MetricBar
              label="Ödül bekleyen"
              value={rewardReadyRate}
              detail={`${data?.rewardReadyCount ?? 0} kartta ödül hazır`}
              tone="warn"
            />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <SoftBox>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Kayıtlı cihaz
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
                  {data?.registeredDevices ?? "—"}
                </p>
              </SoftBox>
              <SoftBox>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Kasiyer
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
                  {data?.staffCount ?? "—"}
                </p>
              </SoftBox>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Hızlı işlemler"
          description="Sık kullanılan ekranlara tek tık."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-4 py-4 transition hover:border-[var(--accent)]/30 hover:bg-white hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--ink)]">{item.label}</p>
                <span className="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]">
                  →
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.hint}</p>
            </Link>
          ))}
        </div>
      </Panel>

      {data?.rewardLabel ? (
        <SoftBox className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Aktif ödül kuralı
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {data.stampsRequired} damga → {data.rewardLabel}
            </p>
          </div>
          <Badge tone="success">Canlı</Badge>
        </SoftBox>
      ) : null}
    </div>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function MetricBar({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "warn";
}) {
  const fill =
    tone === "warn" ? "bg-amber-500/80" : "bg-[var(--accent)]";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-[var(--ink)]">
          %{value}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--wash)]">
        <div
          className={`h-full rounded-full transition-all ${fill}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{detail}</p>
    </div>
  );
}
