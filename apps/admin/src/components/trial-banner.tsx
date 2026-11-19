"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getStoredUser, type SubscriptionSnapshot } from "../lib/api";

/**
 * Tüm sayfalarda abonelik durumu şeridi:
 * - Deneme: kalan gün ve paket seçimi
 * - İptal edilmiş abonelik: erişimin bittiği güne kadar kalan süre (ilerleme çubuğu) + iptali geri alma
 */
export function TrialBanner() {
  const [snap, setSnap] = useState<SubscriptionSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletionAt, setDeletionAt] = useState<string | null>(null);

  const load = useCallback(() => {
    const user = getStoredUser();
    if (!user || user.role !== "STORE_OWNER") return () => {};
    let cancelled = false;
    api<SubscriptionSnapshot>("/tenants/me/subscription")
      .then((s) => {
        if (!cancelled) setSnap(s);
      })
      .catch(() => undefined);
    api<{ deletionScheduledAt?: string | null }>("/tenants/me")
      .then((t) => {
        if (!cancelled) setDeletionAt(t.deletionScheduledAt ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  async function cancelDeletion() {
    setBusy(true);
    setError(null);
    try {
      await api("/tenants/me/deletion/cancel", { method: "POST" });
      load();
    } catch {
      setError("Silme talebi iptal edilemedi");
    } finally {
      setBusy(false);
    }
  }

  // Silme talebi: kapatılamaz, 14 gün boyunca her sayfada kalır; her an iptal edilebilir
  const deletionBar = deletionAt ? (() => {
    const msLeft = new Date(deletionAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
    const pct = Math.max(0, Math.min(100, (daysLeft / 14) * 100));
    return (
      <div role="alert" className="mb-4 rounded-xl border border-[rgba(239,35,60,0.45)] bg-[var(--accent-soft)] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)]">
              Hesabınız {new Date(deletionAt).toLocaleDateString("tr-TR")} tarihinde kalıcı olarak silinecek
              {daysLeft > 0 ? ` (${daysLeft} gün kaldı).` : "."}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">Bu süre içinde silme talebini istediğiniz zaman iptal edebilirsiniz.</p>
          </div>
          <button type="button" onClick={() => void cancelDeletion()} disabled={busy} className="h-9 shrink-0 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-4 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50">
            Silmeyi iptal et
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuemin={0} aria-valuemax={14} aria-valuenow={daysLeft} aria-label="Silmeye kalan süre">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        {error ? <p className="mt-2 text-xs text-[var(--accent)]">{error}</p> : null}
      </div>
    );
  })() : null;

  async function resume() {
    setBusy(true);
    setError(null);
    try {
      await api("/tenants/me/subscription/resume", { method: "POST" });
      load();
    } catch {
      setError("İptal geri alınamadı");
    } finally {
      setBusy(false);
    }
  }

  if (!snap) return deletionBar;

  if (snap.status === "CANCELLED" && !snap.trialExpired) {
    return (
      <>
        {deletionBar}
        <CancelledBar snap={snap} busy={busy} error={error} onResume={() => void resume()} />
      </>
    );
  }

  if (snap.status !== "TRIAL") return deletionBar;

  return (
    <>
      {deletionBar}
      <TrialNotice snap={snap} />
    </>
  );
}

function CancelledBar({ snap, busy, error, onResume }: { snap: SubscriptionSnapshot; busy: boolean; error: string | null; onResume: () => void }) {
    const days = snap.daysRemaining ?? 0;
    const total = 30;
    const pct = Math.max(0, Math.min(100, (days / total) * 100));
    const endsOn = snap.accessEndsAt ? new Date(snap.accessEndsAt).toLocaleDateString("tr-TR") : "";
    return (
      <div role="status" className="mb-4 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)]">
              Aboneliğiniz iptal edildi. {days > 0 ? `${days} gün sonra hesabınıza giriş yapamayacaksınız.` : "Bugün erişiminiz sona eriyor."}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">{endsOn ? `Erişim ${endsOn} tarihine kadar devam eder.` : ""}</p>
          </div>
          <button
            type="button"
            onClick={onResume}
            disabled={busy}
            className="h-9 shrink-0 rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-50"
          >
            {busy ? "Geri alınıyor…" : "İptali geri al"}
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={days} aria-label="Kalan erişim süresi">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        {error ? <p className="mt-2 text-xs text-[var(--accent)]">{error}</p> : null}
      </div>
    );
}

function TrialNotice({ snap }: { snap: SubscriptionSnapshot }) {
  const days = snap.daysRemaining ?? 0;
  const urgent = days <= 3 || snap.trialExpired;

  const endsOn = snap.trialEndsAt ? new Date(snap.trialEndsAt).toLocaleDateString("tr-TR") : "";

  return (
    <div
      role="status"
      className={`mb-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        urgent
          ? "border-[rgba(239,35,60,0.45)] bg-[var(--accent-soft)] text-[var(--ink)]"
          : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
      }`}
    >
      <p>
        {snap.trialExpired
          ? "Deneme süreniz sona erdi. Devam etmek için paketinizi satın alın."
          : `Denemeniz ${days} gün sonra bitecek${endsOn ? ` (${endsOn})` : ""}. Kesintisiz devam etmek için paket satın alın.`}
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white"
      >
        Paket satın al
      </Link>
    </div>
  );
}
