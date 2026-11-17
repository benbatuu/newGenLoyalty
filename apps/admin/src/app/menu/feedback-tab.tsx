"use client";

import { useState, useMemo } from "react";
import {
  EmptyState,
  ErrorBanner,
  ListRowsSkeleton,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type FeedbackRow = {
  id: string;
  type: string;
  name: string | null;
  message: string;
  tableLabel: string | null;
  lang: string | null;
  status: string;
  createdAt: string;
};

export function FeedbackTab() {
  const [activeTab, setActiveTab] = useState<"suggestion" | "complaint">("suggestion");
  
  const {
    data,
    loading,
    error,
    reload,
  } = useApiQuery<FeedbackRow[]>(
    `menu:feedback:all`,
    `/menu/feedback`,
  );
  
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const [sortCol, setSortCol] = useState<keyof FeedbackRow>("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function setStatus(id: string, status: "READ" | "ARCHIVED" | "NEW") {
    setBusyId(id);
    setActionErr(null);
    try {
      await api(`/menu/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      void reload(true);
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : "Güncellenemedi");
    } finally {
      setBusyId(null);
    }
  }

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.type === activeTab);
  }, [data, activeTab]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];
      if (valA === null) valA = "";
      if (valB === null) valB = "";
      
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [filteredData, sortCol, sortDesc]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: keyof FeedbackRow) => {
    if (sortCol === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(col);
      setSortDesc(true);
    }
    setPage(1);
  };

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      suggestion: all.filter((r) => r.type === "suggestion").length,
      complaint: all.filter((r) => r.type === "complaint").length,
      unread: all.filter((r) => r.status === "NEW").length,
    };
  }, [data]);

  const statusLabel: Record<string, string> = { NEW: "Yeni", READ: "Okundu", ARCHIVED: "Arşiv" };
  const statusCls: Record<string, string> = {
    NEW: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30",
    READ: "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]",
    ARCHIVED: "bg-[var(--surface)] text-[var(--muted)]/70 border-dashed border-[var(--line)]",
  };

  const SortBtn = ({ col, label }: { col: keyof FeedbackRow; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(col)}
      className={`inline-flex items-center gap-1 text-xs font-medium transition hover:text-[var(--ink)] ${sortCol === col ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
    >
      {label}
      <span aria-hidden>{sortCol === col ? (sortDesc ? "↓" : "↑") : ""}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          QR menüdeki öneri ve şikayet formlarından gelen mesajlar burada listelenir.
        </p>
        <div className="inline-flex shrink-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-0.5" role="tablist">
          {([
            { id: "suggestion", label: "Öneriler", n: counts.suggestion },
            { id: "complaint", label: "Şikayetler", n: counts.complaint },
          ] as const).map((t) => {
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => { setActiveTab(t.id); setPage(1); }}
                className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[0.8125rem] font-medium transition ${on ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                {t.label}
                <span className="rounded-full bg-[var(--surface)] px-1.5 text-[11px] tabular-nums text-[var(--muted)]">{t.n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ErrorBanner message={actionErr ?? error} />

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
        {loading && !data ? (
          <div className="p-2"><ListRowsSkeleton rows={4} /></div>
        ) : !sortedData.length ? (
          <div className="p-6">
            <EmptyState title="Henüz mesaj yok" description="Müşteriler mesaj gönderdiğinde burada görünür." />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[var(--line)] bg-[var(--surface)]/60 px-5 py-2.5">
              <SortBtn col="createdAt" label="Tarih" />
              <SortBtn col="name" label="Müşteri" />
              <SortBtn col="tableLabel" label="Masa" />
              <SortBtn col="status" label="Durum" />
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {paginatedData.map((row) => (
                <li key={row.id} className={`px-5 py-4 transition hover:bg-[var(--surface)]/60 ${row.status === "ARCHIVED" ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCls[row.status] ?? statusCls.READ}`}>
                      {statusLabel[row.status] ?? row.status}
                    </span>
                    <span className="text-sm font-medium text-[var(--ink)]">{row.name || "İsimsiz"}</span>
                    {row.tableLabel && (
                      <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">{row.tableLabel}</span>
                    )}
                    <span className="ml-auto text-xs tabular-nums text-[var(--muted)]">
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--ink)]">{row.message}</p>
                  <div className="mt-3 flex gap-1">
                    {row.status !== "READ" && (
                      <button type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, "READ")}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-40">
                        Okundu işaretle
                      </button>
                    )}
                    {row.status !== "ARCHIVED" ? (
                      <button type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, "ARCHIVED")}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40">
                        Arşivle
                      </button>
                    ) : (
                      <button type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, "NEW")}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40">
                        Geri al
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3 text-xs">
            <span className="text-[var(--muted)]">
              {sortedData.length} kayıt · Sayfa {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg border border-[var(--line)] px-3 font-medium transition hover:bg-[var(--surface)] disabled:opacity-40">
                Önceki
              </button>
              <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 rounded-lg border border-[var(--line)] px-3 font-medium transition hover:bg-[var(--surface)] disabled:opacity-40">
                Sonraki
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
