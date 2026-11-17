"use client";

import { useMemo, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../../components/ui";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { ApiError, api } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

const PROGRAM_TYPES = [
  "STAMP_CARD",
  "MULTI_STAMP",
  "POINT_CARD",
  "CASHBACK_CARD",
  "DISCOUNT_CARD",
  "EVENT_CARD",
  "MEMBERSHIP_CARD",
  "STAFF_CARD",
] as const;

const MENU_KEYS = [
  { key: "counter", label: "Tezgâh" },
  { key: "reports", label: "Raporlar" },
  { key: "onboarding", label: "Kurulum" },
  { key: "customers", label: "Müşteriler" },
  { key: "reward", label: "Ödül / kartlar" },
  { key: "settings", label: "Kart tasarımı" },
  { key: "business", label: "Kayıt sayfası (+ masa QR)" },
  { key: "notifications", label: "Bildirimler" },
  { key: "campaigns", label: "Kampanyalar" },
  { key: "branches", label: "Şubeler" },
  { key: "segments", label: "Segmentler" },
  { key: "vip", label: "VIP" },
  { key: "referrals", label: "Referans" },
  { key: "pos", label: "POS" },
  { key: "staff", label: "Kasiyerler" },
  { key: "billing", label: "Abonelik" },
  { key: "help", label: "Yardım" },
  { key: "metrics", label: "Özet (eski → raporlar)" },
  { key: "table-tent", label: "Masa QR (eski → kayıt sayfası)" },
] as const;

type PlanRow = {
  id: string;
  code: string;
  labelTr: string;
  labelEn: string | null;
  priceTry: number;
  maxPrograms: number;
  allowedProgramTypes: string[];
  maxByType: Record<string, number>;
  features: string[];
  menuKeys: string[];
  maxBranches: number;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  badgeTr: string | null;
  badgeEn: string | null;
  noteTr: string | null;
  noteEn: string | null;
  includesTr: string[];
  includesEn: string[];
  tenantCount: number;
};

type PlanForm = {
  code: string;
  labelTr: string;
  labelEn: string;
  priceTry: number;
  maxPrograms: number;
  maxBranches: number;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  badgeTr: string;
  badgeEn: string;
  noteTr: string;
  noteEn: string;
  allowedProgramTypes: string[];
  menuKeys: string[];
  features: string;
  includesTr: string;
  includesEn: string;
  maxByTypeJson: string;
};

const emptyForm = (): PlanForm => ({
  code: "",
  labelTr: "",
  labelEn: "",
  priceTry: 990,
  maxPrograms: 1,
  maxBranches: 1,
  sortOrder: 100,
  isActive: true,
  isPublic: false,
  badgeTr: "",
  badgeEn: "",
  noteTr: "",
  noteEn: "",
  allowedProgramTypes: ["STAMP_CARD"],
  menuKeys: ["counter", "reports", "reward", "settings", "billing", "help"],
  features: "wallet",
  includesTr: "",
  includesEn: "",
  maxByTypeJson: '{"STAMP_CARD": 1}',
});

function planToForm(p: PlanRow): PlanForm {
  return {
    code: p.code,
    labelTr: p.labelTr,
    labelEn: p.labelEn ?? "",
    priceTry: p.priceTry,
    maxPrograms: p.maxPrograms,
    maxBranches: p.maxBranches,
    sortOrder: p.sortOrder,
    isActive: p.isActive,
    isPublic: p.isPublic,
    badgeTr: p.badgeTr ?? "",
    badgeEn: p.badgeEn ?? "",
    noteTr: p.noteTr ?? "",
    noteEn: p.noteEn ?? "",
    allowedProgramTypes: p.allowedProgramTypes,
    menuKeys: p.menuKeys,
    features: p.features.join(", "),
    includesTr: p.includesTr.join("\n"),
    includesEn: p.includesEn.join("\n"),
    maxByTypeJson: JSON.stringify(p.maxByType, null, 2),
  };
}

function formToPayload(form: PlanForm, editing: boolean) {
  let maxByType: Record<string, number> = {};
  try {
    maxByType = JSON.parse(form.maxByTypeJson || "{}") as Record<string, number>;
  } catch {
    throw new Error("maxByType geçerli JSON olmalı");
  }
  const payload = {
    labelTr: form.labelTr.trim(),
    labelEn: form.labelEn.trim() || null,
    priceTry: form.priceTry,
    maxPrograms: form.maxPrograms,
    maxBranches: form.maxBranches,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
    isPublic: form.isPublic,
    badgeTr: form.badgeTr.trim() || null,
    badgeEn: form.badgeEn.trim() || null,
    noteTr: form.noteTr.trim() || null,
    noteEn: form.noteEn.trim() || null,
    allowedProgramTypes: form.allowedProgramTypes,
    menuKeys: form.menuKeys,
    features: form.features
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    includesTr: form.includesTr
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    includesEn: form.includesEn
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    maxByType,
  };
  if (!editing) {
    return { code: form.code.trim(), ...payload };
  }
  return payload;
}

export default function PlatformPlansPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <PlansContent />
    </RequireAuth>
  );
}

