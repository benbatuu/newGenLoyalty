"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  RequireAuth,
  Skeleton,
  SuccessBanner,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import { CampaignDrawer, type DrawerState } from "./campaign-drawer";
import { PlusIcon, SparkIcon, TrashIcon, TypeIcon } from "./campaign-icons";
import {
  STATUS_META,
  STATUS_ORDER,
  TYPE_META,
  broadcastReadiness,
  cashierLabel,
  draftFromSuggestion,
  draftToConfig,
  emptyDraft,
  multipliersToday,
  nextBroadcast,
  relativeWhen,
  summarizeCampaign,
  type Campaign,
  type CampaignStatus,
  type CampaignSuggestion,
  type CampaignType,
  type Segment,
} from "./campaign-model";

/** Sayfa açılışında tek istek: kampanyalar + müşteri grupları + öneriler */
type Overview = {
  campaigns: Campaign[];
  segments: Segment[];
  suggestions: CampaignSuggestion[];
};

type Filter = "ALL" | CampaignStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Tümü" },
  { id: "ACTIVE", label: "Açık" },
  { id: "DRAFT", label: "Taslak" },
  { id: "PAUSED", label: "Durdurulan" },
  { id: "ENDED", label: "Biten" },
];

const TYPES: CampaignType[] = ["MULTIPLIER", "WIN_BACK", "SCHEDULED_BROADCAST"];

export default function CampaignsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <CampaignsContent />
    </RequireAuth>
  );
}

