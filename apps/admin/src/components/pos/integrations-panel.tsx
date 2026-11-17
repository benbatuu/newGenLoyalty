"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  FormSkeleton,
  Panel,
  PanelHeader,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import { SettingsSectionHeader } from "../../app/settings/_components/settings-section-header";

type TenantMini = {
  name: string;
  slug: string;
};

type PosIntegration = {
  id: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
};

type PosEvent = {
  id: string;
  eventType: string;
  status: string;
  createdAt: string;
  payload?: Record<string, unknown>;
};

type NfcDevice = {
  id: string;
  label: string;
  tagUrl: string;
  isActive: boolean;
  branchId?: string | null;
};

type NfcPending = {
  id: string;
  deviceLabel?: string;
  customerPhone?: string;
  createdAt: string;
};

const PROVIDERS = [
  { id: "generic", label: "Generic webhook" },
  { id: "adisyo", label: "Adisyo" },
  { id: "simpra", label: "Simpra" },
  { id: "menulux", label: "Menulux" },
  { id: "restajet", label: "Restajet" },
];



export function IntegrationsSettingsPanel() {
  const [tab, setTab] = useState<"pos" | "nfc">("pos");
  const { data: tenant, loading } = useApiQuery<TenantMini>(
    "tenant:mini",
    "/tenants/me",
  );
  const {
    data: integrations,
    loading: posLoading,
    reload: reloadPos,
  } = useApiQuery<PosIntegration[]>("pos:integrations", "/pos/integrations", {
  });
  const {
    data: nfcDevices,
    loading: nfcLoading,
    reload: reloadNfc,
  } = useApiQuery<NfcDevice[]>("nfc:devices", "/nfc/devices", {
  });
  const { data: nfcPending, reload: reloadPending } = useApiQuery<NfcPending[]>(
    "nfc:pending",
    "/nfc/pending",
  );

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newProvider, setNewProvider] = useState("generic");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const [events, setEvents] = useState<PosEvent[]>([]);
  const [nfcLabel, setNfcLabel] = useState("");
  const [nfcTagUrl, setNfcTagUrl] = useState("");

  const webhookBase = useMemo(() => {
    if (typeof window === "undefined") return "/backend/pos/webhook";
    return `${window.location.origin}/backend/pos/webhook`;
  }, []);

  async function copyWebhook(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function createIntegration(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      await api("/pos/integrations", {
        method: "POST",
        body: JSON.stringify({ provider: newProvider }),
      });
      setOk("Entegrasyon eklendi");
      await reloadPos(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function toggleIntegration(id: string, isActive: boolean) {
    setBusy(true);
    try {
      await api(`/pos/integrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      await reloadPos(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function loadEvents(integrationId: string) {
    setSelectedIntegration(integrationId);
    try {
      const list = await api<PosEvent[]>(
        `/pos/integrations/${integrationId}/events`,
      );
      setEvents(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Olaylar yüklenemedi");
      setEvents([]);
    }
  }

  async function createNfcDevice(e: FormEvent) {
    e.preventDefault();
    if (!nfcLabel.trim() || !nfcTagUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api("/nfc/devices", {
        method: "POST",
        body: JSON.stringify({ label: nfcLabel.trim(), tagUrl: nfcTagUrl.trim() }),
      });
      setNfcLabel("");
      setNfcTagUrl("");
      setOk("NFC cihazı eklendi");
      await reloadNfc(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cihaz eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function confirmNfcTap(tapEventId: string) {
    setBusy(true);
    try {
      await api("/nfc/confirm", {
        method: "POST",
        body: JSON.stringify({ tapEventId }),
      });
      setOk("NFC damgası onaylandı");
      await reloadPending(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Onay başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function removeNfcDevice(id: string) {
    if (!window.confirm("Cihaz silinsin mi?")) return;
    setBusy(true);
    try {
      await api(`/nfc/devices/${id}`, { method: "DELETE" });
      await reloadNfc(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !tenant) {
    return <FormSkeleton rows={3} />;
  }

  const posRows = integrations ?? [];
  const nfcRows = nfcDevices ?? [];
  const pendingRows = nfcPending ?? [];

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Entegrasyonlar"
        subtitle="POS webhook ve NFC cihazları — satış ve dokunmatik damga."
        help="POS: fiş tutarı otomatik puan/damga. NFC: tezgâhta bekleyen dokunuşları onaylayın."
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={ok} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pos", "POS webhook"],
            ["nfc", "NFC cihazları"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm font-medium ${
              tab === id
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pos" ? (
        <>
          <Panel>
            <PanelHeader
              title="Yeni POS bağlantısı"
              description="Her entegrasyonun kendi webhook adresi vardır."
            />
            <form onSubmit={(e) => void createIntegration(e)} className="flex flex-wrap gap-3">
              <select
                className={inputClassName()}
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button type="submit" className={btnPrimary()} disabled={busy}>
                Ekle
              </button>
            </form>
          </Panel>

          <Panel padded={false}>
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <PanelHeader title="Bağlantılar" description="Aktif webhook'lar" />
            </div>
            {posLoading && !posRows.length ? (
              <div className="p-6">
                <FormSkeleton rows={2} />
              </div>
            ) : posRows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Henüz entegrasyon yok"
                  description="Yukarıdan generic webhook ekleyin."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {posRows.map((item) => {
                  const url = `${webhookBase}/${item.id}`;
                  return (
                    <li key={item.id} className="px-5 py-4 sm:px-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.provider}</p>
                          <code className="mt-1 block break-all text-xs text-[var(--muted)]">
                            {url}
                          </code>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={item.isActive ? "success" : "neutral"}>
                            {item.isActive ? "Aktif" : "Kapalı"}
                          </Badge>
                          <button
                            type="button"
                            className={btnGhost()}
                            onClick={() => void copyWebhook(url)}
                          >
                            {copied ? "Kopyalandı" : "URL"}
                          </button>
                          <button
                            type="button"
                            className={btnGhost()}
                            disabled={busy}
                            onClick={() =>
                              void toggleIntegration(item.id, item.isActive)
                            }
                          >
                            {item.isActive ? "Kapat" : "Aç"}
                          </button>
                          <button
                            type="button"
                            className={btnGhost()}
                            onClick={() => void loadEvents(item.id)}
                          >
                            Olaylar
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {selectedIntegration ? (
            <Panel padded={false}>
              <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <PanelHeader title="Son olaylar" description="Webhook geçmişi" />
              </div>
              {events.length === 0 ? (
                <p className="p-6 text-sm text-[var(--muted)]">Kayıt yok</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {events.slice(0, 20).map((ev) => (
                    <li
                      key={ev.id}
                      className="flex justify-between gap-3 px-5 py-3 text-sm sm:px-6"
                    >
                      <span>
                        {ev.eventType} · {ev.status}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(ev.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </>
      ) : (
        <>
          {pendingRows.length > 0 ? (
            <Panel padded={false}>
              <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <PanelHeader
                  title="Bekleyen dokunuşlar"
                  description="Onaylanınca damga verilir"
                />
              </div>
              <ul className="divide-y divide-[var(--line)]">
                {pendingRows.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                  >
                    <div className="text-sm">
                      <p>{p.deviceLabel ?? "NFC"}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {p.customerPhone ?? "—"} ·{" "}
                        {new Date(p.createdAt).toLocaleTimeString("tr-TR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={btnPrimary()}
                      disabled={busy}
                      onClick={() => void confirmNfcTap(p.id)}
                    >
                      Onayla
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader title="Yeni NFC cihazı" />
            <form
              onSubmit={(e) => void createNfcDevice(e)}
              className="space-y-3"
            >
              <Field label="Etiket">
                <input
                  className={inputClassName()}
                  value={nfcLabel}
                  onChange={(e) => setNfcLabel(e.target.value)}
                  placeholder="Tezgâh sol"
                />
              </Field>
              <Field label="Tag URL">
                <input
                  className={inputClassName()}
                  value={nfcTagUrl}
                  onChange={(e) => setNfcTagUrl(e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <button type="submit" className={btnPrimary()} disabled={busy}>
                Cihaz ekle
              </button>
            </form>
          </Panel>

          <Panel padded={false}>
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <PanelHeader title="Kayıtlı cihazlar" />
            </div>
            {nfcLoading && !nfcRows.length ? (
              <div className="p-6">
                <FormSkeleton rows={2} />
              </div>
            ) : nfcRows.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Cihaz yok" description="NFC etiketi ekleyin." />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {nfcRows.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                  >
                    <div>
                      <p className="font-medium">{d.label}</p>
                      <p className="text-xs text-[var(--muted)]">{d.tagUrl}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={d.isActive ? "success" : "neutral"}>
                        {d.isActive ? "Aktif" : "Kapalı"}
                      </Badge>
                      <button
                        type="button"
                        className={btnGhost()}
                        disabled={busy}
                        onClick={() => void removeNfcDevice(d.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      <SoftBox className="text-sm text-[var(--muted)]">
        POS webhook&apos;ları <code>posReceiptId</code> ile idempotent çalışır.
        NFC onayı kasiyer yetkisi gerektirir.
      </SoftBox>
    </div>
  );
}
