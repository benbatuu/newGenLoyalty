"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { btnGhost, btnPrimary, inputClassName } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import {
  BONUS_OPTIONS,
  NAME_IDEAS,
  bonusLabel,
  describeGoal,
  draftFrom,
  medalClass,
  parseDraft,
  sortTiers,
  validateDraft,
  type VipTier,
} from "./vip-model";

export function TierDrawer({
  tier,
  tiers,
  onClose,
  onSaved,
}: {
  /** Düzenlenen seviye; yoksa yeni seviye */
  tier: VipTier | null;
  tiers: VipTier[];
  onClose: () => void;
  onSaved: (row: VipTier, message: string) => void;
}) {
  const [d, setD] = useState(() => draftFrom(tier ?? undefined));
  // Hata yalnızca alandan çıkınca veya kaydetmeye basınca görünür
  const [touched, setTouched] = useState({ name: false, goal: false, bonus: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = "tier-drawer-title";

  const others = useMemo(() => tiers.filter((t) => t.id !== tier?.id), [tiers, tier]);
  const problem = validateDraft(d, others);
  const parsed = parseDraft(d);
  const unusedNames = NAME_IDEAS.filter(
    (n) => !others.some((t) => t.name.toLocaleLowerCase("tr") === n.toLocaleLowerCase("tr")),
  );

  // Önizleme: bu seviye listede kaçıncı basamak olur
  const preview = useMemo(() => {
    const fake: VipTier = {
      id: "__preview",
      name: parsed.name || "Yeni seviye",
      minVisits: parsed.minVisits,
      minSpendKurus: parsed.minSpendKurus,
      rateMultiplier: 1,
      sortOrder: 0,
    };
    const list = sortTiers([...others, fake]);
    return { index: list.findIndex((t) => t.id === "__preview"), total: list.length, name: fake.name };
  }, [others, parsed.name, parsed.minVisits, parsed.minSpendKurus]);

  // Hazır yüzdelerden biri değilse "Özel" alanı açık başlar
  const [customOpen, setCustomOpen] = useState(
    () => !BONUS_OPTIONS.includes(tier?.rateMultiplier ?? 1),
  );
  const [customPct, setCustomPct] = useState(() =>
    tier && !BONUS_OPTIONS.includes(tier.rateMultiplier)
      ? String(Math.round((tier.rateMultiplier - 1) * 100))
      : "",
  );
  const customValue = Number(customPct.replace(",", "."));
  const customProblem =
    customOpen && !(customValue >= 1 && customValue <= 100)
      ? "1 ile 100 arasında bir sayı girin. Örn. 30 yazarsanız %30 fazla kazanır."
      : null;

  function setCustom(raw: string) {
    const clean = raw.replace(/[^\d]/g, "").slice(0, 3);
    setCustomPct(clean);
    const n = Number(clean);
    set("multiplier", n >= 1 && n <= 100 ? Math.round((1 + n / 100) * 100) / 100 : 1);
  }

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setError(null);
  };

  // Escape ile kapat, odak panelde kalsın, kapanınca açan butona dönsün
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled])",
        );
        if (!items.length) return;
        const a = items[0];
        const z = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, goal: true, bonus: true });
    if (problem || customProblem || saving) return;
    setSaving(true);
    setError(null);
    try {
      const row = await api<VipTier>(tier ? `/vip/tiers/${tier.id}` : "/vip/tiers", {
        method: tier ? "PATCH" : "POST",
        body: JSON.stringify(parsed),
      });
      onSaved(
        { ...row, _count: row._count ?? tier?._count ?? { customers: 0 } },
        tier ? `«${row.name}» güncellendi.` : `«${row.name}» seviyesi eklendi.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi. Tekrar deneyin.");
      setSaving(false);
    }
  }

  // Eski kayıtta listede olmayan bir değer varsa o da seçilebilir kalsın

  const showProblem = problem && touched[problem.field] ? problem : null;

  // Bir hedef ziyarette, diğeri harcamada daha zorsa sıra kafa karıştırabilir
  const mixedWith = others.find(
    (t) =>
      (t.minVisits - parsed.minVisits) * (t.minSpendKurus - parsed.minSpendKurus) < 0,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Kapat"
        tabIndex={-1}
        className="campaign-fade absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="campaign-slide relative flex h-full w-full max-w-[28rem] flex-col bg-[var(--panel)] shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-base tracking-tight text-[var(--ink)]">
              {tier ? "Seviyeyi düzenle" : "Yeni seviye"}
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
              Bir ad ve hedef seçin. Hedefe ulaşan müşteri bu seviyeye kendiliğinden geçer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {/* 1. Ad */}
            <div>
              <label htmlFor="tier-name" className="text-[0.8125rem] font-medium text-[var(--ink)]">
                Seviyenin adı
              </label>
              <input
                id="tier-name"
                className={`${inputClassName()} mt-1.5 h-9`}
                value={d.name}
                maxLength={80}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                placeholder="Örn. Altın"
                aria-invalid={showProblem?.field === "name" ? true : undefined}
                aria-describedby={showProblem?.field === "name" ? "tier-err" : undefined}
              />
              {unusedNames.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unusedNames.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("name", n)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                        d.name === n
                          ? "border-[var(--ink)] bg-[var(--accent)] text-white"
                          : "border-[var(--line)] text-[var(--muted)] hover:border-black/25 hover:text-[var(--ink)]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 2. Hedef */}
            <fieldset className="space-y-3">
              <legend className="text-[0.8125rem] font-medium text-[var(--ink)]">
                Müşteri bu seviyeye ne zaman geçsin?
              </legend>

              <div className="rounded-lg border border-[var(--line)] p-3">
                <label htmlFor="tier-visits" className="text-[0.8125rem] text-[var(--ink)]">
                  Toplam ziyaret sayısı
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Stepper
                    label="Ziyareti azalt"
                    onClick={() => set("visits", String(Math.max(0, (Number(d.visits) || 0) - 1)))}
                  >
                    −
                  </Stepper>
                  <input
                    id="tier-visits"
                    className={`${inputClassName()} h-9 !w-20 text-center tabular-nums`}
                    inputMode="numeric"
                    value={d.visits}
                    onChange={(e) => set("visits", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="0"
                  />
                  <Stepper
                    label="Ziyareti artır"
                    onClick={() => set("visits", String((Number(d.visits) || 0) + 1))}
                  >
                    +
                  </Stepper>
                  <span className="text-[0.8125rem] text-[var(--muted)]">ziyaret</span>
                </div>
                <p className="mt-1.5 text-[0.6875rem] leading-snug text-[var(--muted)]">
                  Kasada damga, puan veya para iadesi kazandığı her alışveriş 1 ziyaret sayılır.
                </p>
              </div>

              <div className="rounded-lg border border-[var(--line)] p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-[0.8125rem] text-[var(--ink)]">Harcama şartı da olsun</span>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={d.useSpend}
                    onChange={(e) => set("useSpend", e.target.checked)}
                  />
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-glow)] ${
                      d.useSpend ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--panel)] shadow transition-transform ${
                        d.useSpend ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </label>
                {d.useSpend ? (
                  <div className="mt-3">
                    <label htmlFor="tier-spend" className="sr-only">
                      Toplam harcama (TL)
                    </label>
                    <div className="relative">
                      <input
                        id="tier-spend"
                        className={`${inputClassName()} h-9 pr-10 tabular-nums`}
                        inputMode="decimal"
                        value={d.spendTry}
                        onChange={(e) => set("spendTry", e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))}
                        placeholder="Örn. 1000"
                        onBlur={() => setTouched((p) => ({ ...p, goal: true }))}
                        aria-invalid={showProblem?.field === "goal" ? true : undefined}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[0.8125rem] text-[var(--muted)]">
                        TL
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.6875rem] leading-snug text-[var(--muted)]">
                      Yalnızca puan veya para iadesi kartında tutarı girilen alışverişler sayılır.
                      Damga kartı kullanıyorsanız bu şartı kapalı bırakın.
                    </p>
                  </div>
                ) : null}
              </div>
            </fieldset>

            {/* 3. Ödül */}
            <fieldset>
              <legend className="text-[0.8125rem] font-medium text-[var(--ink)]">
                Bu seviyedeki müşteri ne kazansın?
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ekstra kazanç">
                {BONUS_OPTIONS.map((m) => {
                  const on = !customOpen && d.multiplier === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setCustomOpen(false);
                        set("multiplier", m);
                      }}
                      className={`min-w-[3.5rem] flex-1 rounded-md border px-1 py-2 text-center text-xs font-medium transition ${
                        on
                          ? "border-[var(--ink)] bg-[var(--accent)] text-white"
                          : "border-[var(--line)] text-[var(--ink)] hover:border-black/25"
                      }`}
                    >
                      {m === 1 ? "Yok" : `+%${Math.round((m - 1) * 100)}`}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={customOpen}
                  onClick={() => {
                    setCustomOpen(true);
                    setCustom(customPct);
                  }}
                  className={`min-w-[3.5rem] flex-1 rounded-md border px-1 py-2 text-center text-xs font-medium transition ${
                    customOpen
                      ? "border-[var(--ink)] bg-[var(--accent)] text-white"
                      : "border-[var(--line)] text-[var(--ink)] hover:border-black/25"
                  }`}
                >
                  Özel
                </button>
              </div>
              {customOpen ? (
                <div className="mt-2">
                  <label htmlFor="tier-bonus" className="text-[0.8125rem] text-[var(--ink)]">
                    Kaç yüzde fazla kazansın?
                  </label>
                  <div className="relative mt-1.5 w-32">
                    <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-[0.8125rem] text-[var(--muted)]">
                      +%
                    </span>
                    <input
                      id="tier-bonus"
                      autoFocus
                      className={`${inputClassName()} h-9 pl-9 tabular-nums`}
                      inputMode="numeric"
                      value={customPct}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="1–100"
                      aria-invalid={touched.bonus && customProblem ? true : undefined}
                      onBlur={() => setTouched((p) => ({ ...p, bonus: true }))}
                    />
                  </div>
                  {touched.bonus && customProblem ? (
                    <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
                      {customProblem}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-1.5 text-[0.6875rem] leading-snug text-[var(--muted)]">
                {d.multiplier > 1
                  ? `Her alışverişte normalden ${bonusLabel(d.multiplier)} puan veya para iadesi kazanır. Örn. 100 puan yerine ${Math.floor(100 * d.multiplier)} puan.`
                  : "Yalnızca unvan verilir, ekstra kazanç yok."}{" "}
                Damga kartında geçerli değil. Kartınızın kendi seviye bonusu daha yüksekse o uygulanır.
              </p>
            </fieldset>

            {/* Önizleme */}
            <div className="rounded-lg bg-[var(--surface)] p-3">
              <p className="section-label">Önizleme</p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ring-1 ${medalClass(preview.index)}`}
                >
                  {preview.index + 1}
                </span>
                <p className="text-[0.8125rem] leading-snug text-[var(--ink)]">
                  <strong className="font-medium">{preview.name}</strong>
                  <span className="block text-[var(--muted)]">
                    Hedef: {describeGoal(parsed.minVisits, parsed.minSpendKurus)}
                    {bonusLabel(parsed.rateMultiplier) ? ` · ${bonusLabel(parsed.rateMultiplier)} kazanç` : ""}
                    {" · "}
                    {preview.total} seviyeden {preview.index + 1}.
                  </span>
                </p>
              </div>
            </div>

            {mixedWith ? (
              <p className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-2 text-xs leading-snug text-[var(--ink)]">
                Bu hedef «{mixedWith.name}» ile çapraz: biri daha çok ziyaret, diğeri daha çok
                harcama istiyor. Sırada harcama hedefi yüksek olan üstte durur. Karışıklık
                olmasın diye üst seviyeye iki hedefte de daha yüksek değer verin.
              </p>
            ) : null}

            {showProblem ? (
              <p id="tier-err" role="alert" className="text-[0.8125rem] text-[var(--danger)]">
                {showProblem.message}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-md border border-red-200 bg-[var(--danger-soft)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--danger)]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
            <button type="button" className={btnGhost()} onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className={`${btnPrimary()} h-9 px-3.5`} disabled={saving}>
              {saving ? "Kaydediliyor…" : tier ? "Değişiklikleri kaydet" : "Seviyeyi ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stepper({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)] text-base text-[var(--ink)] transition hover:bg-[var(--surface)]"
    >
      {children}
    </button>
  );
}
