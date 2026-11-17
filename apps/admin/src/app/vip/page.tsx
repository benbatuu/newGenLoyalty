"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  ErrorBanner,
  ListSkeleton,
  PageHeader,
  Panel,
  RequireAuth,
  SuccessBanner,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";
import { TierDrawer } from "./tier-drawer";
import {
  STARTER_TIERS,
  bonusLabel,
  describeGoal,
  medalClass,
  sortTiers,
  type VipTier,
} from "./vip-model";

type DrawerState = { tier: VipTier | null } | null;

export default function VipPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <VipContent />
    </RequireAuth>
  );
}

function VipContent() {
  // Sayfadaki tek okuma isteği; yazma işlemleri listeyi yerinde günceller
  const { data, error: loadError, loading, setData } = useApiQuery<VipTier[]>(
    "vip:tiers",
    "/vip/tiers",
  );
  const tiers = useMemo(() => sortTiers(data ?? []), [data]);
  const members = tiers.reduce((n, t) => n + (t._count?.customers ?? 0), 0);

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 4000);
    return () => clearTimeout(t);
  }, [ok]);

  const upsert = useCallback(
    (row: VipTier) =>
      setData((prev) => {
        const list = prev ?? [];
        return list.some((t) => t.id === row.id)
          ? list.map((t) => (t.id === row.id ? row : t))
          : [...list, row];
      }),
    [setData],
  );

  const closeDrawer = useCallback(() => setDrawer(null), []);

  async function remove(t: VipTier) {
    setBusyId(t.id);
    setError(null);
    try {
      await api(`/vip/tiers/${t.id}`, { method: "DELETE" });
      setData((prev) => (prev ?? []).filter((x) => x.id !== t.id));
      setOk(`«${t.name}» silindi.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Silinemedi. Tekrar deneyin.");
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  async function addStarter() {
    setStarting(true);
    setError(null);
    const created: VipTier[] = [];
    try {
      for (const s of STARTER_TIERS) {
        const row = await api<VipTier>("/vip/tiers", {
          method: "POST",
          body: JSON.stringify(s),
        });
        created.push({ ...row, _count: row._count ?? { customers: 0 } });
      }
      setOk("Bronz, Gümüş ve Altın hazır. İsterseniz hedefleri düzenleyin.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Şablon eklenemedi. Tekrar deneyin.");
    } finally {
      if (created.length) setData((prev) => [...(prev ?? []), ...created]);
      setStarting(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Sadakat programı"
        title="Üyelik seviyeleri"
        subtitle="Sık gelen müşterilerinize Bronz, Gümüş, Altın gibi bir unvan verin. Hedefe ulaşan müşterinin seviyesi kendiliğinden yükselir."
        help="Seviye, müşterinin Wallet kartında ve müşteri listesinde görünür. İndirim kartınızda seviyeye özel indirim de tanımlayabilirsiniz."
      />

      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />

      <HowItWorks />

      <Panel padded={false}>
        <div className="flex flex-col gap-2 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-[0.95rem] tracking-tight text-[var(--ink)]">
              Seviyeleriniz
            </h2>
            {tiers.length ? (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {tiers.length} seviye · {members.toLocaleString("tr-TR")} müşteri bir seviyede
              </p>
            ) : null}
          </div>
          {tiers.length ? (
            <button
              type="button"
              className={`${btnPrimary()} self-start sm:self-auto`}
              onClick={() => setDrawer({ tier: null })}
            >
              <PlusIcon /> Seviye ekle
            </button>
          ) : null}
        </div>

        {loading && !data ? (
          <div className="p-4">
            <ListSkeleton rows={3} />
          </div>
        ) : tiers.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto flex w-max -space-x-2" aria-hidden="true">
              {STARTER_TIERS.map((s, i) => (
                <span
                  key={s.name}
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ring-2 ring-white ${medalClass(i)}`}
                >
                  {s.name[0]}
                </span>
              ))}
            </div>
            <p className="mt-3 font-medium text-[var(--ink)]">Henüz seviye yok</p>
            <p className="mx-auto mt-1 max-w-sm text-[0.8125rem] leading-snug text-[var(--muted)]">
              En kolay başlangıç: hazır üç seviye. Bronz 5, Gümüş 15, Altın 30 ziyarette; Gümüş %10, Altın %25 fazla kazanır.
              Sonra istediğiniz gibi değiştirin.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className={btnPrimary()}
                onClick={() => void addStarter()}
                disabled={starting}
              >
                {starting ? "Ekleniyor…" : "Hazır seviyeleri ekle"}
              </button>
              <button
                type="button"
                className={btnGhost()}
                onClick={() => setDrawer({ tier: null })}
                disabled={starting}
              >
                Kendim oluşturayım
              </button>
            </div>
          </div>
        ) : (
          <ol className="relative">
            {tiers.map((t, i) => (
              <TierRow
                key={t.id}
                tier={t}
                index={i}
                last={i === tiers.length - 1}
                busy={busyId === t.id}
                confirmingDelete={confirmDeleteId === t.id}
                onEdit={() => setDrawer({ tier: t })}
                onAskDelete={() => setConfirmDeleteId(t.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onDelete={() => void remove(t)}
              />
            ))}
          </ol>
        )}

        {tiers.length ? (
          <p className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs leading-snug text-[var(--muted)]">
            Yeni veya değişen hedefler, her müşteriye bir sonraki alışverişinde uygulanır.
          </p>
        ) : null}
      </Panel>

      {drawer ? (
        <TierDrawer
          key={drawer.tier?.id ?? "new"}
          tier={drawer.tier}
          tiers={tiers}
          onClose={closeDrawer}
          onSaved={(row, message) => {
            upsert(row);
            setDrawer(null);
            setError(null);
            setOk(message);
          }}
        />
      ) : null}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Hedef belirleyin", text: "Örn. 15 ziyarete ulaşan Gümüş olsun." },
    { title: "Müşteri alışveriş yapar", text: "Kasada her damga veya puan sayılır." },
    { title: "Seviye kendiliğinden yükselir", text: "Wallet kartında görünür, varsa ekstra puan başlar." },
  ];
  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-label="Nasıl çalışır">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className="flex gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-xs font-semibold tabular-nums text-[var(--ink)]">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-medium text-[var(--ink)]">{s.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TierRow({
  tier: t,
  index,
  last,
  busy,
  confirmingDelete,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  tier: VipTier;
  index: number;
  last: boolean;
  busy: boolean;
  confirmingDelete: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const count = t._count?.customers ?? 0;
  return (
    <li className="relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      {/* Basamaklar arası çizgi */}
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute left-[2.1rem] top-[3.25rem] bottom-[-0.75rem] w-px bg-[var(--line)]"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ring-1 ${medalClass(index)}`}
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-medium text-[var(--ink)]">{t.name}</p>
            {bonusLabel(t.rateMultiplier) ? (
              <Badge tone="danger">{bonusLabel(t.rateMultiplier)} kazanç</Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
            {describeGoal(t.minVisits, t.minSpendKurus)}
          </p>
        </div>
      </div>

      {confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2 pl-12 sm:justify-end sm:pl-0" role="group" aria-label="Silme onayı">
          <span className="text-[0.8125rem] text-[var(--ink)]">
            «{t.name}» silinsin mi?
            {count ? ` ${count} müşteri seviyesiz kalır.` : ""}
          </span>
          <button type="button" className={btnGhost()} onClick={onCancelDelete} disabled={busy}>
            Vazgeç
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md bg-[var(--danger)] px-2.5 text-[0.8125rem] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            onClick={onDelete}
            disabled={busy}
          >
            {busy ? "Siliniyor…" : "Seviyeyi sil"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pl-12 sm:pl-0">
          <span className="mr-2 inline-flex items-baseline gap-1 text-[0.8125rem] text-[var(--muted)]">
            <strong className="font-semibold tabular-nums text-[var(--ink)]">
              {count.toLocaleString("tr-TR")}
            </strong>
            müşteri
          </span>
          <button type="button" className={btnGhost()} onClick={onEdit}>
            Düzenle
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={`${t.name} seviyesini sil`}
            title="Sil"
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </li>
  );
}

const icon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  width: 15,
  height: 15,
};

function PlusIcon() {
  return (
    <svg {...icon}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg {...icon}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
