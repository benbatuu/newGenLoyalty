"use client";

import { useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  RequireAuth,
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

const SECTION = "overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]";
const FILTERS = ["ALL", "sent", "accepted", "delivered", "undelivered", "failed"] as const;

export default function PlatformSmsPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <SmsContent />
    </RequireAuth>
  );
}

function SmsContent() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("ALL");
  const [q, setQ] = useState("");
  const path =
    `/sms/messages?take=50` +
    (status !== "ALL" ? `&status=${encodeURIComponent(status)}` : "") +
    (q.trim() ? `&q=${encodeURIComponent(q.trim())}` : "");

  const { data, error, loading, reload, refreshing } = useApiQuery<SmsList>(
    `sms:${status}:${q}`,
    path,
  );
  const { data: balance } = useApiQuery<Balance>("sms:balance", "/sms/balance");

  const items = data?.items ?? [];
  const balSms = balance?.raw?.response?.balance?.sms;
  const balAmount = balance?.raw?.response?.balance?.amount;

  if (loading && !data) return <ListSkeleton rows={5} />;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Destek"
        title="Gönderilen SMS'ler"
        subtitle="Gönderilen mesajlar ve operatörün teslim durumu."
        actions={
          <button type="button" className={btnGhost()} disabled={refreshing} onClick={() => void reload(true)}>
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        }
      />
      <ErrorBanner message={error} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Toplam kayıt" value={data?.total ?? 0} hint="Tüm gönderimler" accent />
        <Kpi label="Bakiye (SMS)" value={balance?.ok ? (balSms ?? "—") : "—"} hint="Sağlayıcıdan" />
        <Kpi label="Bakiye (TL)" value={balance?.ok && balAmount != null ? `₺${balAmount}` : "—"} hint="Sağlayıcıdan" />
      </div>

      <section className={`${SECTION} space-y-4 p-5 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className={inputClassName() + " sm:w-80"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Telefon veya sipariş no ara…"
          />
          <p className="text-xs text-[var(--muted)]">{items.length} kayıt gösteriliyor</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "ALL" ? "Tümü" : STATUS_LABEL[s] ?? s}
            </Chip>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="SMS yok"
              description="Wallet davet SMS’i veya test gönderimi burada görünür."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[38%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Telefon</th>
                  <th className="px-3 py-3 font-semibold">Durum</th>
                  <th className="px-3 py-3 font-semibold">Mesaj</th>
                  <th className="px-3 py-3 font-semibold">Sipariş</th>
                  <th className="px-6 py-3 font-semibold">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {items.map((m) => (
                  <tr key={m.id} className="align-middle hover:bg-[var(--surface)]">
                    <td className="px-6 py-3.5 font-medium tabular-nums text-[var(--ink)]">+{m.toPhone}</td>
                    <td className="px-3 py-3.5">
                      <Pill tone={statusTone(m.status)}>{STATUS_LABEL[m.status] ?? m.status}</Pill>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="truncate text-[var(--ink)]" title={m.body}>{m.body}</p>
                      {m.error ? (
                        <p className="mt-1 truncate text-xs text-[var(--accent)]" title={m.error}>{m.error}</p>
                      ) : null}
                    </td>
                    <td className="truncate px-3 py-3.5 text-xs tabular-nums text-[var(--muted)]" title={m.orderId ?? ""}>
                      {m.orderId ?? "—"}
                    </td>
                    <td className="px-6 py-3.5 text-xs tabular-nums text-[var(--muted)]">
                      {new Date(m.createdAt).toLocaleDateString("tr-TR")}
                      <br />
                      {new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Webhook (HTTPS): <code className="text-[var(--ink)]">{"{API}"}/webhooks/iletimerkezi?token=…</code>. Panel: Ayarlar → API → Bildirim adresi.
      </p>
    </div>
  );
}

function statusTone(status: string): "ok" | "bad" | "neutral" {
  if (status === "delivered") return "ok";
  if (status === "failed" || status === "undelivered") return "bad";
  return "neutral";
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "bad" | "neutral" }) {
  const cls =
    tone === "ok"
      ? "border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--accent)]"
      : tone === "bad"
        ? "border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
        : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
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

function Kpi({ label, value, hint, accent }: { label: string; value: string | number; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-[var(--shadow-sm)] ${accent ? "border-[var(--accent-glow)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--panel)]"}`}>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
