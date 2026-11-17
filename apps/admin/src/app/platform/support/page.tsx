"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { SideDrawer } from "../../../components/side-drawer";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader, RequireAuth, SuccessBanner, btnPrimary, inputClassName } from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type TicketRow = {
  id: string;
  code: string;
  cafe: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  status: Status;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

type ListResponse = { items: TicketRow[]; byStatus: Partial<Record<Status, number>> };

type Detail = TicketRow & {
  phone: string | null;
  tenant: { id: string; name: string; slug: string; isActive: boolean; subscriptionStatus: string; planCode: string } | null;
  messages: Array<{
    id: string;
    authorType: "OWNER" | "ADMIN";
    authorName: string;
    body: string;
    createdAt: string;
    attachments: Array<{ id: string; fileName: string; url: string; sizeBytes: number }>;
  }>;
};

const STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İnceleniyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapandı",
};
const SECTION = "overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]";

export default function PlatformSupportPage() {
  return (
    <RequireAuth roles={["SUPER_ADMIN"]}>
      <SupportContent />
    </RequireAuth>
  );
}

function SupportContent() {
  const [status, setStatus] = useState<"ALL" | Status>("ALL");
  const [query, setQuery] = useState("");
  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (status !== "ALL") p.set("status", status);
    if (query.trim()) p.set("q", query.trim());
    const s = p.toString();
    return `/support/tickets${s ? `?${s}` : ""}`;
  }, [status, query]);
  const { data, error: loadError, loading, reload } = useApiQuery<ListResponse>(`support:${path}`, path);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const items = data?.items ?? [];
  const byStatus = data?.byStatus ?? {};
  const total = STATUSES.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

  if (loading && !data) return <ListSkeleton rows={5} />;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="İzleme"
        title="Destek talepleri"
        subtitle="Pasif hesapların ve işletmelerin talepleri. Yazışın, dosya ekleyin, durumu güncelleyin."
        actions={
          <button type="button" className={btnPrimary()} onClick={() => void reload(true)}>
            Yenile
          </button>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Açık" value={byStatus.OPEN ?? 0} hint="Dönüş bekliyor" accent />
        <Kpi label="İnceleniyor" value={byStatus.IN_PROGRESS ?? 0} hint="Yanıt verildi" />
        <Kpi label="Çözüldü" value={byStatus.RESOLVED ?? 0} hint="Sonuçlandı" />
        <Kpi label="Toplam" value={total} hint="Tüm talepler" />
      </div>

      <section className={`${SECTION} space-y-4 p-5 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className={inputClassName() + " sm:w-80"}
            placeholder="Takip kodu, kafe, ad veya e-posta ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="text-xs text-[var(--muted)]">{items.length} kayıt</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...STATUSES] as const).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "ALL" ? "Tümü" : STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Talep yok" description="Pasif hesaplardan ya da bu filtrelerle eşleşen talep bulunmuyor." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[20%]" />
                <col className="w-[26%]" />
                <col className="w-[14%]" />
                <col className="w-[8%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Kod</th>
                  <th className="px-3 py-3 font-semibold">Kafe / kişi</th>
                  <th className="px-3 py-3 font-semibold">Konu</th>
                  <th className="px-3 py-3 font-semibold">Durum</th>
                  <th className="px-3 py-3 text-right font-semibold">Yazışma</th>
                  <th className="px-6 py-3 font-semibold">Güncelleme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {items.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedId(t.id)} className="cursor-pointer align-middle hover:bg-[var(--surface)]">
                    <td className="px-6 py-3.5 font-mono text-xs tracking-wider text-[var(--accent)]">{t.code}</td>
                    <td className="px-3 py-3.5">
                      <p className="truncate font-medium text-[var(--ink)]">{t.cafe}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{t.requesterName} · {t.requesterEmail}</p>
                    </td>
                    <td className="truncate px-3 py-3.5 text-[var(--ink)]">{t.subject}</td>
                    <td className="px-3 py-3.5">
                      <Pill accent={t.status === "OPEN"}>{STATUS_LABEL[t.status]}</Pill>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-[var(--muted)]">{t._count.messages}</td>
                    <td className="px-6 py-3.5 text-xs tabular-nums text-[var(--muted)]">
                      {new Date(t.updatedAt).toLocaleDateString("tr-TR")}
                      <br />
                      {new Date(t.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TicketDrawer
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={async (msg) => {
          setOk(msg);
          await reload(true);
        }}
        onError={setError}
      />
    </div>
  );
}

function TicketDrawer({
  id,
  onClose,
  onChanged,
  onError,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const { data, error, loading, reload } = useApiQuery<Detail>(`support:detail:${id ?? "none"}`, id ? `/support/tickets/${id}` : "/support/tickets/none", { enabled: !!id });
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function reply(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setLocalError(null);
    onError(null);
    try {
      const fd = new FormData();
      fd.append("body", body);
      files.forEach((f) => fd.append("files", f));
      await api(`/support/tickets/${id}/messages`, { method: "POST", body: fd });
      setBody("");
      setFiles([]);
      await reload(true);
      await onChanged("Yanıt gönderildi");
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Yanıt gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: Status) {
    if (!id) return;
    setBusy(true);
    setLocalError(null);
    try {
      await api(`/support/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await reload(true);
      await onChanged("Durum güncellendi");
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Durum güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SideDrawer open={!!id} onClose={onClose} title="Talep detayı">
      {loading && !data ? <ListSkeleton rows={3} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {data ? (
        <div className="space-y-6">
          <div>
            <p className="font-mono text-xs tracking-widest text-[var(--accent)]">{data.code}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[var(--ink)]">{data.subject}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {data.cafe} · {data.requesterName} · {data.requesterEmail}
              {data.phone ? ` · ${data.phone}` : ""}
            </p>
          </div>

          {data.tenant ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm">
              <span className="text-[var(--muted)]">Eşleşen işletme:</span>
              <Link href={`/tenants/${data.tenant.id}`} className="font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                {data.tenant.name}
              </Link>
              <Pill>{data.tenant.subscriptionStatus}</Pill>
              {!data.tenant.isActive ? <Pill accent>Dondurulmuş</Pill> : null}
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)]">Bu e-posta ile eşleşen bir işletme yok.</p>
          )}

          <div className="flex items-center gap-3">
            <label htmlFor="ticket-status" className="text-xs font-medium text-[var(--muted)]">Durum</label>
            <select
              id="ticket-status"
              className={inputClassName() + " h-9 w-44 py-1 text-sm"}
              value={data.status}
              disabled={busy}
              onChange={(e) => void changeStatus(e.target.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <ol className="space-y-3">
            {data.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  m.authorType === "ADMIN" ? "ml-6 border-[var(--accent-glow)] bg-[var(--accent-soft)]" : "mr-6 border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <p className="text-[11px] font-medium text-[var(--muted)]">
                  {m.authorType === "ADMIN" ? "Destek ekibi" : m.authorName} · {new Date(m.createdAt).toLocaleString("tr-TR")}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-[var(--ink)]">{m.body}</p>
                {m.attachments.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <li key={a.id}>
                        <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[240px] truncate rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-xs text-[var(--accent)] hover:underline">
                          {a.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>

          <form onSubmit={reply} className="space-y-3 border-t border-[var(--line)] pt-5">
            <p className="text-xs font-medium text-[var(--muted)]">Yanıt yaz</p>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder="İşletmeye gönderilecek yanıt…"
            />
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
              className="block w-full text-xs text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--ink)]"
            />
            {files.length ? <p className="text-xs text-[var(--muted)]">{files.map((f) => f.name).join(", ")}</p> : null}
            {localError ? <p className="text-sm text-[var(--accent)]">{localError}</p> : null}
            <button type="submit" className={btnPrimary()} disabled={busy}>
              {busy ? "Gönderiliyor…" : "Yanıtı gönder"}
            </button>
          </form>
        </div>
      ) : null}
    </SideDrawer>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition ${
        active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${accent ? "border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"}`}>
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
