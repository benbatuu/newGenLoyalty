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

type PlatformOverview = {
  totals: {
    tenants: number;
    activeTenants: number;
    frozenTenants: number;
    totalCustomers: number;
    totalUsers: number;
    applePassCount: number;
    stampsToday: number;
    redeemsToday: number;
    estimatedMrr: number;
  };
  byStatus: {
    TRIAL: number;
    ACTIVE: number;
    CANCELLED: number;
    SUSPENDED: number;
  };
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: string;
    isActive: boolean;
    customers: number;
    createdAt: string;
  }>;
  needsAttention: Array<{
    id: string;
    name: string;
    slug: string;
    subscriptionStatus: string;
    isActive: boolean;
    customers: number;
    reason: string;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  SUSPENDED: "Askıda",
};

const QUICK_LINKS = [
  { href: "/tenants", label: "Kafeler", hint: "Oluştur & yönet" },
  { href: "/platform/subscriptions", label: "Abonelikler", hint: "Durum özeti" },
  { href: "/platform/leads", label: "Lead’ler", hint: "İletişim & kayıt" },
  { href: "/platform/sms", label: "SMS", hint: "Teslimat raporları" },
  { href: "/platform/help", label: "Yardım", hint: "Operasyon rehberi" },
] as const;

export default function PlatformPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <PlatformContent />
    </RequireAuth>
  );
}

function PlatformContent() {
  const { data, error, loading, refreshing, reload } =
    useApiQuery<PlatformOverview>(
      "platform:overview",
      "/tenants/platform/overview",
      { ttlMs: 30_000 },
    );

  const statusRows = useMemo(() => {
    if (!data) return [];
    return (
      Object.entries(data.byStatus) as Array<
        [keyof PlatformOverview["byStatus"], number]
      >
    ).filter(([, n]) => n > 0);
  }, [data]);

  if (loading && !data) {
    return <PageSkeleton cards={6} />;
  }

  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Özet"
        subtitle="Tüm kafelerin operasyonu ve abonelik durumu tek ekranda."
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
              {data?.totals.tenants ?? "—"} kafe · ₺
              {data?.totals.estimatedMrr ?? "—"} MRR
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              Bugün platform genelinde {data?.totals.stampsToday ?? 0} damga,{" "}
              {data?.totals.redeemsToday ?? 0} ödül kullanımı.{" "}
              {data?.totals.activeTenants ?? 0} aktif tenant,{" "}
              {data?.totals.frozenTenants ?? 0} dondurulmuş.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/tenants"
                className={`${btnPrimary()} !bg-white !text-[var(--accent)] hover:!bg-white/90`}
              >
                Kafe yönet
              </Link>
              <Link
                href="/platform/subscriptions"
                className="inline-flex items-center rounded-[var(--radius-sm)] border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Abonelikler
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Müşteri", data?.totals.totalCustomers],
                ["Wallet", data?.totals.applePassCount],
                ["Kullanıcı", data?.totals.totalUsers],
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam kafe"
          value={data?.totals.tenants ?? "—"}
          hint={`${data?.totals.activeTenants ?? 0} aktif · ${data?.totals.frozenTenants ?? 0} dondurulmuş`}
          accent
        />
        <StatCard
          label="Bugün damga"
          value={data?.totals.stampsToday ?? "—"}
          hint="Tüm tenant’lar"
        />
        <StatCard
          label="Bugün ödül"
          value={data?.totals.redeemsToday ?? "—"}
          hint="Kullanılan ödüller"
        />
        <StatCard
          label="Tahmini MRR"
          value={data ? `₺${data.totals.estimatedMrr}` : "—"}
          hint="ACTIVE abonelikler toplamı"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Abonelik dağılımı"
              description="Tenant başına durum sayıları"
            />
          </div>
          <div className="p-5 sm:p-6">
            {statusRows.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Henüz kafe yok.</p>
            ) : (
              <ul className="space-y-3">
                {statusRows.map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          status === "ACTIVE" || status === "TRIAL"
                            ? "success"
                            : status === "SUSPENDED"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </div>
                    <span className="font-semibold tabular-nums text-[var(--ink)]">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Hızlı erişim"
              description="Sık kullanılan platform sayfaları"
            />
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-[var(--surface)] sm:px-6"
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">{link.label}</p>
                    <p className="text-xs text-[var(--muted)]">{link.hint}</p>
                  </div>
                  <span className="text-[var(--muted)]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Son eklenen kafeler"
              description="En yeni tenant kayıtları"
            />
          </div>
          {!data?.recentTenants.length ? (
            <SoftBox className="m-5 sm:m-6">
              <p className="text-sm text-[var(--muted)]">Henüz kafe yok.</p>
            </SoftBox>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.recentTenants.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ink)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      /{t.slug} · {t.customers} müşteri
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      tone={
                        t.subscriptionStatus === "ACTIVE" ||
                        t.subscriptionStatus === "TRIAL"
                          ? "success"
                          : "warning"
                      }
                    >
                      {STATUS_LABEL[t.subscriptionStatus] ?? t.subscriptionStatus}
                    </Badge>
                    {!t.isActive && (
                      <Badge tone="warning">Dondurulmuş</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Dikkat gerektiren"
              description="Dondurulmuş, askıda veya boş deneme hesapları"
            />
          </div>
          {!data?.needsAttention.length ? (
            <SoftBox className="m-5 sm:m-6">
              <p className="text-sm text-[var(--muted)]">
                Şu an kritik bir durum yok.
              </p>
            </SoftBox>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.needsAttention.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ink)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {t.reason} · {t.customers} müşteri
                    </p>
                  </div>
                  <Link href="/tenants" className={btnGhost()}>
                    Yönet
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
