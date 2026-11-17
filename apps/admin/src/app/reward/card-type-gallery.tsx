"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProgramTypeCatalogEntry } from "@ngl/shared";

/**
 * "Yeni kart" galerisi — her kart türü, örnek verilerle dolu bir Wallet kartı
 * olarak gösterilir; kullanıcı kartın ne işe yaradığını görerek seçer.
 */

type TypeStory = {
  /** Kartın tek cümlelik vaadi */
  pitch: string;
  /** Kasada nasıl işler — 3 kısa adım */
  how: [string, string, string];
  /** Hangi işletme için ideal */
  bestFor: string;
  color: string;
  fg: string;
  /** Kartın orta alanı — örnek içerik */
  body: ReactNode;
  /** Alt satırdaki 3 alan */
  fields: [string, string][];
};

const Dots = ({ filled, total, fg, size = 18 }: { filled: number; total: number; fg: string; size?: number }) => (
  <div className="flex flex-wrap justify-center gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className="rounded-full"
        style={{
          width: size,
          height: size,
          ...(i < filled ? { background: fg } : { border: `1.5px dashed ${fg}`, opacity: 0.45 }),
        }}
      />
    ))}
  </div>
);

const Big = ({ children, sub }: { children: ReactNode; sub: string }) => (
  <div className="py-1 text-center">
    <p className="font-display text-[1.6rem] leading-none tracking-tight">{children}</p>
    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] opacity-75">{sub}</p>
  </div>
);

