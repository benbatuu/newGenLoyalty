"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type SegmentRules = {
  lifecycleStage?: string[];
  minStamps?: number;
  maxStamps?: number;
  lastVisitDaysAgo?: number;
  branchId?: string;
  isStaff?: boolean;
  tags?: string[];
};

type Segment = {
  id: string;
  name: string;
  rules: SegmentRules;
  isActive: boolean;
  createdAt: string;
  /** Sunucu hesaplar — ayrı istek yok */
  count: number;
};

type Choice = {
  id: string;
  title: string;
  description: string;
  rules: SegmentRules;
  suggestedName: string;
};

/** Hazır seçenekler — teknik kural bilmeden seçilir */
const CHOICES: Choice[] = [
  {
    id: "lapsed",
    title: "Uzun süredir gelmeyenler",
    description: "Bir süredir damga almamış müşteriler. Geri çağırmak için.",
    rules: { lastVisitDaysAgo: 30 },
    suggestedName: "30 gündür gelmeyenler",
  },
  {
    id: "loyal",
    title: "Sadık müşteriler",
    description: "Çok damgası olan, düzenli gelen müşteriler.",
    rules: { minStamps: 5 },
    suggestedName: "Sadık müşteriler",
  },
  {
    id: "started",
    title: "Yeni başlayanlar",
    description: "Henüz 1-4 damgası olanlar. Alışkanlık kazandırmak için.",
    rules: { minStamps: 1, maxStamps: 4 },
    suggestedName: "Yeni başlayanlar",
  },
  {
    id: "active",
    title: "Aktif müşteriler",
    description: "Sistemde aktif olarak işaretlenmiş müşteriler.",
    rules: { lifecycleStage: ["active"] },
    suggestedName: "Aktif müşteriler",
  },
];

/** Kuralı tek cümleyle anlat */
function describe(rules: SegmentRules): string {
  const parts: string[] = [];
  if (rules.lastVisitDaysAgo != null) {
    parts.push(`${rules.lastVisitDaysAgo} gündür gelmeyen`);
  }
  if (rules.minStamps != null && rules.maxStamps != null) {
    parts.push(`${rules.minStamps}-${rules.maxStamps} damgalı`);
  } else if (rules.minStamps != null) {
    parts.push(`${rules.minStamps} ve üstü damgalı`);
  } else if (rules.maxStamps != null) {
    parts.push(`en fazla ${rules.maxStamps} damgalı`);
  }
  if (rules.lifecycleStage?.length) parts.push("aktif durumdaki");
  if (rules.tags?.length) parts.push(`«${rules.tags.join(", ")}» etiketli`);
  if (rules.isStaff) parts.push("personel");
  return parts.length ? `${parts.join(", ")} müşteriler` : "Tüm müşteriler";
}

export default function SegmentsPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <SegmentsContent />
    </RequireAuth>
  );
}

