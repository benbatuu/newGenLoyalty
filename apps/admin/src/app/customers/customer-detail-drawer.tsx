"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Field,
  SoftBox,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { displayPhone } from "../../lib/pii-display";

type Props = {
  customerId: string;
  /** Listedeki maskeli telefon (ör. 5** *** ** 20) */
  phone?: string | null;
  onClose: () => void;
};

type Timeline = {
  customer: {
    id: string;
    displayName: string | null;
    phoneLast4: string | null;
    stampCount: number;
    rewardReady: boolean;
    createdAt: string;
  };
  summary: {
    visitDays: number;
    redeems: number;
    totalEvents: number;
    firstAt: string | null;
    lastAt: string | null;
  };
  events: {
    id: string;
    type: string;
    amount: number;
    source: string | null;
    note: string | null;
    createdAt: string;
    programName: string | null;
    programType: string | null;
    branchName: string | null;
    byName: string | null;
  }[];
};

/** Hareket türleri → Türkçe etiket ve yön (+ kazanım, − kullanım, • nötr) */
const EVENT_META: Record<string, { label: string; dir: "in" | "out" | "neutral" }> = {
  STAMP: { label: "Damga verildi", dir: "in" },
  REDEEM: { label: "Ödül kullanıldı", dir: "out" },
  ADJUST: { label: "Düzeltme", dir: "neutral" },
  POINT_EARN: { label: "Puan kazandı", dir: "in" },
  POINT_REDEEM: { label: "Puan harcadı", dir: "out" },
  CASHBACK_EARN: { label: "Cashback kazandı", dir: "in" },
  CASHBACK_REDEEM: { label: "Cashback kullandı", dir: "out" },
  DISCOUNT_USE: { label: "İndirim kullandı", dir: "out" },
  EVENT_CHECKIN: { label: "Etkinliğe katıldı", dir: "in" },
  MEMBERSHIP_USE: { label: "Üyelik kullanıldı", dir: "out" },
  STAFF_REDEEM: { label: "Personel kullanımı", dir: "neutral" },
  REFERRAL: { label: "Davet ödülü", dir: "in" },
};

const DIR_CLASS: Record<"in" | "out" | "neutral", string> = {
  in: "bg-[var(--accent)]",
  out: "bg-[var(--ink)]",
  neutral: "bg-[var(--muted)]",
};

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[0.6875rem] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-lg tabular-nums text-[var(--ink)]">{value}</p>
    </div>
  );
}

