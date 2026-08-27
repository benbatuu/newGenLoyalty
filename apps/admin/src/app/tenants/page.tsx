"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  StatCard,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  primaryColor: string | null;
  _count: { customers: number; users: number };
  rewardRule: { stampsRequired: number; rewardLabel: string } | null;
};

const STATUSES = ["TRIAL", "ACTIVE", "CANCELLED", "SUSPENDED"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  SUSPENDED: "Askıda",
};

export default function TenantsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <TenantsContent />
    </RequireAuth>
  );
}

function TenantsContent() {
  const { data: rows, error: loadError, loading, reload } = useApiQuery<
    TenantRow[]
  >("tenants:list", "/tenants", { ttlMs: 20_000 });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE_ONLY" | "FROZEN" | (typeof STATUSES)[number]
  >("ALL");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("Password123!");
  const [saving, setSaving] = useState(false);

  const list = rows ?? [];

  const summary = useMemo(() => {
    let active = 0;
    let frozen = 0;
    let customers = 0;
    for (const t of list) {
      if (t.isActive) active += 1;
      else frozen += 1;
      customers += t._count.customers;
    }
    return { total: list.length, active, frozen, customers };
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((t) => {
      if (statusFilter === "ACTIVE_ONLY" && !t.isActive) return false;
      if (statusFilter === "FROZEN" && t.isActive) return false;
      if (
        statusFilter !== "ALL" &&
        statusFilter !== "ACTIVE_ONLY" &&
        statusFilter !== "FROZEN" &&
        t.subscriptionStatus !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.planCode.toLowerCase().includes(q)
      );
    });
  }, [list, query, statusFilter]);

  function bustTenantCaches() {
    bustCache("tenants");
    bustCache("platform");
  }

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api("/tenants", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          ownerEmail,
          ownerName,
          ownerPassword,
        }),
      });
      setOk("Kafe oluşturuldu");
      setName("");
      setSlug("");
      setOwnerEmail("");
      setOwnerName("");
      setShowCreate(false);
      bustTenantCaches();
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Oluşturma başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function patch(
    id: string,
    body: Partial<{ isActive: boolean; subscriptionStatus: string }>,
  ) {
    setError(null);
    setOk(null);
    try {
      await api(`/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setOk("Güncellendi");
      bustTenantCaches();
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    }
  }

  if (loading && !rows) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Platform"
        title="Kafeler"
        subtitle="Tenant oluştur, dondur ve abonelik durumunu yönet."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform" className={btnGhost()}>
              ← Özet
            </Link>
            <button
              type="button"
              className={btnPrimary()}
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? "Formu gizle" : "Yeni kafe"}
            </button>
          </div>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam kafe" value={summary.total} accent />
        <StatCard label="Aktif" value={summary.active} />
        <StatCard label="Dondurulmuş" value={summary.frozen} />
        <StatCard
          label="Toplam müşteri"
          value={summary.customers}
          hint="Tüm tenant’lar"
        />
      </div>

      {showCreate && (
        <Panel>
          <PanelHeader
            title="Yeni kafe"
            description="Sahip hesabı otomatik oluşturulur."
          />
          <form
            onSubmit={createTenant}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Kafe adı">
              <input
                className={inputClassName()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
              <input
                className={inputClassName()}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
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
            <Field label="Sahip şifre">
              <input
                className={inputClassName()}
                type="text"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="submit"
                className={`${btnPrimary()} w-full`}
                disabled={saving}
              >
                {saving ? "Kaydediliyor…" : "Kafe oluştur"}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader
            title="Kafe listesi"
            description={`${filtered.length} / ${list.length} kayıt`}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className={inputClassName() + " sm:max-w-sm"}
              placeholder="Ad, slug veya plan ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={inputClassName() + " w-auto"}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <option value="ALL">Tümü</option>
              <option value="ACTIVE_ONLY">Sadece açık</option>
              <option value="FROZEN">Dondurulmuş</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  Abonelik: {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title={list.length === 0 ? "Henüz kafe yok" : "Sonuç yok"}
              description={
                list.length === 0
                  ? "Yeni kafe butonuyla ilk tenant’ı oluştur."
                  : "Arama veya filtreyi değiştir."
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {filtered.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--ink)]">{t.name}</p>
                    <Badge tone={t.isActive ? "success" : "warning"}>
                      {t.isActive ? "Aktif" : "Dondurulmuş"}
                    </Badge>
                    <Badge
                      tone={
                        t.subscriptionStatus === "ACTIVE" ||
                        t.subscriptionStatus === "TRIAL"
                          ? "success"
                          : t.subscriptionStatus === "SUSPENDED"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {STATUS_LABEL[t.subscriptionStatus]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    /{t.slug} · {t._count.customers} müşteri · {t._count.users}{" "}
                    kullanıcı · ₺{t.planPriceTry}/{t.planCode}
                    {t.rewardRule
                      ? ` · ${t.rewardRule.stampsRequired} damga → ${t.rewardRule.rewardLabel}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={inputClassName() + " w-auto"}
                    value={t.subscriptionStatus}
                    onChange={(e) =>
                      void patch(t.id, {
                        subscriptionStatus: e.target.value,
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={btnGhost()}
                    onClick={() =>
                      void patch(t.id, { subscriptionStatus: "ACTIVE" })
                    }
                    disabled={t.subscriptionStatus === "ACTIVE"}
                  >
                    Aktifleştir
                  </button>
                  <button
                    type="button"
                    className={btnGhost()}
                    onClick={() =>
                      void patch(t.id, { isActive: !t.isActive })
                    }
                  >
                    {t.isActive ? "Dondur" : "Aç"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
