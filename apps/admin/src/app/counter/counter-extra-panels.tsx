"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";

export type CounterProgram = {
  id: string;
  type: string;
  name: string;
  isPrimary?: boolean;
  config?: Record<string, unknown>;
  tiers?: {
    id: string;
    threshold: number;
    rewardLabel: string;
    laneId: string | null;
  }[];
};

type PanelBase = {
  customerId: string;
  program: CounterProgram;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setOk: (msg: string | null) => void;
  onRefresh: () => Promise<void>;
  /**
   * Kasa toplu isteğinden gelen hazır durum. `undefined` → panel kendisi çeker;
   * `null` → durum alınamadı.
   */
  initialState?: unknown;
};

function parseTryToKurus(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatKurus(kurus: number) {
  return (kurus / 100).toFixed(2).replace(".", ",");
}

type DiscountState = {
  valid: boolean;
  invalidReason?: string | null;
  effective: { label: string; value: string; kind: string };
  applicableCategories: string[];
  limits: {
    remainingToday: number | null;
    remainingTotal: number | null;
  };
};

export function DiscountCounterPanel(props: PanelBase) {
  const { customerId, program, busy, setBusy, setError, setOk, onRefresh } =
    props;
  const [state, setState] = useState<DiscountState | null>(
    (props.initialState as DiscountState | null | undefined) ?? null,
  );
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [amountTry, setAmountTry] = useState("");

  useEffect(() => {
    if (props.initialState !== undefined) {
      setState((props.initialState as DiscountState | null) ?? null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const s = await api<DiscountState>(
          `/programs/${program.id}/discount/customers/${customerId}`,
        );
        if (!cancelled) setState(s);
      } catch {
        if (!cancelled) setState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, program.id, props.initialState]);

  async function verify() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const result = await api<{ effective: DiscountState["effective"] }>(
        `/programs/${program.id}/discount/customers/${customerId}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ categoryId }),
        },
      );
      setOk(`İndirim geçerli: ${result.effective.label} — ${result.effective.value}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Doğrulama başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    const amountKurus = amountTry.trim()
      ? parseTryToKurus(amountTry)
      : undefined;
    if (amountTry.trim() && amountKurus == null) {
      setError("Geçerli bir tutar girin");
      return;
    }
    if (!window.confirm("İndirimi uygulansın mı?")) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const result = await api<{ effective: DiscountState["effective"] }>(
        `/programs/${program.id}/discount/customers/${customerId}/apply`,
        {
          method: "POST",
          body: JSON.stringify({
            categoryId,
            ...(amountKurus != null ? { amountKurus } : {}),
          }),
        },
      );
      setAmountTry("");
      setOk(`İndirim uygulandı: ${result.effective.label}`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İndirim uygulanamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={program.name}
        description="İndirim doğrula ve kasada uygula."
      />
      {state ? (
        <div className="mb-3 space-y-1 text-sm">
          {state.valid ? (
            <Badge tone="success">
              {state.effective.label} — {state.effective.value}
            </Badge>
          ) : (
            <Badge tone="warning">{state.invalidReason ?? "Geçersiz"}</Badge>
          )}
          {state.limits.remainingToday != null ? (
            <p className="text-xs text-[var(--muted)]">
              Bugün kalan: {state.limits.remainingToday}
            </p>
          ) : null}
        </div>
      ) : null}
      {state?.applicableCategories && state.applicableCategories.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={categoryId === undefined ? btnPrimary() : btnGhost()}
            onClick={() => setCategoryId(undefined)}
          >
            Tümü
          </button>
          {state.applicableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={categoryId === cat ? btnPrimary() : btnGhost()}
              onClick={() => setCategoryId(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        <Field label="Sepet tutarı (TL, opsiyonel)">
          <input
            className={inputClassName()}
            value={amountTry}
            onChange={(e) => setAmountTry(e.target.value)}
            placeholder="120"
            inputMode="decimal"
          />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={`${btnGhost()} flex-1`}
            disabled={busy}
            onClick={() => void verify()}
          >
            Doğrula
          </button>
          <button
            type="button"
            className={`${btnPrimary()} flex-1`}
            disabled={busy || state?.valid === false}
            onClick={() => void apply()}
          >
            Uygula
          </button>
        </div>
      </div>
    </Panel>
  );
}

type EventState = {
  eventName: string;
  entriesUsed: number;
  entriesRemaining: number;
  canCheckIn: boolean;
  validUntil: string;
  venue?: string | null;
};

export function EventCounterPanel(props: PanelBase) {
  const { customerId, program, busy, setBusy, setError, setOk, onRefresh } =
    props;
  const [state, setState] = useState<EventState | null>(
    (props.initialState as EventState | null | undefined) ?? null,
  );

  useEffect(() => {
    if (props.initialState !== undefined) {
      setState((props.initialState as EventState | null) ?? null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const s = await api<EventState>(
          `/programs/${program.id}/event/customers/${customerId}`,
        );
        if (!cancelled) setState(s);
      } catch {
        if (!cancelled) setState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, program.id, props.initialState]);

  async function checkIn() {
    if (!window.confirm("Etkinlik girişi kaydedilsin mi?")) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const result = await api<{ entriesRemaining: number }>(
        `/programs/${program.id}/event/customers/${customerId}/check-in`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setOk(`Giriş kaydedildi · kalan ${result.entriesRemaining}`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={program.name}
        description={state?.eventName ?? "Etkinlik girişi"}
      />
      {state ? (
        <SoftBox className="mb-3 text-sm">
          <p>
            Giriş: {state.entriesUsed}/{state.entriesUsed + state.entriesRemaining}
          </p>
          {state.venue ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{state.venue}</p>
          ) : null}
        </SoftBox>
      ) : null}
      <button
        type="button"
        className={btnPrimary()}
        disabled={busy || !state?.canCheckIn}
        onClick={() => void checkIn()}
      >
        Giriş kaydet
      </button>
    </Panel>
  );
}

type MembershipState = {
  status: string;
  plan: { id: string; label: string; benefits: { label: string }[] } | null;
  plans: { id: string; label: string; benefits: { label: string }[] }[];
  benefitQuota: Record<string, number>;
};

export function MembershipCounterPanel(props: PanelBase) {
  const { customerId, program, busy, setBusy, setError, setOk, onRefresh } =
    props;
  const [state, setState] = useState<MembershipState | null>(null);
  const [planId, setPlanId] = useState<string>("");

  const reload = async () => {
    const s = await api<MembershipState>(
      `/programs/${program.id}/membership/customers/${customerId}`,
    );
    setState(s);
    if (!planId && s.plans[0]) setPlanId(s.plans[0].id);
  };

  useEffect(() => {
    if (props.initialState !== undefined) {
      const s = (props.initialState as MembershipState | null) ?? null;
      setState(s);
      if (s && !planId && s.plans[0]) setPlanId(s.plans[0].id);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch {
        if (!cancelled) setState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, program.id, props.initialState]);

  async function activate() {
    if (!planId) return;
    if (!window.confirm("Üyelik aktifleştirilsin mi?")) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      await api(
        `/programs/${program.id}/membership/customers/${customerId}/activate`,
        { method: "POST", body: JSON.stringify({ planId }) },
      );
      setOk("Üyelik aktif");
      await reload();
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktivasyon başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function applyBenefit(label: string) {
    if (!window.confirm(`${label} kullanılsın mı?`)) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      await api(
        `/programs/${program.id}/membership/customers/${customerId}/use-benefit`,
        {
          method: "POST",
          body: JSON.stringify({ benefitLabel: label }),
        },
      );
      setOk(`Hak kullanıldı: ${label}`);
      await reload();
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Hak kullanılamadı");
    } finally {
      setBusy(false);
    }
  }

  const benefits = state?.plan?.benefits ?? [];

  return (
    <Panel>
      <PanelHeader title={program.name} description="Üyelik hakları" />
      {state ? (
        <p className="mb-3 text-sm text-[var(--muted)]">
          Durum:{" "}
          <span className="font-medium text-[var(--ink)]">
            {state.status === "active"
              ? state.plan?.label ?? "Aktif"
              : "Pasif"}
          </span>
        </p>
      ) : null}
      {state?.status !== "active" ? (
        <div className="mb-3 space-y-2">
          <Field label="Plan">
            <select
              className={inputClassName()}
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {state?.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            className={btnPrimary()}
            disabled={busy || !planId}
            onClick={() => void activate()}
          >
            Üyeliği başlat
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {benefits.map((b) => {
            const left = state?.benefitQuota[b.label];
            return (
              <button
                key={b.label}
                type="button"
                className={btnGhost()}
                disabled={busy || (left != null && left <= 0)}
                onClick={() => void applyBenefit(b.label)}
              >
                {b.label}
                {left != null ? ` (${left} kaldı)` : ""}
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

type StaffState = {
  usage: {
    monthlySpendKurus: number;
    monthlyBudgetKurus: number;
    dailyRedeemCount: number;
    dailyLimit: number;
  };
  config: { requireManagerPinAbove?: number };
};

export function StaffCounterPanel(props: PanelBase) {
  const { customerId, program, busy, setBusy, setError, setOk, onRefresh } =
    props;
  const [state, setState] = useState<StaffState | null>(
    (props.initialState as StaffState | null | undefined) ?? null,
  );
  const [amountTry, setAmountTry] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (props.initialState !== undefined) {
      setState((props.initialState as StaffState | null) ?? null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const s = await api<StaffState>(
          `/programs/${program.id}/staff/customers/${customerId}`,
        );
        if (!cancelled) setState(s);
      } catch {
        if (!cancelled) setState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, program.id, props.initialState]);

  async function enroll() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      await api(
        `/programs/${program.id}/staff/customers/${customerId}/enroll`,
        {
          method: "POST",
          body: JSON.stringify(
            inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {},
          ),
        },
      );
      setOk("Personel kartına kaydedildi");
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    const amountKurus = parseTryToKurus(amountTry);
    if (amountKurus == null || amountKurus <= 0) {
      setError("Geçerli tutar girin");
      return;
    }
    if (!window.confirm(`₺${amountTry} personel indirimi uygulansın mı?`)) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      await api(
        `/programs/${program.id}/staff/customers/${customerId}/redeem`,
        {
          method: "POST",
          body: JSON.stringify({
            amountKurus,
            ...(managerPin.trim() ? { managerPin: managerPin.trim() } : {}),
          }),
        },
      );
      setAmountTry("");
      setOk("Personel indirimi uygulandı");
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İndirim uygulanamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title={program.name} description="Personel yan hakları" />
      {state ? (
        <SoftBox className="mb-3 text-sm">
          <p>
            Aylık: ₺{formatKurus(state.usage.monthlySpendKurus)} / ₺
            {formatKurus(state.usage.monthlyBudgetKurus)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Bugün {state.usage.dailyRedeemCount}/{state.usage.dailyLimit} işlem
          </p>
        </SoftBox>
      ) : null}
      <div className="space-y-3">
        <Field label="Davet kodu (opsiyonel)">
          <input
            className={inputClassName()}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
        </Field>
        <button
          type="button"
          className={btnGhost()}
          disabled={busy}
          onClick={() => void enroll()}
        >
          Personel olarak kaydet
        </button>
        <Field label="İndirim tutarı (TL)">
          <input
            className={inputClassName()}
            value={amountTry}
            onChange={(e) => setAmountTry(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        {state?.config.requireManagerPinAbove != null ? (
          <Field label="Yönetici PIN">
            <input
              className={inputClassName()}
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              type="password"
              inputMode="numeric"
            />
          </Field>
        ) : null}
        <button
          type="button"
          className={btnPrimary()}
          disabled={busy || !amountTry.trim()}
          onClick={() => void redeem()}
        >
          İndirim uygula
        </button>
      </div>
    </Panel>
  );
};

type MultiStampConfig = {
  mode?: "LANES" | "MULTIPLIER";
  lanes?: { id: string; label: string }[];
  productGroups?: { id: string; label: string; multiplier: number }[];
};

export function MultiStampCounterPanel(
  props: PanelBase & {
    stampCount: number;
    rewardReady: boolean;
    stampsRequired: number;
    rewardLabel: string;
    onCustomerUpdate: (c: {
      stampCount: number;
      rewardReady: boolean;
    }) => void;
  },
) {
  const {
    customerId,
    program,
    busy,
    setBusy,
    setError,
    setOk,
    onRefresh,
    stampCount,
    rewardReady,
    stampsRequired,
    rewardLabel,
    onCustomerUpdate,
  } = props;

  const config = (program.config ?? {}) as MultiStampConfig;
  const groups = useMemo(() => {
    if (config.mode === "LANES") {
      return (config.lanes ?? []).map((l) => ({
        id: l.id,
        label: l.label,
      }));
    }
    return (config.productGroups ?? []).map((g) => ({
      id: g.id,
      label: g.multiplier !== 1 ? `${g.label} ×${g.multiplier}` : g.label,
    }));
  }, [config]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    groups[0]?.id,
  );

  useEffect(() => {
    if (groups[0]?.id) setSelectedGroupId(groups[0].id);
  }, [groups]);

  const tiersForGroup = useMemo(() => {
    if (!program.tiers?.length) return [];
    if (config.mode === "LANES" && selectedGroupId) {
      return program.tiers.filter((t) => t.laneId === selectedGroupId);
    }
    return program.tiers;
  }, [program.tiers, config.mode, selectedGroupId]);

  async function addStamp() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api<{
        customer: { stampCount: number; rewardReady: boolean };
      }>(`/stamps/customers/${customerId}/stamp`, {
        method: "POST",
        body: JSON.stringify({
          source: "cashier",
          ...(selectedGroupId ? { productGroupId: selectedGroupId } : {}),
        }),
      });
      onCustomerUpdate(data.customer);
      setOk(`Damga eklendi (${data.customer.stampCount}/${stampsRequired})`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Damga eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function redeemTier(tierId: string | undefined, label: string) {
    if (!window.confirm(`${label} kullanılsın mı?`)) return;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api<{
        customer: { stampCount: number; rewardReady: boolean };
        redeemed: string;
      }>(`/stamps/customers/${customerId}/redeem`, {
        method: "POST",
        body: JSON.stringify(tierId ? { tierId } : {}),
      });
      onCustomerUpdate(data.customer);
      setOk(`Ödül kullanıldı: ${data.redeemed}`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ödül kullanılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="border-[var(--accent)]/20">
      <PanelHeader
        title={program.name}
        description={`Çoklu damga · ${stampCount}/${stampsRequired}`}
      />
      {groups.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={
                selectedGroupId === g.id ? btnPrimary() : btnGhost()
              }
              onClick={() => setSelectedGroupId(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={btnPrimary()}
          disabled={busy || rewardReady}
          onClick={() => void addStamp()}
        >
          Damga ekle
        </button>
        {rewardReady ? (
          <button
            type="button"
            className={btnGhost()}
            disabled={busy}
            onClick={() => void redeemTier(undefined, rewardLabel)}
          >
            Ödül kullan — {rewardLabel}
          </button>
        ) : null}
        {tiersForGroup.map((t) => (
          <button
            key={t.id}
            type="button"
            className={btnGhost()}
            disabled={busy || stampCount < t.threshold}
            onClick={() => void redeemTier(t.id, t.rewardLabel)}
          >
            {t.threshold} damga → {t.rewardLabel}
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function CounterExtraPanels({
  customerId,
  customer,
  programs,
  busy,
  setBusy,
  setError,
  setOk,
  onRefresh,
  onCustomerUpdate,
  stampsRequired,
  rewardLabel,
  states,
}: {
  /** Kart id → kasa durumu (toplu istekten) */
  states?: Record<string, unknown>;
  customerId: string;
  customer: { stampCount: number; rewardReady: boolean };
  programs: CounterProgram[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setOk: (msg: string | null) => void;
  onRefresh: () => Promise<void>;
  onCustomerUpdate: (c: { stampCount: number; rewardReady: boolean }) => void;
  stampsRequired: number;
  rewardLabel: string;
}) {
  const base: PanelBase = {
    customerId,
    program: programs[0]!,
    busy,
    setBusy,
    setError,
    setOk,
    onRefresh,
  };

  const discount = programs.find((p) => p.type === "DISCOUNT_CARD");
  const event = programs.find((p) => p.type === "EVENT_CARD");
  const membership = programs.find((p) => p.type === "MEMBERSHIP_CARD");
  const staff = programs.find((p) => p.type === "STAFF_CARD");
  const multiStamp = programs.find(
    (p) => p.type === "MULTI_STAMP" && p.isPrimary,
  );

  return (
    <>
      {multiStamp ? (
        <MultiStampCounterPanel
          {...base}
          program={multiStamp}
          stampCount={customer.stampCount}
          rewardReady={customer.rewardReady}
          stampsRequired={stampsRequired}
          rewardLabel={rewardLabel}
          onCustomerUpdate={onCustomerUpdate}
        />
      ) : null}
      {discount ? (
        <DiscountCounterPanel
          key={`${customerId}:${discount.id}`}
          {...base}
          program={discount}
          initialState={states?.[discount.id]}
        />
      ) : null}
      {event ? (
        <EventCounterPanel
          key={`${customerId}:${event.id}`}
          {...base}
          program={event}
          initialState={states?.[event.id]}
        />
      ) : null}
      {membership ? (
        <MembershipCounterPanel
          key={`${customerId}:${membership.id}`}
          {...base}
          program={membership}
          initialState={states?.[membership.id]}
        />
      ) : null}
      {staff ? (
        <StaffCounterPanel
          key={`${customerId}:${staff.id}`}
          {...base}
          program={staff}
          initialState={states?.[staff.id]}
        />
      ) : null}
    </>
  );
}
