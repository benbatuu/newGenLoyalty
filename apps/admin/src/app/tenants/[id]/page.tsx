"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ErrorBanner,
  ListSkeleton,
  Panel,
  PanelHeader,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
} from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

type SubStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";

type Overview = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    planCode: string;
    planPriceTry: number;
    subscriptionStatus: SubStatus;
    subscriptionActivatedAt: string | null;
    subscriptionPeriodEndsAt: string | null;
    subscriptionCancelledAt: string | null;
    subscriptionAccessEndsAt: string | null;
    subscriptionSuspendedAt: string | null;
    subscriptionSuspendUntil: string | null;
    deletionRequestedAt: string | null;
    deletionScheduledAt: string | null;
    deletionReason: string | null;
    createdAt: string;
    rewardRule: { stampsRequired: number; rewardLabel: string } | null;
  };
  totals: {
    customers: number;
    users: number;
    passes: number;
    branches: number;
    stamps30: number;
    redeems30: number;
    lastActivityAt: string | null;
  };
  branches: Array<{ id: string; name: string; isActive: boolean }>;
  programs: Array<{ id: string; name: string; type: string; isActive: boolean; isPrimary: boolean }>;
  users: Array<{ id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }>;
};

const STATUS_LABEL: Record<SubStatus, string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  SUSPENDED: "Askıda",
};
const STATUSES: SubStatus[] = ["TRIAL", "ACTIVE", "CANCELLED", "SUSPENDED"];
const ROLE_LABEL: Record<string, string> = {
  STORE_OWNER: "Sahip",
  CASHIER: "Kasiyer",
  SUPER_ADMIN: "Süper admin",
};
const PROGRAM_LABEL: Record<string, string> = {
  STAMP_CARD: "Damga kartı",
  MULTI_STAMP: "Çoklu damga",
  POINT_CARD: "Puan kartı",
  DISCOUNT_CARD: "İndirim kartı",
  EVENT_CARD: "Etkinlik kartı",
  STAFF_CARD: "Personel kartı",
  MEMBERSHIP_CARD: "Üyelik kartı",
  CASHBACK_CARD: "Cashback kartı",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function TenantDetailPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <TenantDetailContent />
    </RequireAuth>
  );
}

function TenantDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, error: loadError, loading, reload } = useApiQuery<Overview>(
    `tenant:overview:${id}`,
    `/tenants/${id}/overview`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function patch(body: Partial<{ isActive: boolean; subscriptionStatus: SubStatus }>, message: string) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api(`/tenants/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setOk(message);
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <ListSkeleton rows={4} />;

  if (!data) {
    return (
      <div className="w-full space-y-4">
        <Link href="/tenants" className={btnGhost()}>← İşletmeler</Link>
        <ErrorBanner message={loadError || "İşletme bulunamadı"} />
      </div>
    );
  }

  const t = data.tenant;
  const totals = data.totals;
  const deleting = !!t.deletionScheduledAt;

  return (
    <div className="w-full space-y-6">
      {/* Başlık */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/tenants" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]">
            ← İşletmeler
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">{t.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            /{t.slug} · {new Date(t.createdAt).toLocaleDateString("tr-TR")} tarihinde açıldı
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill className={t.isActive ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]" : "bg-[var(--surface)] text-[var(--muted)] border-[var(--line-strong)]"}>
              {t.isActive ? "Hesap açık" : "Dondurulmuş"}
            </Pill>
            <Pill className="bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]">
              {STATUS_LABEL[t.subscriptionStatus]}
            </Pill>
            <Pill className="bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]">
              {t.planCode} · ₺{t.planPriceTry}/ay
            </Pill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.isActive ? (
            <button type="button" className={btnGhost()} disabled={busy} onClick={() => void patch({ isActive: false }, "Hesap donduruldu")}>
              Dondur
            </button>
          ) : (
            <button type="button" className={btnPrimary()} disabled={busy} onClick={() => void patch({ isActive: true }, "Hesap açıldı")}>
              Hesabı aç
            </button>
          )}
        </div>
      </header>

      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      {deleting ? (
        <div className="rounded-xl border border-[var(--accent-glow)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink)]">
          Silme talebi var: {fmtDate(t.deletionScheduledAt)} tarihinde silinecek.
          {t.deletionReason ? <span className="text-[var(--muted)]"> Sebep: {t.deletionReason}</span> : null}
        </div>
      ) : null}

      {/* Özet */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Müşteri" value={totals.customers} hint={`${totals.passes} wallet kartı`} accent />
        <Kpi label="Damga (30 gün)" value={totals.stamps30} hint={`${totals.redeems30} ödül kullanımı`} />
        <Kpi label="Kullanıcı" value={totals.users} hint={`${totals.branches} şube`} />
        <Kpi label="Son hareket" value={totals.lastActivityAt ? new Date(totals.lastActivityAt).toLocaleDateString("tr-TR") : "—"} hint="Son damga ya da ödül" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Abonelik */}
        <Panel>
          <PanelHeader title="Abonelik" description="Durum değiştirmek için aşağıyı kullanın" />
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Field label="Durum" value={STATUS_LABEL[t.subscriptionStatus]} />
            <Field label="Paket" value={`${t.planCode} · ₺${t.planPriceTry}/ay`} />
            <Field label="Aktivasyon" value={fmtDate(t.subscriptionActivatedAt)} />
            <Field label="Dönem sonu" value={fmtDate(t.subscriptionPeriodEndsAt)} />
            <Field label="İptal tarihi" value={fmtDate(t.subscriptionCancelledAt)} />
            <Field label="Erişim bitişi" value={fmtDate(t.subscriptionAccessEndsAt)} />
            <Field label="Askıya alma" value={fmtDate(t.subscriptionSuspendedAt)} />
            <Field label="Askı bitişi" value={fmtDate(t.subscriptionSuspendUntil)} />
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
            <select
              aria-label="Abonelik durumu"
              className="h-9 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
              value={t.subscriptionStatus}
              disabled={busy}
              onChange={(e) => void patch({ subscriptionStatus: e.target.value as SubStatus }, "Abonelik güncellendi")}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {t.subscriptionStatus !== "ACTIVE" ? (
              <button type="button" className={btnPrimary()} disabled={busy} onClick={() => void patch({ subscriptionStatus: "ACTIVE" }, "Abonelik aktifleştirildi")}>
                Aktifleştir
              </button>
            ) : null}
          </div>
        </Panel>

        {/* Program & ödül */}
        <Panel>
          <PanelHeader title="Sadakat programı" description="Kartlar ve ödül kuralı" />
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
              <p className="text-xs text-[var(--muted)]">Ödül kuralı</p>
              <p className="mt-1 font-medium text-[var(--ink)]">
                {t.rewardRule ? `${t.rewardRule.stampsRequired} damga → ${t.rewardRule.rewardLabel}` : "Tanımlı değil"}
              </p>
            </div>
            {data.programs.length === 0 ? (
              <p className="text-[var(--muted)]">Kart tanımlı değil.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {data.programs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">{p.name}</p>
                      <p className="text-xs text-[var(--muted)]">{PROGRAM_LABEL[p.type] ?? p.type}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {p.isPrimary ? <Pill className="bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]">Ana</Pill> : null}
                      <Pill className={p.isActive ? "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]" : "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]"}>
                        {p.isActive ? "Açık" : "Kapalı"}
                      </Pill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      {/* Kullanıcılar */}
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <h2 className="font-display text-base font-semibold text-[var(--ink)]">Kullanıcılar</h2>
          <p className="text-xs text-[var(--muted)]">{data.users.length} hesap</p>
        </div>
        {data.users.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">Kullanıcı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] table-fixed text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[34%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Ad</th>
                  <th className="px-3 py-3 font-semibold">E-posta</th>
                  <th className="px-3 py-3 font-semibold">Rol</th>
                  <th className="px-3 py-3 font-semibold">Durum</th>
                  <th className="px-6 py-3 font-semibold">Eklendi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.users.map((u) => (
                  <tr key={u.id} className="align-middle hover:bg-[var(--surface)]">
                    <td className="truncate px-6 py-3 font-medium text-[var(--ink)]">{u.name}</td>
                    <td className="truncate px-3 py-3 text-[var(--muted)]">{u.email}</td>
                    <td className="px-3 py-3 text-[var(--ink)]">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="px-3 py-3">
                      <Pill className={u.isActive ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]" : "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]"}>
                        {u.isActive ? "Aktif" : "Pasif"}
                      </Pill>
                    </td>
                    <td className="px-6 py-3 text-xs text-[var(--muted)]">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Şubeler */}
      {data.branches.length > 0 ? (
        <Panel>
          <PanelHeader title="Şubeler" description={`${data.branches.length} şube`} />
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.branches.map((b) => (
              <li key={b.id}>
                <Pill className={b.isActive ? "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]" : "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]"}>
                  {b.name}
                  {!b.isActive ? " · pasif" : ""}
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
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
