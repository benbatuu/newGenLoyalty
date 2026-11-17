"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type SubStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: SubStatus;
  primaryColor: string | null;
  _count: { customers: number; users: number };
  rewardRule: { stampsRequired: number; rewardLabel: string } | null;
};

const STATUSES: SubStatus[] = ["TRIAL", "ACTIVE", "CANCELLED", "SUSPENDED"];
const STATUS_LABEL: Record<SubStatus, string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  SUSPENDED: "Askıda",
};

/** Abonelik durumuna göre renk (uygulama tokenları) */
const STATUS_STYLE: Record<SubStatus, string> = {
  ACTIVE: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-glow)]",
  TRIAL: "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]",
  CANCELLED: "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]",
  SUSPENDED: "bg-[var(--accent-soft)] text-[var(--accent-deep)] border-[var(--accent-glow)]",
};

type Filter = "ALL" | "FROZEN" | SubStatus;

export default function TenantsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <TenantsContent />
    </RequireAuth>
  );
}

function TenantsContent() {
  const { data: rows, error: loadError, loading, reload } = useApiQuery<TenantRow[]>(
    "tenants:list",
    "/tenants",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => rows ?? [], [rows]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      ALL: list.length,
      FROZEN: 0,
      TRIAL: 0,
      ACTIVE: 0,
      CANCELLED: 0,
      SUSPENDED: 0,
    };
    for (const t of list) {
      c[t.subscriptionStatus] += 1;
      if (!t.isActive) c.FROZEN += 1;
    }
    return c;
  }, [list]);

  const customers = useMemo(
    () => list.reduce((sum, t) => sum + t._count.customers, 0),
    [list],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((t) => {
      if (filter === "FROZEN" && t.isActive) return false;
      if (filter !== "ALL" && filter !== "FROZEN" && t.subscriptionStatus !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.planCode.toLowerCase().includes(q)
      );
    });
  }, [list, query, filter]);

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api("/tenants", {
        method: "POST",
        body: JSON.stringify({ name, slug, ownerEmail, ownerName, ownerPassword }),
      });
      setOk("Kafe oluşturuldu");
      setName("");
      setSlug("");
      setOwnerEmail("");
      setOwnerName("");
      setOwnerPassword("");
      setShowCreate(false);
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Oluşturma başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Partial<{ isActive: boolean; subscriptionStatus: SubStatus }>) {
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      await api(`/tenants/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setOk("Güncellendi");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !rows) {
    return <ListSkeleton rows={4} />;
  }

  const chips: Array<{ key: Filter; label: string }> = [
    { key: "ALL", label: "Tümü" },
    { key: "ACTIVE", label: "Aktif" },
    { key: "TRIAL", label: "Deneme" },
    { key: "SUSPENDED", label: "Askıda" },
    { key: "CANCELLED", label: "İptal" },
    { key: "FROZEN", label: "Dondurulmuş" },
  ];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="İşletmeler"
        subtitle="Kafe hesaplarını açın, abonelik durumunu yönetin ve dondurun."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform" className={btnGhost()}>
              ← Özet
            </Link>
            <button type="button" className={btnPrimary()} onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Formu gizle" : "Yeni kafe"}
            </button>
          </div>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      {/* Özet */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Toplam kafe" value={list.length} hint="Tüm işletmeler" accent />
        <Kpi label="Açık" value={list.length - counts.FROZEN} hint="Hesabı erişilebilir" />
        <Kpi label="Dondurulmuş" value={counts.FROZEN} hint="Erişimi kapalı" />
        <Kpi label="Toplam müşteri" value={customers} hint="Tüm kafelerde" />
      </div>

      {showCreate && (
        <Panel>
          <PanelHeader title="Yeni kafe" description="Sahip hesabı bu bilgilerle oluşturulur." />
          <form onSubmit={createTenant} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Kafe adı">
              <input className={inputClassName()} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Slug">
              <input
                className={inputClassName()}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="ornek-kafe"
                required
              />
            </Field>
            <Field label="Sahip adı">
              <input className={inputClassName()} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            </Field>
            <Field label="Sahip e-posta">
              <input
                className={inputClassName()}
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Sahip şifresi">
              <input
                className={inputClassName()}
                type="password"
                autoComplete="new-password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <div className="flex items-end">
              <button type="submit" className={`${btnPrimary()} w-full`} disabled={saving}>
                {saving ? "Oluşturuluyor…" : "Kafe oluştur"}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Liste */}
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
        <div className="space-y-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Kafe listesi</h2>
              <p className="text-xs text-[var(--muted)]">
                {filtered.length} / {list.length} kayıt
              </p>
            </div>
            <input
              className={inputClassName() + " sm:w-72"}
              placeholder="Ad, slug veya plan ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key)}
                  className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {c.label}
                  <span className="tabular-nums opacity-70">{counts[c.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={list.length === 0 ? "Henüz kafe yok" : "Sonuç yok"}
              description={
                list.length === 0 ? "Yeni kafe butonuyla ilk işletmeyi oluşturun." : "Arama veya filtreyi değiştirin."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-sm">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-6 py-3 text-left font-semibold">Kafe</th>
                  <th className="px-3 py-3 text-left font-semibold">Durum</th>
                  <th className="px-3 py-3 text-left font-semibold">Paket</th>
                  <th className="px-3 py-3 text-right font-semibold">Müşteri</th>
                  <th className="px-3 py-3 text-right font-semibold">Kullanıcı</th>
                  <th className="px-6 py-3 text-right font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filtered.map((t) => (
                  <tr key={t.id} className="align-middle transition hover:bg-[var(--surface)]">
                    <td className="px-6 py-3.5">
                      <Link href={`/tenants/${t.id}`} className="truncate font-medium text-[var(--ink)] hover:text-[var(--accent)]">{t.name}</Link>
                      <p className="truncate text-xs text-[var(--muted)]">/{t.slug}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill tenant={t} />
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[var(--ink)]">{t.planCode}</p>
                      <p className="text-xs tabular-nums text-[var(--muted)]">₺{t.planPriceTry}/ay</p>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-[var(--ink)]">{t._count.customers}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-[var(--ink)]">{t._count.users}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <select
                          aria-label="Abonelik durumu"
                          className={inputClassName() + " h-8 w-32 py-1 text-xs"}
                          value={t.subscriptionStatus}
                          disabled={busyId === t.id}
                          onChange={(e) => void patch(t.id, { subscriptionStatus: e.target.value as SubStatus })}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        <Link href={`/tenants/${t.id}`} className={btnGhost() + " h-8 px-3 text-xs leading-8"}>
                          Detay
                        </Link>
                        <button
                          type="button"
                          className={btnGhost() + " h-8 px-3 text-xs"}
                          disabled={busyId === t.id || !t.isActive}
                          onClick={() => void patch(t.id, { isActive: false })}
                        >
                          Dondur
                        </button>
                        {!t.isActive ? (
                          <button
                            type="button"
                            className={btnPrimary() + " h-8 px-3 text-xs"}
                            disabled={busyId === t.id}
                            onClick={() => void patch(t.id, { isActive: true })}
                          >
                            Aç
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Tek durum: dondurulmuş hesap her zaman öncelikli gösterilir */
function StatusPill({ tenant }: { tenant: TenantRow }) {
  if (!tenant.isActive) {
    return <Pill className="bg-[var(--surface)] text-[var(--muted)] border-[var(--line-strong)]">Dondurulmuş</Pill>;
  }
  return <Pill className={STATUS_STYLE[tenant.subscriptionStatus]}>{STATUS_LABEL[tenant.subscriptionStatus]}</Pill>;
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-[var(--shadow-sm)] ${
        accent ? "border-[var(--accent-glow)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel)]"
      }`}
    >
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
