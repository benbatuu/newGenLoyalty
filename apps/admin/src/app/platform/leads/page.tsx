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
  inputClassName,
} from "../../../components/ui";
import { SideDrawer } from "../../../components/side-drawer";
import { ApiError, api } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

type Lead = {
  id: string;
  name: string;
  cafe: string;
  email: string;
  phone: string | null;
  sector: string | null;
  message: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

type LeadsResponse = { total: number; items: Lead[] };

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  NEW: "Yeni",
  CONTACTED: "İletişimde",
  CONVERTED: "Dönüştü",
  CLOSED: "Kapalı",
};

const SOURCES = [
  { value: "ALL", label: "Tümü" },
  { value: "contact", label: "İletişim formu" },
  { value: "signup", label: "Self-serve kayıt" },
  { value: "owner_feedback", label: "Geri bildirim" },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  contact: "İletişim formu",
  signup: "Self-serve kayıt",
  owner_feedback: "Geri bildirim",
};

const SECTION = "rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]";

export default function PlatformLeadsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <LeadsContent />
    </RequireAuth>
  );
}

function LeadsContent() {
  const [status, setStatus] = useState<"ALL" | (typeof STATUSES)[number]>("ALL");
  const [source, setSource] = useState<(typeof SOURCES)[number]["value"]>("ALL");
  // Tek istek: tüm talepler alınır, filtreler istemci tarafında anında uygulanır
  const { data, error: loadError, loading, reload } = useApiQuery<LeadsResponse>(
    "leads:all",
    "/public/leads?take=100",
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);

  // Kaynak filtresi ile arama: durum sayıları bu kümeden hesaplanır
  const bySource = useMemo(
    () => (source === "ALL" ? items : items.filter((i) => i.source === source)),
    [items, source],
  );
  const counts = useMemo(() => {
    const c: Record<(typeof STATUSES)[number], number> = { NEW: 0, CONTACTED: 0, CONVERTED: 0, CLOSED: 0 };
    for (const i of bySource) {
      if (i.status in c) c[i.status as (typeof STATUSES)[number]] += 1;
    }
    return c;
  }, [bySource]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bySource.filter((l) => {
      if (status !== "ALL" && l.status !== status) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.cafe.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    });
  }, [bySource, status, query]);

  async function patchStatus(id: string, next: string) {
    setBusyId(id);
    setError(null);
    setOk(null);
    try {
      await api(`/public/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      setOk("Durum güncellendi");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız");
    } finally {
      setBusyId(null);
    }
  }

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  if (loading && !data) {
    return <ListSkeleton rows={5} />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Destek"
        title="Gelen talepler"
        subtitle="İletişim formu, kendi kendine kayıt ve geri bildirimler tek listede. Durumu değiştirerek takip edin."
        actions={
          <button type="button" className={btnGhost()} onClick={() => void reload(true)}>
            Yenile
          </button>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      {/* Özet */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Yeni" value={counts.NEW} hint="Henüz dönülmedi" accent />
        <Kpi label="İletişimde" value={counts.CONTACTED} hint="Görüşme sürüyor" />
        <Kpi label="Dönüştü" value={counts.CONVERTED} hint="Kayda dönüştü" />
        <Kpi label="Kapalı" value={counts.CLOSED} hint="Sonlandırıldı" />
      </div>

      {/* Filtreler */}
      <section className={`${SECTION} space-y-4 p-5 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className={inputClassName() + " sm:w-80"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim, kafe veya e-posta ara…"
          />
          <p className="text-xs text-[var(--muted)]">{filtered.length} kayıt</p>
        </div>
        <div className="space-y-3">
          <FilterRow label="Kaynak">
            {SOURCES.map((s) => (
              <Chip key={s.value} active={source === s.value} onClick={() => setSource(s.value)}>
                {s.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Durum">
            <Chip active={status === "ALL"} onClick={() => setStatus("ALL")}>
              Tümü
            </Chip>
            {STATUSES.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {STATUS_LABEL[s]}
              </Chip>
            ))}
          </FilterRow>
        </div>
      </section>

      {/* Liste */}
      <section className={`${SECTION} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--ink)]">Talepler</h2>
            <p className="text-xs text-[var(--muted)]">{filtered.length} kayıt</p>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Talep yok"
              description="İletişim formu veya kayıt sayfasından gelenler burada listelenir."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Kafe</th>
                  <th className="px-3 py-3 font-semibold">İletişim</th>
                  <th className="px-3 py-3 font-semibold">Kaynak</th>
                  <th className="px-3 py-3 font-semibold">Mesaj</th>
                  <th className="px-3 py-3 font-semibold">Tarih</th>
                  <th className="px-6 py-3 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="relative cursor-pointer align-middle transition hover:bg-[var(--surface)]"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        {l.status === "NEW" ? <span aria-hidden className="h-6 w-1 shrink-0 rounded-full bg-[var(--accent)]" /> : null}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--ink)]">{l.cafe}</p>
                          {l.sector ? <p className="truncate text-xs text-[var(--muted)]">{l.sector}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="truncate text-[var(--ink)]">{l.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{l.email}</p>
                      {l.phone ? <p className="truncate text-xs tabular-nums text-[var(--muted)]">{l.phone}</p> : null}
                    </td>
                    <td className="px-3 py-3.5">
                      <Pill>{SOURCE_LABEL[l.source] ?? l.source}</Pill>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--muted)]" title={l.message}>
                        {l.message || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-xs tabular-nums text-[var(--muted)]">
                      {new Date(l.createdAt).toLocaleDateString("tr-TR")}
                      <br />
                      {new Date(l.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <label className="sr-only" htmlFor={`status-${l.id}`}>Durum</label>
                      <select
                        id={`status-${l.id}`}
                        className={inputClassName() + " h-8 w-full py-1 text-xs"}
                        value={l.status}
                        disabled={busyId === l.id}
                        onChange={(e) => void patchStatus(l.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SideDrawer open={!!selected} onClose={() => setSelectedId(null)} title="Talep detayı">
        {selected ? (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold text-[var(--ink)]">{selected.cafe}</h2>
                <Pill accent={selected.status === "NEW" || selected.status === "CONVERTED"}>
                  {STATUS_LABEL[selected.status as (typeof STATUSES)[number]] ?? selected.status}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {new Date(selected.createdAt).toLocaleString("tr-TR")} · {SOURCE_LABEL[selected.source] ?? selected.source}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Ad soyad" value={selected.name} />
              <DetailField label="Sektör" value={selected.sector || "—"} />
              <DetailField label="E-posta" value={selected.email} href={`mailto:${selected.email}`} />
              <DetailField label="Telefon" value={selected.phone || "—"} href={selected.phone ? `tel:${selected.phone}` : undefined} />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--muted)]">Mesaj</p>
              <div className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
                {selected.message || "Mesaj yok."}
              </div>
            </div>

            {selected.notes ? (
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--muted)]">Not</p>
                <div className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]">
                  {selected.notes}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <label htmlFor="drawer-status" className="mb-2 block text-xs font-medium text-[var(--muted)]">
                Durum
              </label>
              <select
                id="drawer-status"
                className={inputClassName() + " w-full"}
                value={selected.status}
                disabled={busyId === selected.id}
                onChange={(e) => void patchStatus(selected.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}

function DetailField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      {href ? (
        <a href={href} className="mt-1 block truncate text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)]">
          {value}
        </a>
      ) : (
        <p className="mt-1 truncate text-sm font-medium text-[var(--ink)]">{value}</p>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
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
