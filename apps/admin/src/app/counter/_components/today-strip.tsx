"use client";

import { Skeleton } from "../../../components/ui";
import type { CounterBootstrap } from "./types";

const nf = new Intl.NumberFormat("tr-TR");

/** Bugünün sayıları + geçerli kampanyalar — kasanın üst şeridi */
export function TodayStrip({ data }: { data: CounterBootstrap | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-6 w-10" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Bugün verilen damga", value: data.summary.stampsToday },
    { label: "Bugün kullanılan ödül", value: data.summary.redeemsToday },
    { label: "Ödülü hazır bekleyen", value: data.summary.rewardReadyCount },
    { label: "Toplam müşteri", value: data.summary.totalCustomers },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3"
          >
            <p className="text-[0.6875rem] font-medium text-[var(--muted)]">{it.label}</p>
            <p className="mt-0.5 font-display text-[1.5rem] leading-tight tabular-nums text-[var(--ink)]">
              {nf.format(it.value)}
            </p>
          </div>
        ))}
      </div>
      {data.campaigns.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3.5 py-2">
          <span className="text-[0.75rem] font-semibold text-[var(--accent)]">
            Bugün geçerli kampanya
          </span>
          {data.campaigns.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-[var(--panel)] px-2.5 py-0.5 text-[0.75rem] font-medium text-[var(--ink)] ring-1 ring-[var(--accent)]/25"
            >
              {c.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