function CampaignsContent() {
  const { data, error: loadError, loading, setData } = useApiQuery<Overview>(
    "campaigns:overview",
    "/campaigns/overview",
  );
  const rows = useMemo(() => data?.campaigns ?? [], [data]);
  const segments = data?.segments ?? null;
  const planLocked = !!loadError && /paket/i.test(loadError);

  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Bildirim birkaç saniye sonra kaybolsun
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 4000);
    return () => clearTimeout(t);
  }, [ok]);

  /** Listeyi yerelde güncelle — ekstra GET yok */
  const setRows = useCallback(
    (fn: (list: Campaign[]) => Campaign[]) =>
      setData((prev) =>
        prev ? { ...prev, campaigns: fn(prev.campaigns) } : prev,
      ),
    [setData],
  );
  const upsert = useCallback(
    (row: Campaign) =>
      setRows((list) =>
        list.some((c) => c.id === row.id)
          ? list.map((c) => (c.id === row.id ? row : c))
          : [row, ...list],
      ),
    [setRows],
  );

  const sorted = useMemo(
    () => [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [rows],
  );
  const counts = useMemo(() => {
    const m: Record<Filter, number> = { ALL: rows.length, ACTIVE: 0, DRAFT: 0, PAUSED: 0, ENDED: 0 };
    for (const c of rows) m[c.status]++;
    return m;
  }, [rows]);
  const visible = filter === "ALL" ? sorted : sorted.filter((c) => c.status === filter);
  const today = useMemo(() => multipliersToday(rows), [rows]);
  const todayIds = useMemo(() => new Set(today.map((c) => c.id)), [today]);
  const upcoming = useMemo(() => nextBroadcast(rows), [rows]);

  // Zaten oluşturulmuş önerileri gizle
  const suggestion = useMemo(() => {
    const names = new Set(rows.flatMap((c) => [c.name, cashierLabel(c)]));
    return (data?.suggestions ?? []).find((s) => !names.has(s.preset.label ?? s.title)) ?? null;
  }, [data, rows]);

  const segmentName = useCallback(
    (c: Campaign) => {
      const id = typeof c.config?.segmentId === "string" ? c.config.segmentId : "";
      if (!id) return null;
      return segments?.find((s) => s.id === id)?.name ?? "seçili grup";
    },
    [segments],
  );

  const openCreate = (type: CampaignType) =>
    setDrawer({ mode: "create", draft: emptyDraft(type) });
  const openEdit = (c: Campaign) => setDrawer({ mode: "edit", campaign: c });

  async function toggle(c: Campaign) {
    if (busyId) return;
    const turnOn = c.status !== "ACTIVE";
    // Eksik veya zamanı geçmiş duyuru açılırsa hemen gider — önce formu göster
    if (turnOn && broadcastReadiness(c) !== "ok") {
      openEdit(c);
      return;
    }
    setBusyId(c.id);
    setError(null);
    upsert({ ...c, status: turnOn ? "ACTIVE" : "PAUSED" }); // anında göster
    try {
      const row = await api<Campaign>(`/campaigns/${c.id}/${turnOn ? "activate" : "pause"}`, {
        method: "POST",
      });
      upsert(row);
      setOk(turnOn ? `«${c.name}» açıldı.` : `«${c.name}» durduruldu.`);
    } catch (e) {
      upsert(c); // geri al
      setError(e instanceof ApiError ? e.message : "İşlem yapılamadı. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: Campaign) {
    setBusyId(c.id);
    setError(null);
    setConfirmDeleteId(null);
    setRows((list) => list.filter((x) => x.id !== c.id)); // anında kaldır
    try {
      await api(`/campaigns/${c.id}`, { method: "DELETE" });
      setOk(`«${c.name}» silindi.`);
    } catch (e) {
      upsert(c); // geri al
      setError(e instanceof ApiError ? e.message : "Silinemedi. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  /** Öneriyi tek istekte oluştur ve başlat */
  async function quickStart(s: CampaignSuggestion) {
    if (busyId) return;
    const d = draftFromSuggestion(s);
    setBusyId(s.id);
    setError(null);
    try {
      const row = await api<Campaign>("/campaigns", {
        method: "POST",
        body: JSON.stringify({
          type: d.type,
          name: d.name.trim().slice(0, 120),
          config: draftToConfig(d),
          activate: true,
        }),
      });
      upsert(row);
      setFilter("ALL");
      setOk(`«${row.name}» başladı.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Başlatılamadı. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  const drawerType = drawer?.mode === "edit" ? drawer.campaign.type : drawer?.draft.type;
  const otherActiveMultiplier =
    drawerType === "MULTIPLIER" &&
    rows.some(
      (c) =>
        c.type === "MULTIPLIER" &&
        c.status === "ACTIVE" &&
        !(drawer?.mode === "edit" && drawer.campaign.id === c.id),
    );

  const firstLoad = loading && !data;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Sadakat programı"
        title="Kampanyalar"
        subtitle="Müşterilerinizi daha sık getirmek için hazır kampanyalar. Bir hedef seçin, birkaç ayar yapın, başlatın."
        help="Açık kampanyalar kendiliğinden çalışır: ekstra damga kasada otomatik uygulanır, geri çağırma her sabah 09:00'da kontrol edilir, duyurular seçtiğiniz saatte gider. İstediğiniz an anahtarla kapatabilirsiniz."
        actions={
          planLocked || firstLoad ? null : (
            <button
              type="button"
              className={btnPrimary()}
              onClick={() => {
                const el = document.getElementById("new-campaign");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                el?.parentElement?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
              }}
            >
              <PlusIcon /> Yeni kampanya
            </button>
          )
        }
      />

      {planLocked ? (
        <UpgradeCard message={loadError} />
      ) : (
        <>
          <div aria-live="polite">
            <ErrorBanner message={error || loadError} />
            <SuccessBanner message={ok} />
          </div>

          {/* Bir bakışta durum */}
          <section aria-label="Kısa durum" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {firstLoad ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="attio-surface p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-5 w-28" />
                </div>
              ))
            ) : (
              <>
                <Glance
                  label="Şu an açık"
                  value={counts.ACTIVE ? `${counts.ACTIVE} kampanya` : "Açık kampanya yok"}
                  hint={counts.ACTIVE ? "Kendiliğinden çalışıyor" : "Aşağıdan bir tane başlatın"}
                  live={counts.ACTIVE > 0}
                />
                <Glance
                  label="Bugün kasada"
                  value={today.length ? today.map(cashierLabel).join(", ") : "Ekstra damga yok"}
                  hint={today.length ? "Damga verirken otomatik uygulanır" : "Normal damga geçerli"}
                  live={today.length > 0}
                />
                <Glance
                  label="Sıradaki duyuru"
                  value={upcoming ? relativeWhen(upcoming.at) : "Planlı duyuru yok"}
                  hint={upcoming ? upcoming.campaign.name : "Kart sahiplerine haber verin"}
                />
              </>
            )}
          </section>

          {/* Size özel öneri */}
          {suggestion ? (
            <SuggestionCard
              suggestion={suggestion}
              busy={busyId === suggestion.id}
              onQuickStart={() => void quickStart(suggestion)}
              onReview={() => setDrawer({ mode: "create", draft: draftFromSuggestion(suggestion) })}
            />
          ) : null}

          {/* Yeni kampanya — hedefe göre seçim */}
          <section aria-labelledby="new-campaign" className="scroll-mt-4">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <h2 id="new-campaign" className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">
                Ne yapmak istiyorsunuz?
              </h2>
              <span className="text-xs text-[var(--muted)]">Kurulum 1 dakika</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {TYPES.map((t) => (
                <GoalCard key={t} type={t} onClick={() => openCreate(t)} />
              ))}
            </div>
          </section>

          {/* Kampanya listesi */}
          <Panel padded={false}>
            <div className="flex flex-col gap-2 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">
                Kampanyalarınız
              </h2>
              {rows.length > 0 ? (
                <div
                  role="tablist"
                  aria-label="Duruma göre filtrele"
                  className="flex gap-0.5 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5"
                >
                  {FILTERS.filter((f) => f.id === "ALL" || counts[f.id] > 0).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      aria-selected={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      className={`min-h-8 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] ${
                        filter === f.id
                          ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                          : "text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {f.label}
                      <span className="ml-1 tabular-nums opacity-60">{counts[f.id]}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {firstLoad ? (
              <div className="p-4">
                <ListSkeleton rows={3} />
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)] text-[var(--muted)]">
                  <TypeIcon type="MULTIPLIER" />
                </span>
                <p className="mt-3 font-medium text-[var(--ink)]">Henüz kampanyanız yok</p>
                <p className="mx-auto mt-1 max-w-sm text-[0.8125rem] leading-snug text-[var(--muted)]">
                  En kolay başlangıç: sakin bir günde 2 kat damga verin. Müşteri o gün daha çok gelir.
                </p>
                <button type="button" className={`${btnPrimary()} mt-4`} onClick={() => openCreate("MULTIPLIER")}>
                  <PlusIcon /> İlk kampanyayı oluştur
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="px-4 py-8 text-center text-[0.8125rem] text-[var(--muted)]">
                Bu durumda kampanya yok.{" "}
                <button
                  type="button"
                  className="font-medium text-[var(--ink)] underline"
                  onClick={() => setFilter("ALL")}
                >
                  Tümünü göster
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {visible.map((c) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    summary={summarizeCampaign(c, segmentName(c))}
                    liveToday={todayIds.has(c.id)}
                    busy={busyId === c.id}
                    confirmingDelete={confirmDeleteId === c.id}
                    onToggle={() => void toggle(c)}
                    onEdit={() => openEdit(c)}
                    onAskDelete={() => setConfirmDeleteId(c.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onDelete={() => void remove(c)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      {drawer ? (
        <CampaignDrawer
          key={drawer.mode === "edit" ? drawer.campaign.id : `new-${drawer.draft.type}`}
          state={drawer}
          segments={segments}
          otherActiveMultiplier={otherActiveMultiplier}
          onClose={() => setDrawer(null)}
          onSaved={(row, message) => {
            upsert(row);
            setDrawer(null);
            setFilter("ALL");
            setError(null);
            setOk(message);
          }}
        />
      ) : null}
    </div>
  );
}

function Glance({
  label,
  value,
  hint,
  live,
}: {
  label: string;
  value: string;
  hint: string;
  live?: boolean;
}) {
  return (
    <div className="attio-surface px-3.5 py-3 sm:p-4">
      <p className="flex items-center gap-1.5 section-label">
        {live ? (
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        ) : null}
        {label}
      </p>
      <p className="mt-1 truncate font-display text-[0.95rem] sm:mt-1.5 sm:text-[1.05rem] tracking-tight text-[var(--ink)]" title={value}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-[var(--muted)]" title={hint}>
        {hint}
      </p>
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  busy,
  onQuickStart,
  onReview,
}: {
  suggestion: CampaignSuggestion;
  busy: boolean;
  onQuickStart: () => void;
  onReview: () => void;
}) {
  // SMS kredi harcar, duyuru herkese gider — bunlarda önce formu göster
  const canQuickStart =
    s.preset.type === "MULTIPLIER" ||
    (s.preset.type === "WIN_BACK" && s.preset.channel !== "SMS");
  return (
    <section
      aria-label="Size özel öneri"
      className="relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius)] border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent-soft)] via-[var(--panel)] to-[var(--panel)] p-5 shadow-[var(--shadow-md)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--accent)]/30 bg-[var(--background)] text-[var(--accent)]">
          <SparkIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--brand)]">
            Size özel öneri
          </p>
          <p className="mt-0.5 font-medium text-[var(--ink)]">{s.title}</p>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-[var(--muted)]">{s.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 pl-12 sm:pl-0">
        <button type="button" className={btnGhost()} onClick={onReview} disabled={busy}>
          Ayarları gör
        </button>
        {canQuickStart ? (
          <button type="button" className={btnPrimary()} onClick={onQuickStart} disabled={busy}>
            {busy ? "Başlatılıyor…" : "Hemen başlat"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function GoalCard({ type, onClick }: { type: CampaignType; onClick: () => void }) {
  const meta = TYPE_META[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 text-left shadow-[var(--shadow-sm)] transition hover:border-black/20 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${meta.tone}`}>
        <TypeIcon type={type} />
      </span>
      <span className="mt-3 text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]">
        {meta.goal}
      </span>
      <span className="mt-0.5 font-medium text-[var(--ink)]">{meta.title}</span>
      <span className="mt-1 flex-1 text-[0.8125rem] leading-snug text-[var(--muted)]">
        {meta.description}
      </span>
      <span className="mt-3 rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink)]/75">
        {meta.example}
      </span>
      <span className="mt-3 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--ink)]">
        <PlusIcon /> Oluştur
        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          →
        </span>
      </span>
    </button>
  );
}

function CampaignRow({
  campaign: c,
  summary,
  liveToday,
  busy,
  confirmingDelete,
  onToggle,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  campaign: Campaign;
  summary: string;
  liveToday: boolean;
  busy: boolean;
  confirmingDelete: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[c.type];
  const status = STATUS_META[c.status];
  const ended = c.status === "ENDED";
  const on = c.status === "ACTIVE";
  const needsFix = !ended && c.status !== "ACTIVE" && broadcastReadiness(c) === "empty";

  return (
    <li className={`relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center ${ended ? "opacity-70" : ""}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-0.5 rounded-full ${on ? meta.stripe : "bg-transparent"}`}
      />
      <div className="flex min-w-0 flex-1 gap-3">
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tone}`}>
          <TypeIcon type={c.type} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-medium text-[var(--ink)]">{c.name}</p>
            <Badge tone={status.tone}>
              {ended && c.type === "SCHEDULED_BROADCAST" ? "Gönderildi" : status.label}
            </Badge>
            {liveToday ? <Badge tone="info">Bugün geçerli</Badge> : null}
            {needsFix ? <Badge tone="warning">Mesaj eksik</Badge> : null}
          </div>
          <p className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{meta.title}</p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--ink)]/80">{summary}</p>
        </div>
      </div>

      {confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2 pl-12 sm:justify-end sm:pl-0" role="group" aria-label="Silme onayı">
          <span className="text-[0.8125rem] text-[var(--ink)]">«{c.name}» silinsin mi? Geri alınamaz.</span>
          <button type="button" className={btnGhost()} onClick={onCancelDelete} disabled={busy}>
            Vazgeç
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md bg-[var(--danger)] px-2.5 text-[0.8125rem] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            onClick={onDelete}
            disabled={busy}
          >
            Kampanyayı sil
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pl-12 sm:pl-0">
          {!ended ? <Switch on={on} busy={busy} onClick={onToggle} name={c.name} /> : null}
          {!ended ? (
            <button type="button" className={btnGhost()} onClick={onEdit}>
              Düzenle
            </button>
          ) : null}
          <IconButton label={`${c.name} kampanyasını sil`} onClick={onAskDelete}>
            <TrashIcon />
          </IconButton>
        </div>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title="Sil"
      className="grid h-8 w-8 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
    >
      {children}
    </button>
  );
}

function Switch({
  on,
  busy,
  onClick,
  name,
}: {
  on: boolean;
  busy: boolean;
  onClick: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${name}: ${on ? "açık" : "kapalı"}`}
      disabled={busy}
      onClick={onClick}
      className="mr-1 inline-flex items-center gap-2 rounded-md px-1 py-1 text-[0.8125rem] font-medium text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? "bg-emerald-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--panel)] shadow transition-transform motion-reduce:transition-none ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="w-10 text-left">{on ? "Açık" : "Kapalı"}</span>
    </button>
  );
}

function UpgradeCard({ message }: { message: string | null }) {
  return (
    <Panel className="text-center">
      <div className="mx-auto max-w-md py-6">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          <SparkIcon />
        </span>
        <p className="mt-3 font-medium text-[var(--ink)]">Kampanyalar paketinizde yok</p>
        <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--muted)]">
          {message ??
            "Ekstra damga günleri, kayıp müşteriyi geri çağırma ve kart duyuruları Growth paketiyle gelir."}
        </p>
        <Link href="/billing" className={`${btnPrimary()} mt-4`}>
          Paketleri gör
        </Link>
      </div>
    </Panel>
  );
}
