"use client";

import type { FormEvent, ReactNode } from "react";
import { Skeleton } from "../../../components/ui";
import { displayPhone, formatPhoneLabel } from "../../../lib/pii-display";
import { formatTrPhone } from "../../../lib/phone-format";
import { CounterExtraPanels, type CounterProgram } from "../counter-extra-panels";
import type { Customer, PointState } from "./types";

const BTN_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 text-[0.9375rem] font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SUCCESS =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--ink)] px-5 text-[0.9375rem] font-semibold text-[var(--background)] transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";
const BTN_GHOST =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3.5 text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40";
const INPUT =
  "h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-[0.9375rem] tabular-nums text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/55 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]";

function Card({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="attio-surface p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold text-[var(--ink)]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

/* ── Yeni müşteri kaydı ───────────────────────────────────────── */
export function RegisterCard({
  phone,
  onPhoneChange,
  onRegister,
  busy,
}: {
  phone: string;
  onPhoneChange: (v: string) => void;
  onRegister: (e?: FormEvent) => void;
  busy: boolean;
}) {
  return (
    <Card title="Yeni müşteri" subtitle="Telefon numarasıyla kaydedin — ilk damga otomatik verilir.">
      <form onSubmit={(e) => void onRegister(e)} className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor="register-phone" className="sr-only">Telefon</label>
        <input
          id="register-phone"
          className={INPUT}
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          value={phone}
          onChange={(e) => onPhoneChange(formatTrPhone(e.target.value))}
          placeholder="0541 472 58 20"
        />
        <button
          type="submit"
          className={`${BTN_PRIMARY} h-11 shrink-0 whitespace-nowrap sm:w-auto`}
          disabled={busy || !phone.trim()}
        >
          Kaydet + ilk damga
        </button>
      </form>
    </Card>
  );
}

/* ── Damga ilerlemesi ─────────────────────────────────────────── */
function StampDots({ count, required }: { count: number; required: number }) {
  if (required > 20) {
    const pct = Math.min(100, (count / Math.max(1, required)) * 100);
    return (
      <div className="h-3 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${count} / ${required} damga`}>
      {Array.from({ length: required }).map((_, i) => {
        const filled = i < count;
        return (
          <span
            key={i}
            className={`grid h-8 w-8 place-items-center rounded-full text-[0.75rem] font-semibold transition ${
              filled
                ? "bg-[var(--brand)] text-white shadow-[0_2px_8px_rgba(239,35,60,0.35)]"
                : "border-2 border-dashed border-[var(--line-strong)] text-[var(--muted)]/50"
            }`}
          >
            {filled ? "✓" : i + 1}
          </span>
        );
      })}
    </div>
  );
}

type WorkspaceProps = {
  customer: Customer;
  stateLoading: boolean;
  stampsRequired: number;
  rewardLabel: string;
  showClassicStampPanel: boolean;
  busy: boolean;
  onClose: () => void;
  onAddStamp: () => void;
  onRedeem: () => void;
  onShowWalletQr: () => void;
  // Puan
  pointProgram: CounterProgram | undefined;
  pointBalance: number | null;
  pointAmountTry: string;
  onPointAmountTryChange: (v: string) => void;
  pointCategory: string | undefined;
  onPointCategoryChange: (v: string | undefined) => void;
  pointCategories: PointState["categories"];
  pointRedeemOptions: PointState["redeemOptions"];
  onEarnPoints: () => void;
  onRedeemPoints: (cost: number, label: string) => void;
  // Cashback
  cashbackProgram: CounterProgram | undefined;
  cashbackBalanceTry: string | null;
  cashbackEarnPercent: number | null;
  cashbackAmountTry: string;
  onCashbackAmountTryChange: (v: string) => void;
  cashbackBasketTry: string;
  onCashbackBasketTryChange: (v: string) => void;
  cashbackRedeemTry: string;
  onCashbackRedeemTryChange: (v: string) => void;
  onEarnCashback: () => void;
  onRedeemCashback: () => void;
  parseTryToKurus: (raw: string) => number | null;
  // Diğer kartlar
  programs: CounterProgram[];
  states: Record<string, unknown> | undefined;
  onCustomerUpdate: (c: { stampCount: number; rewardReady: boolean }) => void;
  onRefresh: () => Promise<void>;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  setOk: (v: string | null) => void;
};

export function CustomerWorkspace(p: WorkspaceProps) {
  const c = p.customer;
  const remaining = Math.max(p.stampsRequired - c.stampCount, 0);
  const name = formatPhoneLabel(c.displayName, c.phone);

  return (
    <div className="space-y-4">
      {/* Müşteri kartı */}
      <section
        className={`attio-surface overflow-hidden ${c.rewardReady ? "ring-2 ring-[var(--accent)]/40" : ""}`}
        aria-label="Seçili müşteri"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[1rem] font-semibold ${
                c.rewardReady ? "bg-[var(--ink)] text-[var(--background)]" : "bg-[var(--accent)] text-white"
              }`}
              aria-hidden="true"
            >
              {(c.displayName?.trim()?.[0] ?? "#").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[1.0625rem] font-semibold text-[var(--ink)]">{name}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-[var(--muted)]">
                {c.displayName?.trim() ? <span className="font-mono">{displayPhone(c.phone)}</span> : null}
                <span className={`inline-flex items-center gap-1 ${c.hasWallet ? "text-[var(--accent)]" : ""}`}>
                  <span aria-hidden="true">{c.hasWallet ? "●" : "○"}</span>
                  {c.hasWallet ? "Kart telefonunda" : "Kart telefonunda değil"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {p.showClassicStampPanel ? (
          <div className="space-y-4 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[0.8125rem] text-[var(--muted)]">
                <strong className="font-display text-[1.75rem] tabular-nums text-[var(--ink)]">{c.stampCount}</strong>
                <span className="ml-1">/ {p.stampsRequired} damga</span>
              </p>
              <p className={`text-[0.8125rem] font-medium ${c.rewardReady ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {c.rewardReady ? `Ödül hazır: ${p.rewardLabel || "ödül"}` : `${remaining} damga sonra ${p.rewardLabel || "ödül"}`}
              </p>
            </div>
            <StampDots count={c.stampCount} required={p.stampsRequired} />
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <button type="button" className={BTN_PRIMARY} disabled={p.busy || c.rewardReady} onClick={() => void p.onAddStamp()}>
                <span aria-hidden="true">＋</span> Damga ver
              </button>
              <button type="button" className={BTN_SUCCESS} disabled={p.busy || !c.rewardReady} onClick={() => void p.onRedeem()}>
                <span aria-hidden="true">★</span> Ödülü kullandır
              </button>
              <button type="button" className={`${BTN_GHOST} h-12`} disabled={p.busy} onClick={() => void p.onShowWalletQr()}>
                Wallet QR
              </button>
            </div>
            {c.rewardReady ? (
              <p className="text-[0.75rem] text-[var(--muted)]">Yeni damga vermeden önce ödülü kullandırın.</p>
            ) : null}
          </div>
        ) : (
          <div className="flex justify-end px-4 py-3">
            <button type="button" className={BTN_GHOST} disabled={p.busy} onClick={() => void p.onShowWalletQr()}>
              Wallet QR
            </button>
          </div>
        )}
      </section>

      {p.stateLoading ? (
        <div className="grid gap-4" aria-busy="true">
          {Array.from({ length: Math.min(2, Math.max(1, p.programs.length)) }).map((_, i) => (
            <div key={i} className="attio-surface space-y-3 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 [&>*]:min-w-0">
          {p.pointProgram ? (
            <Card
              title={p.pointProgram.name}
              subtitle="Harcamaya göre puan kazandırın"
              right={
                p.pointBalance != null ? (
                  <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[0.8125rem] font-semibold tabular-nums text-[var(--brand)]">
                    {p.pointBalance.toLocaleString("tr-TR")} puan
                  </span>
                ) : null
              }
            >
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label htmlFor="point-amount" className="sr-only">Harcama tutarı (TL)</label>
                  <input id="point-amount" className={INPUT} inputMode="decimal" placeholder="Harcama ₺ (örn. 47,50)" value={p.pointAmountTry} onChange={(e) => p.onPointAmountTryChange(e.target.value)} />
                  <button type="button" className={`${BTN_PRIMARY} h-11 shrink-0`} disabled={p.busy || !p.pointAmountTry.trim()} onClick={() => void p.onEarnPoints()}>
                    Puan ekle
                  </button>
                </div>
                {p.pointCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kategori">
                    {[{ categoryId: undefined as string | undefined, label: "Genel", multiplier: 1 }, ...p.pointCategories].map((cat) => {
                      const active = p.pointCategory === cat.categoryId;
                      return (
                        <button
                          key={cat.categoryId ?? "_"}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => p.onPointCategoryChange(cat.categoryId)}
                          className={`h-8 rounded-full px-3 text-[0.75rem] font-medium transition ${
                            active ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                          }`}
                        >
                          {cat.label ?? cat.categoryId}
                          {cat.multiplier !== 1 ? ` ×${cat.multiplier}` : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {p.pointRedeemOptions.some((r) => r.affordable) ? (
                  <div className="border-t border-[var(--line)] pt-3">
                    <p className="mb-2 text-[0.75rem] font-medium text-[var(--muted)]">Puanla ödül ver</p>
                    <div className="flex flex-wrap gap-2">
                      {p.pointRedeemOptions
                        .filter((r) => r.affordable)
                        .map((r) => (
                          <button key={`${r.pointCost}-${r.rewardLabel}`} type="button" className={BTN_GHOST} disabled={p.busy} onClick={() => void p.onRedeemPoints(r.pointCost, r.rewardLabel)}>
                            {r.rewardLabel} · {r.pointCost} puan
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {p.cashbackProgram ? (
            <Card
              title={p.cashbackProgram.name}
              subtitle={p.cashbackEarnPercent != null ? `Harcamanın %${p.cashbackEarnPercent}'i bakiyeye eklenir` : "Harcamaya göre mağaza kredisi"}
              right={
                p.cashbackBalanceTry != null ? (
                  <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[0.8125rem] font-semibold tabular-nums text-[var(--ink)]">
                    ₺{p.cashbackBalanceTry}
                  </span>
                ) : null
              }
            >
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label htmlFor="cb-amount" className="sr-only">Hesap tutarı (TL)</label>
                  <input id="cb-amount" className={INPUT} inputMode="decimal" placeholder="Hesap ₺ (örn. 500)" value={p.cashbackAmountTry} onChange={(e) => p.onCashbackAmountTryChange(e.target.value)} />
                  <button type="button" className={`${BTN_PRIMARY} h-11 shrink-0`} disabled={p.busy || !p.cashbackAmountTry.trim()} onClick={() => void p.onEarnCashback()}>
                    Ekle
                  </button>
                </div>
                {p.cashbackAmountTry.trim() && p.cashbackEarnPercent != null ? (
                  <p className="text-[0.75rem] text-[var(--muted)]">
                    Tahmini kazanım:{" "}
                    <strong className="tabular-nums text-[var(--ink)]">
                      +₺
                      {(Math.floor(((p.parseTryToKurus(p.cashbackAmountTry) ?? 0) * p.cashbackEarnPercent) / 100) / 100)
                        .toFixed(2)
                        .replace(".", ",")}
                    </strong>
                  </p>
                ) : null}
                <div className="space-y-2 border-t border-[var(--line)] pt-3">
                  <p className="text-[0.75rem] font-medium text-[var(--muted)]">Bakiyeden düş</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="cb-basket" className="mb-1 block text-[0.6875rem] text-[var(--muted)]">Sepet ₺ (isteğe bağlı)</label>
                      <input id="cb-basket" className={INPUT} inputMode="decimal" placeholder="180" value={p.cashbackBasketTry} onChange={(e) => p.onCashbackBasketTryChange(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="cb-redeem" className="mb-1 block text-[0.6875rem] text-[var(--muted)]">Kullanılacak ₺</label>
                      <input id="cb-redeem" className={INPUT} inputMode="decimal" placeholder="47,50" value={p.cashbackRedeemTry} onChange={(e) => p.onCashbackRedeemTryChange(e.target.value)} />
                    </div>
                  </div>
                  <button type="button" className={`${BTN_GHOST} w-full`} disabled={p.busy || !p.cashbackRedeemTry.trim()} onClick={() => void p.onRedeemCashback()}>
                    Bakiyeden düş
                  </button>
                </div>
              </div>
            </Card>
          ) : null}

          <CounterExtraPanels
            customerId={c.id}
            customer={{ stampCount: c.stampCount, rewardReady: c.rewardReady }}
            programs={p.programs}
            states={p.states}
            busy={p.busy}
            setBusy={p.setBusy}
            setError={p.setError}
            setOk={p.setOk}
            onRefresh={p.onRefresh}
            onCustomerUpdate={p.onCustomerUpdate}
            stampsRequired={p.stampsRequired}
            rewardLabel={p.rewardLabel}
          />
        </div>
      )}
    </div>
  );
}