const STORIES: Record<string, TypeStory> = {
  STAMP_CARD: {
    pitch: "Her ziyarette bir damga, dolunca ödül.",
    how: ["Müşteri kasada telefonunu gösterir", "Her alışverişte 1 damga eklenir", "10 damga dolunca ödülü alır"],
    bestFor: "Kafe, fırın, berber — sık gelen müşteri",
    color: "#1B4332",
    fg: "#FFFFFF",
    body: <Dots filled={7} total={10} fg="#FFFFFF" size={14} />,
    fields: [["Damga", "7/10"], ["Ödül", "Bedava kahve"], ["Durum", "3 kaldı"]],
  },
  MULTI_STAMP: {
    pitch: "Farklı ürünler için ayrı damga sıraları.",
    how: ["Kahve ve tatlı için ayrı sıra", "Hangi ürün alındıysa o sıraya damga", "Her sıra kendi ödülünü verir"],
    bestFor: "Birden çok ürün grubu olan kafeler",
    color: "#312E81",
    fg: "#FFFFFF",
    body: (
      <div className="w-full space-y-1.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold"><span className="w-10 opacity-80">Kahve</span><div className="flex flex-1 justify-start [&>div]:justify-start"><Dots filled={4} total={5} fg="#FFFFFF" size={11} /></div></div>
        <div className="flex items-center gap-2 text-[10px] font-semibold"><span className="w-10 opacity-80">Tatlı</span><div className="flex flex-1 justify-start [&>div]:justify-start"><Dots filled={2} total={5} fg="#FFFFFF" size={11} /></div></div>
      </div>
    ),
    fields: [["Kahve", "4/5"], ["Tatlı", "2/5"], ["Ödül", "2 sırada"]],
  },
  POINT_CARD: {
    pitch: "Harcadıkça puan, puanla ödül.",
    how: ["Kasiyer hesap tutarını girer", "Her 1 ₺ için puan kazanılır", "Puanlar ödüllere harcanır"],
    bestFor: "Sepet tutarı değişken işletmeler",
    color: "#92400E",
    fg: "#FFFFFF",
    body: <Big sub="puan">1.250</Big>,
    fields: [["Seviye", "Gümüş"], ["Sonraki ödül", "250 puan"], ["Değer", "≈ ₺25"]],
  },
  CASHBACK_CARD: {
    pitch: "Harcamanın bir kısmı müşteriye bakiye olarak döner.",
    how: ["Her alışverişte %5 bakiye kazanır", "Bakiye kartında birikir", "Sonraki alışverişte TL olarak kullanır"],
    bestFor: "Restoran, market, perakende",
    color: "#14532D",
    fg: "#FFFFFF",
    body: <Big sub="kullanılabilir bakiye">₺48,50</Big>,
    fields: [["Oran", "%5"], ["Bu ay", "+₺12,40"], ["Durum", "Aktif"]],
  },
  DISCOUNT_CARD: {
    pitch: "Kart sahibine kalıcı indirim.",
    how: ["Müşteri kartı kasada gösterir", "Kasiyer kartı doğrular", "İndirim hesaba uygulanır"],
    bestFor: "Öğrenci, kurumsal veya VIP indirimi",
    color: "#9D174D",
    fg: "#FFFFFF",
    body: <Big sub="tüm içeceklerde">%15</Big>,
    fields: [["Geçerlilik", "31 Ara"], ["Bugün", "2 hak"], ["Tür", "Öğrenci"]],
  },
  EVENT_CARD: {
    pitch: "Etkinlik bileti ve giriş hakkı telefonda.",
    how: ["Müşteri kartı Wallet'a ekler", "Girişte kasiyer kartı okutur", "Kalan giriş hakkı düşer"],
    bestFor: "Konser, atölye, tadım günü",
    color: "#0C4A6E",
    fg: "#FFFFFF",
    body: (
      <div className="space-y-1 py-1 text-center">
        <p className="text-[0.95rem] font-semibold leading-tight">Kahve Tadım Atölyesi</p>
        <p className="text-[11px] opacity-80">Cumartesi · 14:00</p>
      </div>
    ),
    fields: [["Giriş", "2 hak"], ["Tarih", "21 Ara"], ["Koltuk", "Serbest"]],
  },
  MEMBERSHIP_CARD: {
    pitch: "Ücretli üyelik, üyeye özel ayrıcalıklar.",
    how: ["Müşteri üyelik paketini satın alır", "Kartında üyelik süresi görünür", "Kasada üyelik avantajı kullanılır"],
    bestFor: "Kahve aboneliği, kulüp üyeliği",
    color: "#581C87",
    fg: "#FFFFFF",
    body: <Big sub="üyelik">Gold</Big>,
    fields: [["Bitiş", "12 Ara"], ["Bu ay", "8/30 kahve"], ["Durum", "Aktif"]],
  },
  STAFF_CARD: {
    pitch: "Çalışanlarınıza özel indirim kartı.",
    how: ["Çalışan davet koduyla kart alır", "Kasada personel indirimi uygulanır", "Aylık limit takip edilir"],
    bestFor: "Personel yemeği ve indirimi",
    color: "#1E293B",
    fg: "#FFFFFF",
    body: <Big sub="personel indirimi">%30</Big>,
    fields: [["Limit", "₺1.000/ay"], ["Kalan", "₺640"], ["Şube", "Merkez"]],
  },
};