function SegmentsContent() {
  const { data, error: loadError, loading, refreshing, reload } = useApiQuery<Segment[]>(
    "crm:segments:overview",
    "/crm/segments/overview",
  );
  const segments = useMemo(() => data ?? [], [data]);
  const firstLoad = loading && !data;

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 4000);
    return () => clearTimeout(t);
  }, [ok]);

  const stats = useMemo(() => {
    const active = segments.filter((s) => s.isActive).length;
    const biggest = segments.reduce<Segment | null>(
      (best, s) => (!best || s.count > best.count ? s : best),
      null,
    );
    return { active, biggest };
  }, [segments]);

  async function toggleActive(s: Segment) {
    if (busyId) return;
    setBusyId(s.id);
    setError(null);
    try {
      await api(`/crm/segments/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      setOk(s.isActive ? `«${s.name}» durduruldu` : `«${s.name}» açıldı`);
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Değiştirilemedi. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(s: Segment) {
    if (!window.confirm(`«${s.name}» grubu silinsin mi? Müşteriler silinmez, yalnızca grup kaldırılır.`)) {
      return;
    }
    setBusyId(s.id);
    setError(null);
    try {
      await api(`/crm/segments/${s.id}`, { method: "DELETE" });
      setOk(`«${s.name}» silindi`);
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Müşteriler"
        title="Müşteri grupları"
        subtitle="Benzer müşterileri tek grupta toplayın. Kampanyalarda hedef olarak seçin."
        help="Bir grup, seçtiğiniz kurala uyan müşterileri kendiliğinden bulur. Sayılar her açılışta güncellenir."
        actions={
          <button
            type="button"
            className={btnGhost()}
            disabled={refreshing}
            onClick={() => void reload(true)}
          >
            {refreshing ? "Yenileniyor…" : "Yenile"}
          </button>
        }
      />

      <div aria-live="polite">
        <ErrorBanner message={loadError || error} />
        <SuccessBanner message={ok} />
      </div>

      {/* Özet */}
      <section aria-label="Özet" className="grid grid-cols-3 gap-5">
        {firstLoad ? (
          [0, 1, 2].map((i) => <div key={i} className="attio-surface h-[72px] animate-pulse" />)
        ) : (
          <>
            <Tile label="Toplam grup" value={String(segments.length)} />
            <Tile label="Açık grup" value={String(stats.active)} />
            <Tile
              label="En büyük"
              value={stats.biggest ? stats.biggest.count.toLocaleString("tr-TR") : "—"}
              hint={stats.biggest?.name}
            />
          </>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* Gruplar */}
        <section aria-label="Gruplarınız" className="min-w-0 lg:col-span-2">
          {firstLoad ? (
            <Panel>
              <ListSkeleton rows={3} />
            </Panel>
          ) : segments.length === 0 ? (
            <Panel>
              <EmptyState
                title="Henüz grup yok"
                description="Sağdaki hazır seçeneklerden birini seçin, grup bir dakikada hazır olsun."
              />
            </Panel>
          ) : (
            <ul className={`grid gap-3 md:grid-cols-2 ${refreshing ? "opacity-60" : ""}`}>
              {segments.map((s) => (
                <li
                  key={s.id}
                  className={`attio-surface flex flex-col p-4 ${s.isActive ? "" : "opacity-75"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">{s.name}</p>
                      <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
                        {describe(s.rules as SegmentRules)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        s.isActive
                          ? "border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      {s.isActive ? "Açık" : "Kapalı"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl tabular-nums tracking-tight text-[var(--ink)]">
                        {s.count.toLocaleString("tr-TR")}
                      </p>
                      <p className="text-xs text-[var(--muted)]">müşteri</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        on={s.isActive}
                        busy={busyId === s.id}
                        name={s.name}
                        onClick={() => void toggleActive(s)}
                      />
                      <button
                        type="button"
                        onClick={() => void remove(s)}
                        disabled={busyId === s.id}
                        aria-label={`${s.name} grubunu sil`}
                        title="Sil"
                        className="grid h-8 w-8 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Yeni grup */}
        <div className="lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
          <NewSegment
            existingNames={segments.map((s) => s.name)}
            onCreated={(name) => {
              setOk(`«${name}» grubu oluşturuldu`);
              setError(null);
              void reload(true);
            }}
            onError={setError}
          />
        </div>
      </div>
    </div>
  );
}

function NewSegment({
  existingNames,
  onCreated,
  onError,
}: {
  existingNames: string[];
  onCreated: (name: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const choice = CHOICES.find((c) => c.id === choiceId) ?? null;
  const rules: SegmentRules | null = choice
    ? choice.id === "lapsed"
      ? { lastVisitDaysAgo: days }
      : choice.rules
    : null;

  // Ad, kullanıcı elle değiştirmediyse seçime göre dolar
  useEffect(() => {
    if (nameTouched || !choice) return;
    setName(choice.id === "lapsed" ? `${days} gündür gelmeyenler` : choice.suggestedName);
  }, [choice, days, nameTouched]);

  // Canlı önizleme: seçim değişince tek istek (debounce)
  const rulesKey = rules ? JSON.stringify(rules) : "";
  useEffect(() => {
    if (!rules) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await api<{ count: number }>("/crm/segments/preview", {
          method: "POST",
          body: JSON.stringify(rules),
        });
        if (!cancelled) setPreview(res.count);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // rulesKey değişince yeniden say
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesKey]);

  const duplicate = existingNames.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());
  const canSave = !!rules && name.trim().length > 0 && !duplicate && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave || !rules) return;
    setSaving(true);
    onError(null);
    try {
      await api("/crm/segments", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), rules }),
      });
      const created = name.trim();
      setChoiceId(null);
      setName("");
      setNameTouched(false);
      onCreated(created);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Grup eklenemedi. Tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">Yeni grup</h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">Bir seçenek seçin, adını verin.</p>

      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[0.8125rem] font-medium text-[var(--ink)]">Kimler olsun?</legend>
          {CHOICES.map((c) => {
            const active = choiceId === c.id;
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--surface)]"
                }`}
              >
                <input
                  type="radio"
                  name="segment-choice"
                  className="mt-1 accent-[var(--accent)]"
                  checked={active}
                  onChange={() => {
                    setChoiceId(c.id);
                    setNameTouched(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-medium text-[var(--ink)]">{c.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-[var(--muted)]">{c.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {choiceId === "lapsed" ? (
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">Kaç gündür gelmiyor?</span>
            <div className="flex flex-wrap gap-1.5">
              {[30, 60, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={days === n}
                  onClick={() => setDays(n)}
                  className={`h-8 rounded-md border px-3 text-[0.8125rem] font-medium transition ${
                    days === n
                      ? "border-[var(--ink)] bg-[var(--accent)] text-white"
                      : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {n} gün
                </button>
              ))}
            </div>
          </label>
        ) : null}

        {rules ? (
          <div className="rounded-lg bg-[var(--surface)] px-3 py-2.5 text-[0.8125rem]">
            <span className="text-[var(--muted)]">Bu kurala uyan: </span>
            <strong className="font-medium text-[var(--ink)] tabular-nums">
              {previewing && preview == null ? "sayılıyor…" : preview == null ? "—" : `${preview.toLocaleString("tr-TR")} müşteri`}
            </strong>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">Grup adı</span>
          <input
            className={inputClassName()}
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            placeholder="Örn. Hafta sonu müşterileri"
            aria-invalid={duplicate}
          />
          {duplicate ? (
            <span className="mt-1 block text-[0.6875rem] text-[var(--danger)]">Bu adda bir grup zaten var.</span>
          ) : null}
        </label>

        <button type="submit" className={`${btnPrimary()} h-9 w-full`} disabled={!canSave}>
          {saving ? "Kaydediliyor…" : "Grubu oluştur"}
        </button>
        {!choice ? (
          <p className="text-center text-[0.6875rem] text-[var(--muted)]">Önce yukarıdan bir seçenek seçin.</p>
        ) : null}
      </form>
    </Panel>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="attio-surface p-3 sm:p-4">
      <p className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">{label}</p>
      <p className="mt-1 font-display text-xl tabular-nums tracking-tight text-[var(--ink)] sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function Switch({
  on,
  busy,
  name,
  onClick,
}: {
  on: boolean;
  busy: boolean;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${name}: ${on ? "açık" : "kapalı"}`}
      disabled={busy}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-xs font-medium text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--panel)] shadow transition-transform motion-reduce:transition-none ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