export function CustomerDetailDrawer({ customerId, phone, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [vip, setVip] = useState<{ tierName?: string } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<{ id: string; body: string; createdAt: string }[]>([]);
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [smsOptOut, setSmsOptOut] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tl, vipRes, tagsRes, notesRes, smsRes, hub] = await Promise.all([
          api<Timeline>(`/stamps/customers/${customerId}/timeline`),
          api<{ vipTier?: { name: string } | null }>(`/vip/customers/${customerId}`).catch(() => ({ vipTier: null })),
          api<string[]>(`/crm/customers/${customerId}/tags`).catch(() => []),
          api<{ id: string; body: string; createdAt: string }[]>(`/crm/customers/${customerId}/notes`).catch(() => []),
          api<{ smsOptOut: boolean }>(`/crm/customers/${customerId}/sms-opt-out`).catch(() => ({ smsOptOut: false })),
          api<{ programs: { id: string; type: string }[] }>("/programs").catch(() => ({ programs: [] })),
        ]);
        const pointProgram = hub.programs.find((p) => p.type === "POINT_CARD");
        let balance: number | null = null;
        if (pointProgram) {
          try {
            const ps = await api<{ balance: number }>(`/programs/${pointProgram.id}/points/customers/${customerId}`);
            balance = ps.balance;
          } catch {
            balance = null;
          }
        }
        if (!cancelled) {
          setTimeline(tl);
          setVip(vipRes.vipTier ? { tierName: vipRes.vipTier.name } : null);
          setTags(tagsRes);
          setNotes(notesRes);
          setPointBalance(balance);
          setSmsOptOut(smsRes.smsOptOut);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function addTag(e: FormEvent) {
    e.preventDefault();
    const tag = newTag.trim();
    if (!tag) return;
    setBusy(true);
    try {
      await api(`/crm/customers/${customerId}/tags`, { method: "POST", body: JSON.stringify({ tag }) });
      setTags((prev) => [...prev, tag]);
      setNewTag("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Etiket eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    const body = newNote.trim();
    if (!body) return;
    setBusy(true);
    try {
      const note = await api<{ id: string; body: string; createdAt: string }>(`/crm/customers/${customerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Not eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSmsOptOut() {
    setBusy(true);
    try {
      const next = !smsOptOut;
      await api(`/crm/customers/${customerId}/sms-opt-out`, { method: "PATCH", body: JSON.stringify({ optOut: next }) });
      setSmsOptOut(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "SMS tercihi kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  const c = timeline?.customer;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]">
      <button type="button" className="flex-1" aria-label="Kapat" onClick={onClose} />
      <aside className="side-drawer-panel flex h-full w-full max-w-[520px] flex-col border-l border-[var(--line)] bg-[var(--background)] shadow-[-24px_0_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Müşteri profili</p>
            <p className="mt-0.5 truncate text-[1.0625rem] font-semibold text-[var(--ink)]">
              {c ? (c.displayName?.trim() || "İsimsiz müşteri") : "Yükleniyor…"}
            </p>
            {phone ? <p className="font-mono text-[0.75rem] text-[var(--muted)]">{displayPhone(phone)}</p> : null}
          </div>
          <button type="button" className={btnGhost()} onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {loading ? <p className="text-sm text-[var(--muted)]">Yükleniyor…</p> : null}
          {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}

          {!loading && timeline ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Damga" value={`${timeline.customer.stampCount}`} />
                <Stat label="Ödül" value={timeline.customer.rewardReady ? "Hazır" : "Bekliyor"} />
                <Stat label="Ziyaret günü" value={timeline.summary.visitDays} />
                <Stat label="Kullanılan ödül" value={timeline.summary.redeems} />
                <Stat label="İlk işlem" value={fmtDate(timeline.summary.firstAt)} />
                <Stat label="Son işlem" value={fmtDate(timeline.summary.lastAt)} />
              </div>

              <SoftBox className="space-y-2 text-sm">
                {vip?.tierName ? (
                  <p>
                    VIP: <Badge tone="danger">{vip.tierName}</Badge>
                  </p>
                ) : (
                  <p className="text-[var(--muted)]">VIP seviyesi yok</p>
                )}
                {pointBalance != null ? (
                  <p>
                    Puan bakiyesi: <span className="font-semibold tabular-nums">{pointBalance.toLocaleString("tr-TR")}</span>
                  </p>
                ) : null}
                <p className="text-[0.75rem] text-[var(--muted)]">
                  Kayıt tarihi: {fmtDate(timeline.customer.createdAt)}
                </p>
              </SoftBox>

              <SoftBox className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">Ticari SMS</p>
                  <p className="text-xs text-[var(--muted)]">Kapalıysa kampanya ve davet SMS’i gönderilmez (İYS uyumu).</p>
                </div>
                <button type="button" className={smsOptOut ? btnPrimary() : btnGhost()} disabled={busy} onClick={() => void toggleSmsOptOut()}>
                  {smsOptOut ? "Kapalı" : "Açık"}
                </button>
              </SoftBox>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">Hareketler · {timeline.summary.totalEvents}</p>
                {timeline.events.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">Henüz hareket yok.</p>
                ) : (
                  <ol className="relative space-y-3 border-l border-[var(--line)] pl-4">
                    {timeline.events.map((ev) => {
                      const meta = EVENT_META[ev.type] ?? { label: ev.type, dir: "neutral" as const };
                      return (
                        <li key={ev.id} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--background)] ${DIR_CLASS[meta.dir]}`}
                            aria-hidden="true"
                          />
                          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[0.8125rem] font-medium text-[var(--ink)]">{meta.label}</p>
                              {ev.amount !== 1 ? (
                                <span className="shrink-0 font-mono text-[0.75rem] tabular-nums text-[var(--muted)]">
                                  {meta.dir === "out" ? "−" : "+"}
                                  {ev.amount}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[0.6875rem] text-[var(--muted)]">{fmtDate(ev.createdAt)}</p>
                            <p className="text-[0.6875rem] text-[var(--muted)]">
                              Kart: <span className="text-[var(--ink)]">{ev.programName ?? "—"}</span>
                              {" · "}Veren: <span className="text-[var(--ink)]">{ev.byName ?? "Sistem"}</span>
                            </p>
                            {ev.note ? <p className="mt-1 text-[0.75rem] text-[var(--ink)]/80">{ev.note}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">Etiketler</p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {tags.length === 0 ? (
                    <span className="text-xs text-[var(--muted)]">—</span>
                  ) : (
                    tags.map((t) => (
                      <Badge key={t} tone="neutral">
                        {t}
                      </Badge>
                    ))
                  )}
                </div>
                <form onSubmit={(e) => void addTag(e)} className="flex gap-2">
                  <input className={inputClassName()} value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Yeni etiket" />
                  <button type="submit" className={btnGhost()} disabled={busy}>
                    Ekle
                  </button>
                </form>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">Notlar</p>
                <ul className="mb-3 space-y-2">
                  {notes.length === 0 ? (
                    <li className="text-xs text-[var(--muted)]">Not yok</li>
                  ) : (
                    notes.map((n) => (
                      <li key={n.id} className="rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-2 text-sm">
                        {n.body}
                        <p className="mt-1 text-[10px] text-[var(--muted)]">{fmtDate(n.createdAt)}</p>
                      </li>
                    ))
                  )}
                </ul>
                <form onSubmit={(e) => void addNote(e)} className="space-y-2">
                  <Field label="Yeni not">
                    <textarea className={inputClassName()} rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                  </Field>
                  <button type="submit" className={btnPrimary()} disabled={busy}>
                    Not kaydet
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
