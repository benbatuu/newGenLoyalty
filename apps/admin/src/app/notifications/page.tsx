"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  Field,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

type BroadcastItem = {
  id: string;
  message: string;
  synced: number;
  devices: number;
  createdAt: string;
};

type NotifyStatus = {
  lastMessage: string | null;
  lastSentAt: string | null;
  applePassCount: number;
  registeredDevices: number;
  notifyIconUrl: string | null;
  name: string;
  primaryColor: string | null;
  history: BroadcastItem[];
};

export default function NotificationsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER", "SUPER_ADMIN"]}>
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  const { data: status, error: loadError, loading, refreshing, reload } =
    useApiQuery<NotifyStatus>("notifications:me", "/tenants/me/notifications");

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const history = status?.history ?? [];
  const selected = useMemo(
    () => history.find((h) => h.id === selectedId) ?? history[0] ?? null,
    [history, selectedId],
  );

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setOk(null);
    try {
      const res = await api<{
        message: string;
        synced: number;
        devices: number;
        sentAt: string;
      }>("/tenants/me/notifications", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setOk(
        res.devices > 0
          ? `Gönderildi · ${res.synced} kart · ${res.devices} cihaz`
          : `Kartlar güncellendi (${res.synced}) · Kayıtlı cihaz yok`,
      );
      setMessage("");
      bustCache("notifications");
      bustCache("metrics");
      await reload(true);
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gönderim başarısız");
    } finally {
      setSending(false);
    }
  }

  if (loading && !status) {
    return <FormSkeleton rows={3} />;
  }

  const previewText =
    message.trim() || selected?.message || status?.lastMessage || "Duyuru metni…";
  const accent = status?.primaryColor || "#1B4332";

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Kart & Wallet"
        title="Bildirimler"
        subtitle="Wallet duyurusu gönder; geçmiş gönderimleri ve detaylarını incele."
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
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Apple kart
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {status?.applePassCount ?? 0}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Kayıtlı cihaz
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {status?.registeredDevices ?? 0}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Toplam gönderim
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {history.length}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Son gönderim
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">
            {history[0]
              ? new Date(history[0].createdAt).toLocaleString("tr-TR")
              : "—"}
          </p>
        </SoftBox>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_300px]">
        <Panel>
          <PanelHeader
            title="Yeni duyuru"
            description="Metin karttaki duyuru alanına yazılır ve kilit ekranına düşer."
          />
          <form onSubmit={send} className="space-y-4">
            <Field label="Bildirim metni">
              <textarea
                className={inputClassName() + " min-h-28"}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 120))}
                placeholder="Örn. Bugün tüm içeceklerde 2x damga!"
                required
                maxLength={120}
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {message.length}/120
              </p>
            </Field>
            <button
              type="submit"
              className={btnPrimary()}
              disabled={sending || message.trim().length < 2}
            >
              {sending ? "Gönderiliyor…" : "Bildirimi gönder"}
            </button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
            Apple serbest push vermez; metin karttaki “Duyuru” alanıyla kilit
            ekranına düşer.
          </p>
        </Panel>

        <Panel padded={false}>
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <PanelHeader
              title="Gönderim geçmişi"
              description={`${history.length} kayıt`}
            />
          </div>
          {history.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                title="Henüz bildirim yok"
                description="İlk duyurunu soldan gönder."
              />
            </div>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-[var(--line)] overflow-y-auto">
              {history.map((item) => {
                const active = (selected?.id ?? history[0]?.id) === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`flex w-full flex-col gap-1 px-5 py-3.5 text-left transition sm:px-6 ${
                        active
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-medium text-[var(--ink)]">
                          {item.message}
                        </p>
                        <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted)]">
                          {new Date(item.createdAt).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)]">
                        {item.synced} kart · {item.devices} cihaz
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <PanelHeader title="Önizleme" />
            <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#1c1c1e] to-[#2c2c2e] p-4 text-white shadow-[var(--shadow-lg)]">
              <p className="mb-3 text-center text-[10px] font-medium tracking-wide text-white/50">
                Kilit ekranı
              </p>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                    style={{ background: accent }}
                  >
                    {status?.notifyIconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={status.notifyIconUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-white/80">
                        {(status?.name || "K").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">
                        {status?.name || "Kafe"}
                      </p>
                      <span className="shrink-0 text-[11px] text-white/45">
                        şimdi
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-white/85">
                      {previewText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {selected ? (
            <Panel>
              <PanelHeader title="Gönderim detayı" />
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    Mesaj
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-[var(--ink)]">
                    {selected.message}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    Zaman
                  </dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--ink)]">
                    {new Date(selected.createdAt).toLocaleString("tr-TR")}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                      Güncellenen kart
                    </dt>
                    <dd className="mt-0.5 font-[family-name:var(--font-display)] text-xl tabular-nums">
                      {selected.synced}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                      Bilgilendirilen cihaz
                    </dt>
                    <dd className="mt-0.5 font-[family-name:var(--font-display)] text-xl tabular-nums">
                      {selected.devices}
                    </dd>
                  </div>
                </div>
              </dl>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