/** Örnek verilerle dolu mini Wallet kartı */
export function SampleWalletCard({ type, label }: { type: string; label: string }) {
  const st = STORIES[type];
  if (!st) return null;
  return (
    <div
      className="relative flex aspect-[1.586/1] w-full flex-col overflow-hidden rounded-xl p-3 shadow-[0_8px_18px_rgba(0,0,0,0.16)]"
      style={{ background: st.color, color: st.fg }}
      aria-hidden="true"
    >
      <span className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full opacity-10" style={{ background: st.fg }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Kafe Örnek</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-75">{label}</span>
      </div>
      <div className="my-2 grid min-h-[58px] place-items-center rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.10)" }}>
        {st.body}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {st.fields.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <p className="truncate text-[8.5px] font-semibold uppercase tracking-[0.1em] opacity-70">{k}</p>
            <p className="truncate text-[11px] font-semibold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardTypeGallery({
  open,
  onClose,
  catalog,
  creating,
  onCreate,
  multiBranch,
  branches,
  defaultBranchId,
}: {
  open: boolean;
  onClose: () => void;
  catalog: ProgramTypeCatalogEntry[];
  creating: boolean;
  onCreate: (type: string, branchId?: string) => void;
  multiBranch?: boolean;
  branches?: { id: string; name: string }[];
  defaultBranchId?: string | null;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  // Açılabilir olanlar önce
  const sorted = [...catalog].sort((a, b) => Number(b.canCreate) - Number(a.canCreate));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Yeni kart türü seç"
        tabIndex={-1}
        className="relative flex max-h-[96vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-t-3xl bg-[var(--background)] shadow-[var(--shadow-lg)] outline-none sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3 sm:px-6">
          <div>
            <h2 className="font-display text-[1.25rem] tracking-tight text-[var(--ink)]">Hangi kartı eklemek istersiniz?</h2>
            <p className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
              Her kart müşterinin telefonunda böyle görünür. Örnek değerleri sonra kendinize göre ayarlarsınız.
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]" aria-label="Kapat">
            ✕
          </button>
        </header>

        {multiBranch ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-2.5 sm:px-6">
            <label htmlFor="new-card-branch" className="text-[0.8125rem] font-medium text-[var(--ink)]">Şube</label>
            <select
              id="new-card-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-8 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-[0.8125rem]"
            >
              <option value="">Şube seçin…</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <span className="text-[0.75rem] text-[var(--muted)]">Kart bu şubede geçerli olur.</span>
          </div>
        ) : null}

        <div className="overflow-y-auto p-4 lg:overflow-visible">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.map((entry) => {
              const st = STORIES[entry.type];
              const available = entry.canCreate;
              return (
                <li key={entry.type}>
                  <article
                    className={`flex h-full flex-col rounded-2xl border bg-[var(--panel)] p-3 transition ${
                      available ? "border-[var(--line)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]" : "border-dashed border-[var(--line)]"
                    }`}
                  >
                    <div className={available ? "" : "opacity-60 grayscale-[35%]"}>
                      <SampleWalletCard type={entry.type} label={entry.label} />
                    </div>

                    <div className="mt-2.5 flex items-start justify-between gap-2">
                      <h3 className="text-[0.9375rem] font-semibold text-[var(--ink)]">{entry.label}</h3>
                      {entry.locked && entry.upgradePlanLabel ? (
                        <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                          🔒 {entry.upgradePlanLabel}
                        </span>
                      ) : entry.quotaFull ? (
                        <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">Limit doldu</span>
                      ) : entry.used > 0 ? (
                        <span className="shrink-0 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                          {entry.used} kullanılıyor
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--ink)]">{st?.pitch ?? entry.hint}</p>

                    {st ? <p className="mt-1 text-[0.6875rem] leading-snug text-[var(--muted)]">İdeal: {st.bestFor}</p> : null}

                    <div className="mt-auto pt-2.5">
                      {available ? (
                        <button
                          type="button"
                          disabled={creating || (multiBranch && !branchId)}
                          onClick={() => onCreate(entry.type, multiBranch ? branchId || undefined : undefined)}
                          className="h-9 w-full rounded-lg bg-[var(--accent)] text-[0.8125rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                        >
                          {creating ? "Ekleniyor…" : multiBranch && !branchId ? "Önce şube seçin" : "Bu kartı ekle"}
                        </button>
                      ) : (
                        <Link
                          href="/billing"
                          className="grid h-9 w-full place-items-center rounded-lg border border-[var(--line)] text-[0.75rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)]"
                        >
                          {entry.locked ? "Paketi yükselt" : "Daha fazla kart için yükselt"}
                        </Link>
                      )}
                      {!available && entry.lockedReason ? (
                        <p className="mt-1 truncate text-center text-[0.6875rem] text-[var(--muted)]" title={entry.lockedReason}>{entry.lockedReason}</p>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
