"use client";

import { Skeleton } from "../../../components/ui";
import { displayPhone, formatPhoneLabel } from "../../../lib/pii-display";
import type { Customer, Filter } from "./types";

type Props = {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  customers: Customer[] | null;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  stampsRequired: number;
  selectedId: string | null;
  onSelect: (c: Customer) => void;
  onRegisterFromSearch: (phone: string) => void;
  refreshing: boolean;
  busy: boolean;
};

/** Aranan metin telefon numarasına benziyor mu (kayıt önerisi için) */
function looksLikePhone(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 12;
}

export function CustomerList({
  searchInput,
  onSearchInputChange,
  filter,
  onFilterChange,
  customers,
  total,
  page,
  totalPages,
  onPageChange,
  stampsRequired,
  selectedId,
  onSelect,
  onRegisterFromSearch,
  refreshing,
  busy,
}: Props) {
  return (
    <section className="attio-surface flex min-h-0 flex-col overflow-hidden" aria-label="Müşteriler">
      <div className="space-y-2.5 border-b border-[var(--line)] p-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <label htmlFor="counter-search" className="sr-only">Müşteri ara</label>
          <input
            id="counter-search"
            autoFocus
            inputMode="tel"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Telefon, son 4 hane veya isim"
            className="h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] pl-9 pr-9 text-[0.9375rem] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => onSearchInputChange("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface)]"
              aria-label="Aramayı temizle"
            >
              ✕
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div role="radiogroup" aria-label="Filtre" className="inline-flex gap-0.5 rounded-lg bg-[var(--surface)] p-0.5">
            {(
              [
                ["all", "Tümü"],
                ["ready", "Ödülü hazır"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={filter === id}
                onClick={() => onFilterChange(id)}
                className={`h-7 rounded-md px-2.5 text-[0.75rem] font-medium transition ${
                  filter === id
                    ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--line)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[0.6875rem] tabular-nums text-[var(--muted)]">
            {refreshing ? "Yükleniyor…" : `${total} müşteri`}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {customers === null ? (
          <ul className="divide-y divide-[var(--line)]" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : customers.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[0.875rem] font-medium text-[var(--ink)]">Müşteri bulunamadı</p>
            <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
              {filter === "ready" ? "Şu an ödülü hazır müşteri yok." : "Aramayı değiştirin veya yeni müşteri kaydedin."}
            </p>
            {looksLikePhone(searchInput) ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRegisterFromSearch(searchInput.trim())}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--accent)] px-4 text-[0.8125rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {searchInput.trim()} numarasını kaydet
              </button>
            ) : null}
          </div>
        ) : (
          <ul className={`divide-y divide-[var(--line)] transition-opacity ${refreshing ? "opacity-60" : ""}`}>
            {customers.map((c) => {
              const active = selectedId === c.id;
              const pct = Math.min(100, (c.stampCount / Math.max(1, stampsRequired)) * 100);
              const name = formatPhoneLabel(c.displayName, c.phone);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)] ${
                      active ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface)]"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold ${
                        c.rewardReady ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--ink)]"
                      }`}
                      aria-hidden="true"
                    >
                      {c.rewardReady ? "★" : (c.displayName?.trim()?.[0] ?? "#").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[0.875rem] font-medium text-[var(--ink)]">{name}</span>
                        <span className="shrink-0 text-[0.6875rem] tabular-nums text-[var(--muted)]">
                          {c.rewardReady ? (
                            <strong className="font-semibold text-[var(--accent)]">Ödül hazır</strong>
                          ) : (
                            `${c.stampCount}/${stampsRequired}`
                          )}
                        </span>
                      </span>
                      {c.displayName?.trim() ? (
                        <span className="block truncate font-mono text-[0.6875rem] text-[var(--muted)]">{displayPhone(c.phone)}</span>
                      ) : null}
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--line)]">
                        <span
                          className={`block h-full rounded-full ${c.rewardReady ? "bg-[var(--accent)]" : "bg-[var(--brand)]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-3 py-2">
          <button
            type="button"
            disabled={page <= 1 || refreshing}
            onClick={() => onPageChange(page - 1)}
            className="h-8 rounded-md px-2.5 text-[0.8125rem] font-medium text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-40"
          >
            ← Önceki
          </button>
          <span className="text-[0.75rem] tabular-nums text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || refreshing}
            onClick={() => onPageChange(page + 1)}
            className="h-8 rounded-md px-2.5 text-[0.8125rem] font-medium text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-40"
          >
            Sonraki →
          </button>
        </div>
      ) : null}
    </section>
  );
}
