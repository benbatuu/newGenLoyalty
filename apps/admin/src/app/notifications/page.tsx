"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { resolveAdminAssetUrl } from "../../lib/public-urls";
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  Skeleton,
  PageHeader,
  Panel,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type HistoryItem = {
  id: string;
  message: string;
  synced: number;
  devices: number;
  audience: string;
  audienceLabel: string | null;
  targetCount: number | null;
  createdAt: string;
};

type Audiences = {
  segments: { id: string; name: string; count: number }[];
  vipTiers: { id: string; name: string; count: number }[];
};

type NotifyStatus = {
  lastMessage: string | null;
  lastSentAt: string | null;
  applePassCount: number;
  registeredDevices: number;
  notifyIconUrl: string | null;
  name: string;
  primaryColor: string | null;
  history: HistoryItem[];
  audiences: Audiences;
};

type TargetKind = "all" | "segment" | "vip";

const TEMPLATES = [
  "Bugün tüm içeceklerde 2x damga!",
  "Yeni lezzetimiz geldi, denemeye bekleriz.",
  "Seni özledik! Bu hafta uğra, sürpriz var.",
];

export default function NotificationsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER", "SUPER_ADMIN"]}>
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  // Tek istek: geçmiş, sayılar, gruplar ve VIP seviyeleri
  const { data: status, error: loadError, loading, refreshing, reload } =
    useApiQuery<NotifyStatus>("notifications:me", "/tenants/me/notifications");

  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<TargetKind>("all");
  const [segmentId, setSegmentId] = useState("");
  const [vipTierId, setVipTierId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 5000);
    return () => clearTimeout(t);
  }, [ok]);

  const history = useMemo(() => status?.history ?? [], [status]);
  const audiences = status?.audiences ?? { segments: [], vipTiers: [] };
  const firstLoad = loading && !status;

  const selected = useMemo(
    () => history.find((h) => h.id === selectedId) ?? history[0] ?? null,
    [history, selectedId],
  );

  // Seçilen hedefin kişi sayısı
  const targetCount = useMemo(() => {
    if (target === "all") return status?.applePassCount ?? 0;
    if (target === "segment") {
      return audiences.segments.find((s) => s.id === segmentId)?.count ?? null;
    }
    return audiences.vipTiers.find((t) => t.id === vipTierId)?.count ?? null;
  }, [target, segmentId, vipTierId, status, audiences]);

  const targetLabel =
    target === "all"
      ? "Herkes"
      : target === "segment"
        ? audiences.segments.find((s) => s.id === segmentId)?.name ?? ""
        : audiences.vipTiers.find((t) => t.id === vipTierId)?.name ?? "";

  const targetReady =
    target === "all" || (target === "segment" ? !!segmentId : !!vipTierId);
  const messageOk = message.trim().length >= 2;

  const whoText =
    target === "all"
      ? "tüm kart sahiplerine"
      : `«${targetLabel}» grubundaki ${targetCount ?? 0} müşteriye`;

  /** İlk tıklama onay bloğunu açar; onaydan sonra gerçekten gönderir (tarayıcı uyarısı kullanılmaz). */
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!messageOk || !targetReady || sending) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setConfirming(false);
    setSending(true);
    setError(null);
    setOk(null);
    try {
      const body = {
        message: message.trim(),
        audience:
          target === "all"
            ? { type: "all" }
            : target === "segment"
              ? { type: "segment", segmentId }
              : { type: "vip", vipTierId },
      };
      const res = await api<{ synced: number; devices: number }>(
        "/tenants/me/notifications",
        { method: "POST", body: JSON.stringify(body) },
      );
      setOk(
        res.devices > 0
          ? `Gönderildi · ${res.synced} kart · ${res.devices} telefon`
          : `Kartlar güncellendi (${res.synced}) · Kayıtlı telefon yok`,
      );
      setMessage("");
      setSelectedId(null);
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gönderilemedi. Tekrar deneyin.");
    } finally {
      setSending(false);
    }
  }

  const previewText =
    message.trim() || selected?.message || status?.lastMessage || "Duyurunuz burada görünecek";
  const accent = status?.primaryColor || "#ef233c";

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Mesaj gönder"
        title="Bildirim gönder"
        subtitle="Müşterilerinizin telefon kartına kısa bir duyuru gönderin. Herkese ya da bir gruba, bir VIP seviyesine."
        help="Duyuru müşterinin sadakat kartında görünür. Herkese giderse kafe geneli duyuru olur. Gruba ya da seviyeye giderse sadece o müşterilerin kartında çıkar."
        actions={
          <button type="button" className={btnGhost()} disabled={refreshing} onClick={() => void reload(true)}>
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        }
      />

      <div aria-live="polite">
        <ErrorBanner message={loadError} />
      </div>

      {/* Özet */}
      <section aria-label="Özet" className="grid grid-cols-3 gap-5">
        {firstLoad ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="attio-surface space-y-2 p-3 sm:p-4" aria-hidden="true">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))
        ) : (
          <>
            <Tile label="Kart sahibi" value={status?.applePassCount ?? 0} />
            <Tile label="Bildirim alabilen telefon" value={status?.registeredDevices ?? 0} />
            <Tile label="Toplam gönderim" value={history.length} />
          </>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* Gönderim formu */}
        <Panel className="lg:col-span-2">
          {firstLoad ? (
            <div className="space-y-5" aria-busy="true" aria-label="Yükleniyor">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
          <form onSubmit={(e) => void send(e)} className="space-y-5" aria-busy={sending}>
            {/* Gönderim sürerken tüm alanlar kilitlenir (tekrar tıklama ve düzenleme engellenir) */}
            <fieldset disabled={sending} className="min-w-0 space-y-5 border-0 p-0">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-[0.8125rem] font-medium text-[var(--ink)]">Kime gönderelim?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <TargetCard
                  active={target === "all"}
                  title="Herkes"
                  hint={`${status?.applePassCount ?? 0} kart`}
                  onClick={() => setTarget("all")}
                />
                <TargetCard
                  active={target === "segment"}
                  title="Bir grup"
                  hint={audiences.segments.length ? `${audiences.segments.length} grup` : "Grup yok"}
                  onClick={() => setTarget("segment")}
                />
                <TargetCard
                  active={target === "vip"}
                  title="VIP seviye"
                  hint={audiences.vipTiers.length ? `${audiences.vipTiers.length} seviye` : "Seviye yok"}
                  onClick={() => setTarget("vip")}
                />
              </div>

              {target === "segment" ? (
                <label className="block pt-1">
                  <span className="sr-only">Grup seçin</span>
                  <select
                    className={inputClassName()}
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                  >
                    <option value="">Grup seçin…</option>
                    {audiences.segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.count} müşteri
                      </option>
                    ))}
                  </select>
                  {audiences.segments.length === 0 ? (
                    <span className="mt-1 block text-[0.6875rem] text-[var(--muted)]">
                      Önce müşteri grubu oluşturun.
                    </span>
                  ) : null}
                </label>
              ) : null}

              {target === "vip" ? (
                <label className="block pt-1">
                  <span className="sr-only">VIP seviye seçin</span>
                  <select
                    className={inputClassName()}
                    value={vipTierId}
                    onChange={(e) => setVipTierId(e.target.value)}
                  >
                    <option value="">Seviye seçin…</option>
                    {audiences.vipTiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.count} müşteri
                      </option>
                    ))}
                  </select>
                  {audiences.vipTiers.length === 0 ? (
                    <span className="mt-1 block text-[0.6875rem] text-[var(--muted)]">
                      Henüz VIP seviyesi yok.
                    </span>
                  ) : null}
                </label>
              ) : null}
            </fieldset>

            <div>
              <label htmlFor="notice-text" className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">
                Ne yazalım?
              </label>
              <textarea
                id="notice-text"
                className={`${inputClassName()} min-h-24 py-2`}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 120))}
                placeholder="Kısa ve net yazın. Örn. Bugün tüm içeceklerde 2x damga!"
                maxLength={120}
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMessage(t)}
                      className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)]"
                    >
                      {t.length > 26 ? `${t.slice(0, 26)}…` : t}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] tabular-nums text-[var(--muted)]">{!messageOk && message.length === 0 ? "En az 2 karakter · " : ""}{message.length}/120</span>
              </div>
            </div>

            <div aria-live="polite" className="space-y-2">
              <ErrorBanner message={error} />
              <SuccessBanner message={ok} />
              {confirming ? (
                <div className="flex flex-col gap-3 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[0.8125rem] leading-snug text-[var(--ink)]">
                    Bu duyuru <strong className="font-medium">{whoText}</strong> gidecek. Onaylıyor musunuz?
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className={`${btnGhost()} h-9`} onClick={() => setConfirming(false)} disabled={sending}>
                      Vazgeç
                    </button>
                    <button type="button" className={`${btnPrimary()} h-9`} onClick={() => void send({ preventDefault() {} } as FormEvent)} disabled={sending}>
                      Evet, gönder
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-lg bg-[var(--surface)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.8125rem] text-[var(--ink)]">
                {targetReady ? (
                  <>
                    <strong className="font-medium">{targetLabel}</strong>
                    {" · "}
                    <span className="tabular-nums">
                      {targetCount == null ? "—" : `${targetCount.toLocaleString("tr-TR")} müşteri`}
                    </span>
                  </>
                ) : (
                  <span className="text-[var(--muted)]">Önce kime gideceğini seçin.</span>
                )}
              </p>
              <button
                type="submit"
                className={`${btnPrimary()} h-9`}
                disabled={!messageOk || !targetReady || sending}
              >
                {sending ? (
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Gönderiliyor…
                  </span>
                ) : (
                  "Bildirimi gönder"
                )}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Apple, uygulama dışı serbest bildirim vermez. Duyuru kart üzerindeki “Duyuru” alanında görünür ve kilit ekranına düşer.
            </p>
            </fieldset>
          </form>
          )}
        </Panel>

        {/* Önizleme + geçmiş */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
          <Panel>
            <p className="mb-3 text-[0.8125rem] font-medium text-[var(--ink)]">Telefonda böyle görünür</p>
            {firstLoad ? <Skeleton className="h-[108px] w-full rounded-2xl" /> : null}
            <div className={`${firstLoad ? "hidden" : ""} overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-b from-[var(--surface)] to-[var(--panel)] p-3.5 text-[var(--ink)] shadow-[var(--shadow-md)]`}>
              <div>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                    style={{ background: accent }}
                  >
                    {status?.notifyIconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveAdminAssetUrl(status.notifyIconUrl)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-white">
                        {(status?.name || "K").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">{status?.name || "Kafeniz"}</p>
                      <span className="shrink-0 text-[11px] text-[var(--muted)]">şimdi</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--ink)]/85">{previewText}</p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel padded={false}>
            <div className="border-b border-[var(--line)] px-4 py-3">
              <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">Geçmiş</h2>
            </div>
            {firstLoad ? (
              <div className="p-4">
                <ListSkeleton rows={3} />
              </div>
            ) : history.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Henüz duyuru yok" description="İlk duyurunuzu yukarıdan gönderin." />
              </div>
            ) : (
              <ul className="max-h-[26rem] divide-y divide-[var(--line)] overflow-y-auto">
                {history.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={active}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                          active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface)]"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink)]">
                            {item.audienceLabel || "Herkes"}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted)]">
                            {new Date(item.createdAt).toLocaleString("tr-TR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[0.8125rem] font-medium text-[var(--ink)]">{item.message}</p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {item.synced} kart güncellendi · {item.devices} telefon
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function TargetCard({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] ${
        active
          ? "border-[var(--ink)] bg-[var(--panel)] ring-1 ring-[var(--ink)]"
          : "border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--surface)]"
      }`}
    >
      <span className="block text-[0.8125rem] font-medium text-[var(--ink)]">{title}</span>
      <span className="mt-0.5 block text-xs text-[var(--muted)]">{hint}</span>
    </button>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="attio-surface p-3 sm:p-4">
      <p className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">{label}</p>
      <p className="mt-1 font-display text-xl tabular-nums tracking-tight text-[var(--ink)] sm:text-2xl">
        {value.toLocaleString("tr-TR")}
      </p>
    </div>
  );
}
