"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  btnGhost,
  inputClassName,
} from "../../../components/ui";
import { useApiQuery } from "../../../lib/use-api-query";

type SmsRow = {
  id: string;
  provider: string;
  orderId: string | null;
  reportId: string | null;
  toPhone: string;
  body: string;
  link: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
  statusAt: string | null;
  createdAt: string;
};

type SmsList = { total: number; items: SmsRow[] };

type Balance = {
  ok: boolean;
  raw?: {
    response?: {
      status?: { code?: number; message?: string };
      balance?: { amount?: number; sms?: number };
    };
  };
  error?: string;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Kuyruk",
  sent: "Gönderildi",
  accepted: "Kabul",
  delivered: "İletildi",
  undelivered: "İletilemedi",
  failed: "Hata",
};

export default function PlatformSmsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <SmsContent />
    </RequireAuth>
  );
}

function SmsContent() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const path =
    `/sms/messages?take=50` +
    (status !== "ALL" ? `&status=${encodeURIComponent(status)}` : "") +
    (q.trim() ? `&q=${encodeURIComponent(q.trim())}` : "");

  const { data, error, loading, reload, refreshing } = useApiQuery<SmsList>(
    `sms:${status}:${q}`,
    path,
    { ttlMs: 10_000 },
  );
  const { data: balance } = useApiQuery<Balance>(
    "sms:balance",
    "/sms/balance",
    { ttlMs: 60_000 },
  );

  const items = data?.items ?? [];
  const balSms = balance?.raw?.response?.balance?.sms;
  const balAmount = balance?.raw?.response?.balance?.amount;

  const filters = useMemo(
    () => ["ALL", "sent", "accepted", "delivered", "undelivered", "failed"],
    [],
  );

  if (loading && !data) return <ListSkeleton rows={5} />;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Platform"
        title="SMS raporları"
        subtitle="iletiMerkezi gönderimleri ve webhook teslimat durumları."
        actions={
          <button
            type="button"
            className={btnGhost()}
            disabled={refreshing}
            onClick={() => void reload(true)}
          >
            Yenile
          </button>
        }
      />
      <ErrorBanner message={error} />

      <div className="grid gap-3 sm:grid-cols-3">
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Kayıt
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {data?.total ?? 0}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Bakiye (SMS)
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {balance?.ok ? (balSms ?? "—") : "—"}
          </p>
        </SoftBox>
        <SoftBox>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Bakiye (TL)
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {balance?.ok && balAmount != null ? balAmount : "—"}
          </p>
        </SoftBox>
      </div>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">Ara</span>
            <input
              className={inputClassName()}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Telefon, orderId…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  status === s
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {s === "ALL" ? "Tümü" : STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel padded={false}>
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <PanelHeader title="Gönderimler" description={`${items.length} kayıt`} />
        </div>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="SMS yok"
              description="Wallet davet SMS’i veya test gönderimi burada görünür."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {items.map((m) => (
              <li key={m.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium tabular-nums">+{m.toPhone}</p>
                  <Badge
                    tone={
                      m.status === "delivered"
                        ? "success"
                        : m.status === "failed" || m.status === "undelivered"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {STATUS_LABEL[m.status] ?? m.status}
                  </Badge>
                  {m.orderId ? (
                    <span className="text-[11px] text-[var(--muted)]">
                      order {m.orderId}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink)] line-clamp-4">
                  {m.body}
                </p>
                {m.error ? (
                  <p className="mt-1 text-xs text-red-600">{m.error}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  {new Date(m.createdAt).toLocaleString("tr-TR")}
                  {m.statusAt
                    ? ` · durum ${new Date(m.statusAt).toLocaleString("tr-TR")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <SoftBox>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Webhook URL (HTTPS):{" "}
          <code className="text-[var(--ink)]">
            {"{API}"}/webhooks/iletimerkezi?token=…
          </code>
          . Panel: Ayarlar → API → Bildirim Adresi. APITEST sender ile mesaj
          metni sabit test metnine çevrilebilir.
        </p>
      </SoftBox>
    </div>
  );
}
