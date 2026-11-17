"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { btnGhost, btnPrimary, inputClassName } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import {
  BROADCAST_MAX,
  DAY_SHORT,
  TYPE_META,
  WEEK_ORDER,
  WINBACK_MAX,
  defaultLabel,
  draftFromCampaign,
  draftToConfig,
  summarize,
  validateDraft,
  type Campaign,
  type CampaignDraft,
  type Segment,
} from "./campaign-model";
import { TypeIcon } from "./campaign-icons";

export type DrawerState =
  | { mode: "create"; draft: CampaignDraft }
  | { mode: "edit"; campaign: Campaign };

type Props = {
  state: DrawerState;
  segments: Segment[] | null;
  /** Başka bir açık ekstra damga kampanyası var mı (bu kampanya hariç) */
  otherActiveMultiplier: boolean;
  onClose: () => void;
  onSaved: (row: Campaign, message: string) => void;
};

const INACTIVE_PRESETS = [14, 30, 60, 90];

export function CampaignDrawer({
  state,
  segments,
  otherActiveMultiplier,
  onClose,
  onSaved,
}: Props) {
  const editing = state.mode === "edit" ? state.campaign : null;
  const [d, setD] = useState<CampaignDraft>(() =>
    state.mode === "edit" ? draftFromCampaign(state.campaign) : state.draft,
  );
  const [saving, setSaving] = useState<"save" | "start" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = "campaign-drawer-title";

  const set = <K extends keyof CampaignDraft>(k: K, v: CampaignDraft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setError(null);
    setConfirmSend(false);
  };

  // Escape ile kapat, açılışta odakla, kapanışta odağı geri ver, arka plan kaymasın
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input, textarea, select, button[data-autofocus]",
    );
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]',
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

  const segmentName = useMemo(
    () => segments?.find((s) => s.id === d.segmentId)?.name ?? null,
    [segments, d.segmentId],
  );
  const problem = validateDraft(d);
  const meta = TYPE_META[d.type];
  const canStart = !editing || editing.status === "DRAFT" || editing.status === "PAUSED";
  const isBroadcastNow = d.type === "SCHEDULED_BROADCAST" && d.sendNow;

  async function submit(start: boolean) {
    setTouched(true);
    if (problem) {
      setError(problem);
      return;
    }
    // Hemen gönderim: bir kez daha onay iste
    const willSendNow =
      isBroadcastNow && (start || editing?.status === "ACTIVE");
    if (willSendNow && !confirmSend) {
      setConfirmSend(true);
      return;
    }
    setSaving(start ? "start" : "save");
    setError(null);
    // Kaydet + başlat tek istekte (activate: true)
    const body = {
      name: d.name.trim().slice(0, 120),
      config: draftToConfig(d, editing?.config),
      ...(start ? { activate: true } : {}),
    };
    try {
      const row = editing
        ? await api<Campaign>(`/campaigns/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await api<Campaign>("/campaigns", {
            method: "POST",
            body: JSON.stringify({ type: d.type, ...body }),
          });
      onSaved(
        row,
        !start
          ? editing
            ? "Değişiklikler kaydedildi."
            : "Taslak kaydedildi."
          : d.type === "SCHEDULED_BROADCAST"
            ? d.sendNow
              ? "Duyuru birkaç dakika içinde gönderilecek."
              : "Duyuru zamanlandı."
            : "Kampanya başladı.",
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kaydedilemedi. Tekrar deneyin.");
      setSaving(null);
    }
  }

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
        className="campaign-slide relative flex h-full w-full max-w-[30rem] flex-col bg-[var(--panel)] shadow-xl"
      >
        {/* Başlık */}
        <div className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4">
          <span
            className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tone}`}
          >
            <TypeIcon type={d.type} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-base tracking-tight text-[var(--ink)]">
              {editing ? "Kampanyayı düzenle" : meta.title}
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
              {meta.description}
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

        {/* Form */}
        <form
          className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
        >
          <Group label="Kampanya adı" hint="Sadece siz görürsünüz.">
            <input
              className={inputClassName()}
              value={d.name}
              maxLength={120}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={touched && !d.name.trim()}
            />
          </Group>

          {d.type === "MULTIPLIER" ? (
            <MultiplierFields d={d} set={set} />
          ) : null}
          {d.type === "WIN_BACK" ? <WinBackFields d={d} set={set} /> : null}
          {d.type === "SCHEDULED_BROADCAST" ? (
            <BroadcastFields d={d} set={set} />
          ) : null}

          {d.type !== "SCHEDULED_BROADCAST" ? (
            segments && segments.length === 0 && !d.segmentId ? (
              <div>
                <p className="mb-1.5 text-[0.8125rem] font-medium text-[var(--ink)]">Kimler için?</p>
                <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-[0.8125rem] text-[var(--muted)]">
                  Tüm müşteriler. Belirli bir grubu hedeflemek için{" "}
                  <Link href="/segments" className="font-medium text-[var(--ink)] underline">
                    müşteri grubu oluşturun
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <Group label="Kimler için?" hint="Müşteri grupları «Segmentler» sayfasında oluşturulur.">
                <select
                  className={inputClassName()}
                  value={d.segmentId}
                  onChange={(e) => set("segmentId", e.target.value)}
                  disabled={!segments}
                >
                  <option value="">Tüm müşteriler</option>
                  {(segments ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {!s.isActive ? " (kapalı grup)" : ""}
                    </option>
                  ))}
                  {/* Kayıtlı grup listede yoksa da seçili görünsün */}
                  {d.segmentId && segments && !segmentName ? (
                    <option value={d.segmentId}>Silinmiş grup</option>
                  ) : null}
                </select>
              </Group>
            )
          ) : null}

          {/* Canlı özet */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
            <p className="section-label mb-1">Müşteri ne yaşar?</p>
            <p className="text-[0.8125rem] leading-relaxed text-[var(--ink)]">
              {summarize(d, segmentName)}
            </p>
            {d.type === "MULTIPLIER" && otherActiveMultiplier ? (
              <p className="mt-2 text-xs leading-snug text-amber-700">
                Açık başka bir ekstra damga kampanyası var. Aynı anda geçerli
                olursa kasada yalnızca biri uygulanır.
              </p>
            ) : null}
          </div>
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>

        {/* Alt çubuk */}
        <div className="border-t border-[var(--line)] bg-[var(--panel)] px-5 py-3">
          {error ? (
            <p role="alert" className="mb-2 text-[0.8125rem] text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          {confirmSend ? (
            <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[0.8125rem] text-amber-800">
              Duyuru, kartı olan tüm müşterilere birkaç dakika içinde gider ve
              geri alınamaz. Onaylamak için tekrar basın.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className={btnGhost()} onClick={onClose}>
              Vazgeç
            </button>
            {canStart ? (
              <>
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={!!saving}
                  onClick={() => void submit(false)}
                >
                  {saving === "save"
                    ? "Kaydediliyor…"
                    : editing
                      ? "Kaydet"
                      : "Taslak olarak kaydet"}
                </button>
                <button
                  type="button"
                  className={btnPrimary()}
                  disabled={!!saving}
                  onClick={() => void submit(true)}
                >
                  {saving === "start"
                    ? "Başlatılıyor…"
                    : confirmSend
                      ? "Evet, şimdi gönder"
                      : isBroadcastNow
                        ? "Kaydet ve gönder"
                        : "Kaydet ve başlat"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={btnPrimary()}
                disabled={!!saving}
                onClick={() => void submit(false)}
              >
                {saving
                  ? "Kaydediliyor…"
                  : confirmSend
                    ? "Evet, şimdi gönder"
                    : "Değişiklikleri kaydet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type SetFn = <K extends keyof CampaignDraft>(k: K, v: CampaignDraft[K]) => void;

function Group({
  label,
  hint,
  children,
  as = "label",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  as?: "label" | "fieldset";
}) {
  const body = (
    <>
      {as === "fieldset" ? (
        <legend className="mb-1.5 text-[0.8125rem] font-medium text-[var(--ink)]">
          {label}
        </legend>
      ) : (
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--ink)]">
          {label}
        </span>
      )}
      {children}
      {hint ? (
        <span className="mt-1 block text-[0.6875rem] leading-snug text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </>
  );
  return as === "fieldset" ? (
    <fieldset className="min-w-0">{body}</fieldset>
  ) : (
    <label className="block">{body}</label>
  );
}

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`h-8 min-w-10 rounded-md border px-2.5 text-[0.8125rem] font-medium transition ${
        active
          ? "border-[var(--ink)] bg-[var(--accent)] text-white"
          : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--surface)]"
      }`}
    >
      {children}
    </button>
  );
}

function ChoiceCard({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition ${
        active
          ? "border-[var(--ink)] bg-[var(--panel)] ring-1 ring-[var(--ink)]"
          : "border-[var(--line)] bg-[var(--panel)] hover:bg-[var(--surface)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          active ? "border-[var(--ink)]" : "border-[var(--line-strong)]"
        }`}
      >
        {active ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--muted)]">
          {description}
        </span>
      </span>
    </button>
  );
}

function MultiplierFields({ d, set }: { d: CampaignDraft; set: SetFn }) {
  const everyDay = d.daysOfWeek.length === 0 || d.daysOfWeek.length === 7;
  function toggleDay(day: number) {
    const base = everyDay ? [] : d.daysOfWeek;
    const next = base.includes(day) ? base.filter((x) => x !== day) : [...base, day];
    set("daysOfWeek", next.length === 7 ? [] : next);
  }
  return (
    <>
      <Group as="fieldset" label="Kaç kat damga?">
        <div className="flex gap-2">
          {[2, 3, 4].map((m) => (
            <Chip key={m} active={d.multiplier === m} onClick={() => set("multiplier", m)}>
              {m}x
            </Chip>
          ))}
        </div>
        <span className="mt-1 block text-[0.6875rem] text-[var(--muted)]">
          Örn. 2x: bir kahveye 1 yerine 2 damga.
        </span>
      </Group>

      <Group as="fieldset" label="Hangi günler?">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={everyDay} onClick={() => set("daysOfWeek", [])}>
            Her gün
          </Chip>
          {WEEK_ORDER.map((day) => (
            <Chip
              key={day}
              active={!everyDay && d.daysOfWeek.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {DAY_SHORT[day]}
            </Chip>
          ))}
        </div>
      </Group>

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium text-[var(--ink)]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-black"
            checked={d.useHours}
            onChange={(e) => set("useHours", e.target.checked)}
          />
          Sadece belirli saatlerde
        </label>
        {d.useHours ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="time"
              aria-label="Başlangıç saati"
              className={`${inputClassName()} w-32`}
              value={d.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
            <span className="text-[var(--muted)]">–</span>
            <input
              type="time"
              aria-label="Bitiş saati"
              className={`${inputClassName()} w-32`}
              value={d.endTime}
              onChange={(e) => set("endTime", e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <Group
        label="Kasada görünen yazı"
        hint="Kasiyer ekranında ve damga anında bu yazı görünür."
      >
        <input
          className={inputClassName()}
          value={d.label}
          maxLength={40}
          placeholder={defaultLabel(d)}
          onChange={(e) => set("label", e.target.value)}
        />
      </Group>
    </>
  );
}

function WinBackFields({ d, set }: { d: CampaignDraft; set: SetFn }) {
  const custom = !INACTIVE_PRESETS.includes(d.inactiveDays);
  return (
    <>
      <Group as="fieldset" label="Kaç gündür gelmeyenler?">
        <div className="flex flex-wrap items-center gap-1.5">
          {INACTIVE_PRESETS.map((n) => (
            <Chip key={n} active={d.inactiveDays === n} onClick={() => set("inactiveDays", n)}>
              {n} gün
            </Chip>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            veya
            <input
              type="number"
              min={7}
              max={365}
              aria-label="Özel gün sayısı"
              className={`${inputClassName()} w-20 ${custom ? "border-[var(--ink)]" : ""}`}
              value={d.inactiveDays}
              onChange={(e) => set("inactiveDays", Number(e.target.value) || 0)}
            />
            gün
          </label>
        </div>
      </Group>

      <Group as="fieldset" label="Nasıl ulaşalım?">
        <div role="radiogroup" className="grid gap-2">
          <ChoiceCard
            active={d.channel === "OWNER_PUSH"}
            onClick={() => set("channel", "OWNER_PUSH")}
            title="Sadece bana haber ver"
            description="Gelmeyen müşteri sayısı her sabah size bildirim olarak gelir. Ücretsiz."
          />
          <ChoiceCard
            active={d.channel === "SMS"}
            onClick={() => set("channel", "SMS")}
            title="Müşterilere SMS gönder"
            description="Aşağıdaki mesaj müşterilere SMS olarak gider. SMS kredisi kullanır; SMS istemeyenlere gönderilmez."
          />
        </div>
      </Group>

      <Group
        label={d.channel === "SMS" ? "SMS mesajı" : "Not (isteğe bağlı)"}
        hint={`${d.message.length}/${WINBACK_MAX}${
          d.channel === "SMS" ? " · 160 karakteri geçen mesaj 2 SMS sayılır" : ""
        }`}
      >
        <textarea
          className={`${inputClassName()} h-auto min-h-[84px] py-2`}
          value={d.message}
          maxLength={WINBACK_MAX}
          onChange={(e) => set("message", e.target.value)}
        />
      </Group>
    </>
  );
}

function BroadcastFields({ d, set }: { d: CampaignDraft; set: SetFn }) {
  return (
    <>
      <Group label="Mesaj" hint={`${d.message.length}/${BROADCAST_MAX}`}>
        <textarea
          className={`${inputClassName()} h-auto min-h-[84px] py-2`}
          value={d.message}
          maxLength={BROADCAST_MAX}
          placeholder="Bu hafta sonu tüm tatlılarda %20 indirim!"
          onChange={(e) => set("message", e.target.value)}
        />
      </Group>

      {/* Telefon bildirimi önizlemesi */}
      <div aria-hidden="true" className="rounded-xl bg-neutral-100 p-3">
        <div className="rounded-lg bg-white/90 p-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Sadakat kartı · şimdi
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-[var(--ink)]">
            {d.message.trim() || "Mesajınız burada görünecek."}
          </p>
        </div>
      </div>

      <Group as="fieldset" label="Ne zaman gönderilsin?">
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            active={!d.sendNow}
            onClick={() => set("sendNow", false)}
            title="İleri bir tarihte"
            description="Seçtiğiniz saatte otomatik gider."
          />
          <ChoiceCard
            active={d.sendNow}
            onClick={() => set("sendNow", true)}
            title="Hemen"
            description="Başlatınca birkaç dakika içinde gider."
          />
        </div>
        {!d.sendNow ? (
          <input
            type="datetime-local"
            aria-label="Gönderim zamanı"
            className={`${inputClassName()} mt-2`}
            value={d.scheduledAt}
            onChange={(e) => set("scheduledAt", e.target.value)}
          />
        ) : null}
      </Group>
    </>
  );
}