const SECTION = "rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)] sm:p-6";
const LABEL = "text-xs font-medium text-[var(--muted)]";
const INPUT = inputClassName();

function PlansContent() {
  const { data, error: loadError, loading, reload } = useApiQuery<PlanRow[]>(
    "platform-plans",
    "/platform/plans",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [form, setForm] = useState<PlanForm>(emptyForm());
  const [editCode, setEditCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlanRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = data ?? [];
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.priceTry - b.priceTry),
    [rows],
  );

  function openCreate() {
    setForm(emptyForm());
    setEditCode(null);
    setMode("create");
    setError(null);
    setOk(null);
  }

  function openEdit(row: PlanRow) {
    setForm(planToForm(row));
    setEditCode(row.code);
    setMode("edit");
    setError(null);
    setOk(null);
  }

  function toggleArray(field: "allowedProgramTypes" | "menuKeys", value: string) {
    setForm((f) => {
      const set = new Set(f[field]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...f, [field]: [...set] };
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payload = formToPayload(form, mode === "edit");
      if (mode === "create") {
        await api("/platform/plans", { method: "POST", body: JSON.stringify(payload) });
        setOk("Paket oluşturuldu");
      } else if (editCode) {
        await api(`/platform/plans/${editCode}`, { method: "PATCH", body: JSON.stringify(payload) });
        setOk("Paket güncellendi");
      }
      await reload(true);
      setMode("list");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    setOk(null);
    try {
      await api(`/platform/plans/${pendingDelete.code}`, { method: "DELETE" });
      setOk("Paket silindi");
      setPendingDelete(null);
      await reload(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  const confirmDialog = (
    <ConfirmDialog
      open={!!pendingDelete}
      title={`${pendingDelete?.labelTr ?? ""} paketi silinsin mi?`}
      confirmLabel="Paketi sil"
      danger
      busy={deleting}
      onConfirm={() => void confirmRemove()}
      onCancel={() => setPendingDelete(null)}
    >
      Bu işlem geri alınamaz. Pakete bağlı kafe yoksa silinir.
    </ConfirmDialog>
  );

  if (mode !== "list") {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          eyebrow="Paketler"
          title={mode === "create" ? "Yeni paket" : `Düzenle: ${editCode}`}
          subtitle="Kota, menü ve web sitesi içeriğini düzenleyin. Sağdaki önizleme kaydetmeden önce sonucu gösterir."
          actions={
            <div className="flex gap-2">
              <button type="button" className={btnGhost()} onClick={() => setMode("list")}>
                Vazgeç
              </button>
              <button type="button" className={btnPrimary()} disabled={saving} onClick={save}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          }
        />
        <ErrorBanner message={error || loadError} />
        <SuccessBanner message={ok} />

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <section className={SECTION}>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Kimlik ve fiyat</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {mode === "create" && (
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className={LABEL}>Kod</span>
                    <input className={INPUT} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="growth" />
                  </label>
                )}
                <label className="space-y-1.5">
                  <span className={LABEL}>Ad (TR)</span>
                  <input className={INPUT} value={form.labelTr} onChange={(e) => setForm({ ...form, labelTr: e.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className={LABEL}>Ad (EN)</span>
                  <input className={INPUT} value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className={LABEL}>Fiyat (TL/ay)</span>
                  <input type="number" className={INPUT} value={form.priceTry} onChange={(e) => setForm({ ...form, priceTry: Number(e.target.value) || 0 })} />
                </label>
                <label className="space-y-1.5">
                  <span className={LABEL}>Sıralama</span>
                  <input type="number" className={INPUT} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
                </label>
              </div>
            </section>

            <section className={SECTION}>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Limitler</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={LABEL}>Maksimum kart</span>
                  <input type="number" className={INPUT} value={form.maxPrograms} onChange={(e) => setForm({ ...form, maxPrograms: Number(e.target.value) || 1 })} />
                </label>
                <label className="space-y-1.5">
                  <span className={LABEL}>Maksimum şube</span>
                  <input type="number" className={INPUT} value={form.maxBranches} onChange={(e) => setForm({ ...form, maxBranches: Number(e.target.value) || 1 })} />
                </label>
              </div>
              <label className="mt-4 block space-y-1.5">
                <span className={LABEL}>Tip başına limit (JSON)</span>
                <textarea className={`${INPUT} min-h-[90px] font-mono text-xs`} value={form.maxByTypeJson} onChange={(e) => setForm({ ...form, maxByTypeJson: e.target.value })} />
              </label>
            </section>

            <section className={SECTION}>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Kart tipleri</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Bu pakette açılabilecek kart türleri.</p>
              <div className="mt-4">
                <ChipGroup
                  options={PROGRAM_TYPES.map((t) => ({ value: t, label: t }))}
                  selected={form.allowedProgramTypes}
                  onToggle={(v) => toggleArray("allowedProgramTypes", v)}
                />
              </div>
            </section>

            <section className={SECTION}>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Admin menüleri</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Kafe panelinde bu paketle görünecek menüler.</p>
              <div className="mt-4">
                <ChipGroup
                  options={MENU_KEYS.map((m) => ({ value: m.key, label: m.label }))}
                  selected={form.menuKeys}
                  onToggle={(v) => toggleArray("menuKeys", v)}
                />
              </div>
            </section>

            <section className={SECTION}>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Web sitesi</h2>
              <div className="mt-4 space-y-4">
                <label className="space-y-1.5 block">
                  <span className={LABEL}>Özellikler (virgülle)</span>
                  <input className={INPUT} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className={LABEL}>Rozet (TR)</span>
                    <input className={INPUT} value={form.badgeTr} onChange={(e) => setForm({ ...form, badgeTr: e.target.value })} />
                  </label>
                  <label className="space-y-1.5">
                    <span className={LABEL}>Rozet (EN)</span>
                    <input className={INPUT} value={form.badgeEn} onChange={(e) => setForm({ ...form, badgeEn: e.target.value })} />
                  </label>
                </div>
                <label className="space-y-1.5 block">
                  <span className={LABEL}>Not (TR)</span>
                  <input className={INPUT} value={form.noteTr} onChange={(e) => setForm({ ...form, noteTr: e.target.value })} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className={LABEL}>Dahil maddeler (TR, satır başına)</span>
                    <textarea className={`${INPUT} min-h-[110px]`} value={form.includesTr} onChange={(e) => setForm({ ...form, includesTr: e.target.value })} />
                  </label>
                  <label className="space-y-1.5">
                    <span className={LABEL}>Dahil maddeler (EN, satır başına)</span>
                    <textarea className={`${INPUT} min-h-[110px]`} value={form.includesEn} onChange={(e) => setForm({ ...form, includesEn: e.target.value })} />
                  </label>
                </div>
              </div>
            </section>

            <section className={SECTION}>
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">Yayın</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Toggle label="Aktif" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
                <Toggle label="Web sitesinde göster" checked={form.isPublic} onChange={(v) => setForm({ ...form, isPublic: v })} />
              </div>
            </section>
          </div>

          {/* Önizleme */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <PlanPreview form={form} />
          </aside>
        </div>
      </div>
    );
  }

  const publicCount = rows.filter((r) => r.isPublic).length;
  const activeCount = rows.filter((r) => r.isActive).length;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Paketler ve fiyatlar"
        subtitle="Paket fiyatları, limitleri ve hangi menüleri içerdiği."
        actions={
          <button type="button" className={btnPrimary()} onClick={openCreate}>
            Yeni paket
          </button>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Toplam paket" value={rows.length} hint="Tanımlı paketler" accent />
        <Kpi label="Aktif" value={activeCount} hint="Satışa açık olanlar" />
        <Kpi label="Web'de" value={publicCount} hint="Fiyat sayfasında görünen" />
      </div>

      {loading && !data ? (
        <ListSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState title="Paket yok" description="Yeni paket oluşturun veya migration çalıştırın." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => (
            <article
              key={p.code}
              className={`relative flex flex-col overflow-hidden rounded-2xl border bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)] ${
                p.isPublic ? "border-[var(--accent-glow)]" : "border-[var(--line)]"
              } ${p.isActive ? "" : "opacity-70"}`}
            >
              {p.isPublic ? (
                <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{p.code}</p>
                  <h3 className="mt-1 truncate font-display text-lg font-semibold text-[var(--ink)]">{p.labelTr}</h3>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {p.isPublic ? <Pill accent>Web</Pill> : null}
                  {!p.isActive ? <Pill>Pasif</Pill> : null}
                  {p.tenantCount > 0 ? <Pill>{p.tenantCount} kafe</Pill> : null}
                </div>
              </div>

              <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[var(--ink)]">
                ₺{p.priceTry.toLocaleString("tr-TR")}
                <span className="ml-1 text-sm font-normal text-[var(--muted)]">/ay</span>
              </p>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Kart" value={p.maxPrograms} />
                <Stat label="Menü" value={p.menuKeys.length} />
                <Stat label="Kart tipi" value={p.allowedProgramTypes.length} />
              </dl>

              {p.includesTr.length > 0 ? (
                <ul className="mt-4 space-y-1.5 text-xs text-[var(--muted)]">
                  {p.includesTr.slice(0, 4).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span className="truncate">{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-auto flex gap-2 pt-5">
                <button type="button" className={btnGhost() + " flex-1"} onClick={() => openEdit(p)}>
                  Düzenle
                </button>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={p.tenantCount > 0}
                  title={p.tenantCount > 0 ? "Bağlı kafe varken silinemez" : "Paketi sil"}
                  onClick={() => setPendingDelete(p)}
                >
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition ${
              on
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--ink)]"
    >
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

function PlanPreview({ form }: { form: PlanForm }) {
  const menus = form.menuKeys.length;
  const types = form.allowedProgramTypes.length;
  const includes = form.includesTr.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--accent-glow)] bg-[var(--panel)] p-5 shadow-[var(--shadow-md)]">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Önizleme</p>
      <h3 className="mt-2 font-display text-xl font-semibold text-[var(--ink)]">{form.labelTr || "Paket adı"}</h3>
      {form.badgeTr ? <span className="mt-2 inline-flex rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-semibold text-white">{form.badgeTr}</span> : null}
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[var(--ink)]">
        ₺{form.priceTry.toLocaleString("tr-TR")}
        <span className="ml-1 text-sm font-normal text-[var(--muted)]">/ay</span>
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Kart" value={form.maxPrograms} />
        <Stat label="Menü" value={menus} />
        <Stat label="Kart tipi" value={types} />
      </dl>
      {includes.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-xs text-[var(--muted)]">
          {includes.slice(0, 6).map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-[11px] text-[var(--muted)]">
        {form.isPublic ? "Web sitesinde görünecek" : "Web sitesinde gizli"} · {form.isActive ? "Aktif" : "Pasif"}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2">
      <dt className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 font-display text-base font-semibold tabular-nums text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        accent
          ? "border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
      }`}
    >
      {children}
    </span>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-[var(--shadow-sm)] ${accent ? "border-[var(--accent-glow)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel)]"}`}>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
