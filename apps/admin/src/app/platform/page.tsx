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
  btnGhost,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type DaySeries = { date: string; stamps: number; redeems: number; signups: number };

type PlatformOverview = {
  reports: {
    series: DaySeries[];
    byPlan: Array<{ plan: string; tenants: number; activeTenants: number; mrr: number }>;
    topTenants: Array<{ id: string; name: string; slug: string; customers: number; plan: string }>;
    trialEnding: Array<{ id: string; name: string; slug: string; daysLeft: number; customers: number }>;
    paidSharePercent: number;
    churnSharePercent: number;
  };
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
  byStatus: { TRIAL: number; ACTIVE: number; CANCELLED: number; SUSPENDED: number };
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

/** Uygulama kırmızısının yarı saydam tonu (tokenlardan türetilir) */
const TINT = "color-mix(in srgb, var(--accent) 50%, transparent)";

const STATUS_COLOR: Record<string, string> = {
  TRIAL: TINT,
  ACTIVE: "var(--accent)",
  CANCELLED: "var(--muted)",
  SUSPENDED: "var(--accent-deep)",
};

/** Marka tonları: kırmızı ana renk ve açık kırmızı tonu */

const PLAN_LABEL: Record<string, string> = {
  cafe: "Kafe",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

const tr = (n: number) => n.toLocaleString("tr-TR");
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export default function PlatformPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <PlatformContent />
    </RequireAuth>
  );
}

function PlatformContent() {
  const { data, error, loading, refreshing, reload } = useApiQuery<PlatformOverview>(
    "platform:overview",
    "/tenants/platform/overview",
  );

  const statusRows = useMemo(() => {
    if (!data) return [];
    return (Object.keys(STATUS_LABEL) as Array<keyof PlatformOverview["byStatus"]>).map((k) => ({
      key: k,
      count: data.byStatus[k],
    }));
  }, [data]);

  if (loading && !data) {
    return <PageSkeleton cards={6} />;
  }

  const t = data?.totals;
  const r = data?.reports;
  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Platform yönetimi"
        title="Genel bakış"
        subtitle="Tüm kafelerin durumu, gelirler ve dikkat gerektiren hesaplar."
        actions={
          <div className="flex flex-wrap gap-2">
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
      <ErrorBanner message={error} />

      {/* Özet kartı */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{today}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {t ? tr(t.tenants) : "—"} kafe · ₺{t ? tr(t.estimatedMrr) : "—"} MRR
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Bugün {t ? tr(t.stampsToday) : 0} damga, {t ? tr(t.redeemsToday) : 0} ödül kullanımı.{" "}
              {t ? tr(t.activeTenants) : 0} hesap açık, {t ? tr(t.frozenTenants) : 0} dondurulmuş.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/tenants"
                className="inline-flex h-9 items-center rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-deep)]"
              >
                İşletmeleri yönet
              </Link>
              <Link
                href="/platform/subscriptions"
                className="inline-flex h-9 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel)]"
              >
                Abonelikler
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Müşteri", t?.totalCustomers],
                ["Wallet kartı", t?.applePassCount],
                ["Kullanıcı", t?.totalUsers],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                <p className="mt-1 font-display text-2xl tabular-nums text-[var(--ink)]">
                  {value != null ? tr(value) : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPI kartları */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Toplam kafe" value={t ? tr(t.tenants) : "—"} hint={`${t?.activeTenants ?? 0} açık · ${t?.frozenTenants ?? 0} dondurulmuş`} />
        <Kpi label="Ödeyen (aktif)" value={data ? tr(data.byStatus.ACTIVE) : "—"} hint={`Ödeyen oranı %${r?.paidSharePercent ?? 0}`} />
        <Kpi label="Deneme" value={data ? tr(data.byStatus.TRIAL) : "—"} hint={`${r?.trialEnding.length ?? 0} hesap 7 gün içinde bitiyor`} />
        <Kpi label="Tahmini MRR" value={t ? `₺${tr(t.estimatedMrr)}` : "—"} hint="Aktif aboneliklerin toplamı" />
      </div>

      {/* Aktivite & kayıt grafikleri */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader title="Son 14 gün aktivite" description="Günlük damga ve ödül kullanımı" />
          </div>
          <div className="p-5 sm:p-6">
            <BarChart series={r?.series ?? []} pick={(s) => s.stamps} color="var(--accent)" />
            <Legend items={[["var(--accent)", "Damga"]]} />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Mini label="Toplam damga (14 gün)" value={tr(sum(r?.series, "stamps"))} />
              <Mini label="Toplam ödül (14 gün)" value={tr(sum(r?.series, "redeems"))} />
            </div>
          </div>
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader title="Yeni kayıtlar" description="Son 14 günde açılan kafe hesapları" />
          </div>
          <div className="p-5 sm:p-6">
            <BarChart series={r?.series ?? []} pick={(s) => s.signups} color={TINT} />
            <Legend items={[[TINT, "Yeni kafe"]]} />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Mini label="Yeni kafe (14 gün)" value={tr(sum(r?.series, "signups"))} />
              <Mini label="Kayıptan (iptal) oranı" value={`%${r?.churnSharePercent ?? 0}`} />
            </div>
          </div>
        </Panel>
      </div>

      {/* Abonelik ve paket dağılımı */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader title="Abonelik dağılımı" description="Kafe sayısına göre durum" />
          </div>
          <ul className="space-y-4 p-5 sm:p-6">
            {statusRows.map(({ key, count }) => {
              const total = t?.tenants || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <li key={key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[var(--ink)]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[key] }} />
                      {STATUS_LABEL[key]}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {count} · %{pct}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: STATUS_COLOR[key] }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader title="Paket dağılımı" description="Paket bazında kafe ve tahmini gelir" />
          </div>
          {!r?.byPlan.length ? (
            <SoftBox className="m-5 sm:m-6">
              <p className="text-sm text-[var(--muted)]">Henüz kafe yok.</p>
            </SoftBox>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                    <th className="px-5 py-3 font-semibold sm:px-6">Paket</th>
                    <th className="px-3 py-3 text-right font-semibold">Kafe</th>
                    <th className="px-3 py-3 text-right font-semibold">Açık</th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">MRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {r.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td className="px-5 py-3 font-medium text-[var(--ink)] sm:px-6">{PLAN_LABEL[p.plan] ?? p.plan}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.tenants}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.activeTenants}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--ink)] sm:px-6">₺{tr(p.mrr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Listeler */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ListPanel title="En çok müşterisi olan" description="Müşteri sayısına göre ilk 5 kafe">
          {!r?.topTenants.length ? (
            <Empty text="Henüz kafe yok." />
          ) : (
            r.topTenants.map((x) => (
              <Row key={x.id} title={x.name} sub={`/${x.slug} · ${PLAN_LABEL[x.plan] ?? x.plan}`} right={<span className="tabular-nums text-sm text-[var(--ink)]">{tr(x.customers)}</span>} />
            ))
          )}
        </ListPanel>

        <ListPanel title="Deneme bitiyor" description="7 gün içinde süresi dolacak hesaplar">
          {!r?.trialEnding.length ? (
            <Empty text="Yakında bitecek deneme yok." />
          ) : (
            r.trialEnding.map((x) => (
              <Row
                key={x.id}
                title={x.name}
                sub={`${x.customers} müşteri`}
                right={<Badge tone={x.daysLeft <= 2 ? "warning" : "neutral"}>{x.daysLeft === 0 ? "Bugün" : `${x.daysLeft} gün`}</Badge>}
              />
            ))
          )}
        </ListPanel>

        <ListPanel title="Dikkat gerektiren" description="Dondurulmuş, askıda veya boş deneme">
          {!data?.needsAttention.length ? (
            <Empty text="Şu an kritik bir durum yok." />
          ) : (
            data.needsAttention.map((x) => (
              <Row
                key={x.id}
                title={x.name}
                sub={`${x.reason} · ${x.customers} müşteri`}
                right={
                  <Link href="/tenants" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                    Yönet
                  </Link>
                }
              />
            ))
          )}
        </ListPanel>
      </div>

      <ListPanel title="Son eklenen kafeler" description="En yeni kayıtlar">
        {!data?.recentTenants.length ? (
          <Empty text="Henüz kafe yok." />
        ) : (
          data.recentTenants.map((x) => (
            <Row
              key={x.id}
              title={x.name}
              sub={`/${x.slug} · ${x.customers} müşteri · ${new Date(x.createdAt).toLocaleDateString("tr-TR")}`}
              right={
                <div className="flex items-center gap-2">
                  <Badge tone={x.subscriptionStatus === "ACTIVE" || x.subscriptionStatus === "TRIAL" ? "success" : "warning"}>
                    {STATUS_LABEL[x.subscriptionStatus] ?? x.subscriptionStatus}
                  </Badge>
                  {!x.isActive ? <Badge tone="warning">Dondurulmuş</Badge> : null}
                </div>
              }
            />
          ))
        )}
      </ListPanel>
    </div>
  );
}

function sum(series: DaySeries[] | undefined, key: "stamps" | "redeems" | "signups") {
  return (series ?? []).reduce((acc, s) => acc + s[key], 0);
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-[var(--ink)]">{value}</p>
    </div>
  );
}

function Legend({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
      {items.map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function BarChart({ series, pick, color }: { series: DaySeries[]; pick: (s: DaySeries) => number; color: string }) {
  const max = Math.max(1, ...series.map(pick));
  return (
    <div className="flex h-44 items-end gap-1.5">
      {series.map((s) => {
        const v = pick(s);
        const h = Math.max(v > 0 ? 6 : 2, Math.round((v / max) * 100));
        return (
          <div key={s.date} className="group flex h-full flex-1 flex-col justify-end">
            <div
              className="relative w-full rounded-t-md transition-[height] duration-500"
              style={{ height: `${h}%`, background: color, opacity: v > 0 ? 1 : 0.25 }}
              title={`${dayLabel(s.date)}: ${v}`}
            >
              <span className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-[var(--ink)] group-hover:block">
                {v}
              </span>
            </div>
            <span className="mt-1.5 truncate text-center text-[9px] text-[var(--muted)]">
              {new Date(`${s.date}T00:00:00`).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ListPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Panel padded={false}>
      <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
        <PanelHeader title={title} description={description} />
      </div>
      <ul className="divide-y divide-[var(--line)]">{children}</ul>
    </Panel>
  );
}

function Row({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--ink)]">{title}</p>
        <p className="truncate text-xs text-[var(--muted)]">{sub}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <li className="px-5 py-6 text-sm text-[var(--muted)] sm:px-6">{text}</li>
  );
}
