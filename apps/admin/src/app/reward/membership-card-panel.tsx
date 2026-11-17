"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  inputClassName,
} from "../../components/ui";

export type MembershipBenefitDraft = {
  type: "MONTHLY_FREE_ITEM" | "DISCOUNT_PERCENT" | "POINT_MULTIPLIER";
  label: string;
  quota?: number;
  value?: number;
};

export type MembershipPlanDraft = {
  id: string;
  label: string;
  priceTry: number;
  billingInterval: "MONTH" | "YEAR";
  benefits: MembershipBenefitDraft[];
};

export type MembershipCardDraft = {
  plans: MembershipPlanDraft[];
  gracePeriodDays: number;
};

type MembershipProgram = {
  config: Partial<MembershipCardDraft>;
};

export function defaultMembershipCardDraft(): MembershipCardDraft {
  return {
    plans: [
      {
        id: "monthly",
        label: "Aylık üyelik",
        priceTry: 29_900,
        billingInterval: "MONTH",
        benefits: [
          {
            type: "MONTHLY_FREE_ITEM",
            label: "Ayda 2 bedava filtre",
            quota: 2,
          },
        ],
      },
    ],
    gracePeriodDays: 3,
  };
}

export function draftFromMembershipProgram(
  program: MembershipProgram,
): MembershipCardDraft {
  const c = program.config ?? {};
  const base = defaultMembershipCardDraft();
  return {
    plans: c.plans?.length ? c.plans : base.plans,
    gracePeriodDays: c.gracePeriodDays ?? base.gracePeriodDays,
  };
}

export function membershipCardConfigPayload(draft: MembershipCardDraft) {
  return {
    plans: draft.plans.map((p) => ({
      id: p.id,
      label: p.label.trim() || p.id,
      priceTry: p.priceTry,
      billingInterval: p.billingInterval,
      benefits: p.benefits.map((b) => ({
        type: b.type,
        label: b.label.trim(),
        ...(b.quota != null ? { quota: b.quota } : {}),
        ...(b.value != null ? { value: b.value } : {}),
      })),
    })),
    gracePeriodDays: draft.gracePeriodDays,
  };
}

export function MembershipCardPanel({
  draft,
  onChange,
}: {
  draft: MembershipCardDraft;
  onChange: (next: MembershipCardDraft) => void;
}) {
  const plan = draft.plans[0];

  function updatePlan(patch: Partial<MembershipPlanDraft>) {
    if (!plan) return;
    onChange({
      ...draft,
      plans: [{ ...plan, ...patch }],
    });
  }

  function updateBenefit(i: number, patch: Partial<MembershipBenefitDraft>) {
    if (!plan) return;
    const benefits = plan.benefits.map((b, idx) =>
      idx === i ? { ...b, ...patch } : b,
    );
    updatePlan({ benefits });
  }

  if (!plan) return null;

  return (
    <Panel>
      <PanelHeader
        title="Üyelik ayarları"
        description="Müşterinin ödeyeceği üyelik paketi ve her ay alacağı haklar."
      />
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paket adı">
            <input
              className={inputClassName()}
              value={plan.label}
              onChange={(e) => updatePlan({ label: e.target.value })}
            />
          </Field>
          <Field label="Fiyat (TL)">
            <input
              className={inputClassName()}
              type="number"
              min={0}
              value={plan.priceTry}
              onChange={(e) =>
                updatePlan({ priceTry: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </div>

        <Field label="Ne sıklıkla ödenir?">
          <select
            className={inputClassName()}
            value={plan.billingInterval}
            onChange={(e) =>
              updatePlan({
                billingInterval: e.target
                  .value as MembershipPlanDraft["billingInterval"],
              })
            }
          >
            <option value="MONTH">Aylık</option>
            <option value="YEAR">Yıllık</option>
          </select>
        </Field>

        <Field label="Ödeme gecikirse kaç gün hak devam etsin?">
          <input
            className={inputClassName()}
            type="number"
            min={0}
            value={draft.gracePeriodDays}
            onChange={(e) =>
              onChange({
                ...draft,
                gracePeriodDays: Number(e.target.value) || 0,
              })
            }
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Ödeme başarısız olunca askıya almadan önceki süre.
          </p>
        </Field>

        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Haklar</p>
          <ul className="mt-3 space-y-2">
            {plan.benefits.map((b, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-[140px_1fr_80px_auto]"
              >
                <select
                  className={inputClassName()}
                  value={b.type}
                  onChange={(e) =>
                    updateBenefit(i, {
                      type: e.target.value as MembershipBenefitDraft["type"],
                    })
                  }
                >
                  <option value="MONTHLY_FREE_ITEM">Bedava ürün</option>
                  <option value="DISCOUNT_PERCENT">İndirim %</option>
                  <option value="POINT_MULTIPLIER">Puan çarpanı</option>
                </select>
                <input
                  className={inputClassName()}
                  value={b.label}
                  onChange={(e) => updateBenefit(i, { label: e.target.value })}
                  placeholder="Açıklama"
                />
                <input
                  className={inputClassName()}
                  type="number"
                  min={0}
                  value={b.quota ?? b.value ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (b.type === "MONTHLY_FREE_ITEM") {
                      updateBenefit(i, { quota: n || 0 });
                    } else {
                      updateBenefit(i, { value: n || 0 });
                    }
                  }}
                  placeholder="Adet/değer"
                />
                <button
                  type="button"
                  className={btnGhost()}
                  onClick={() =>
                    updatePlan({
                      benefits: plan.benefits.filter((_, idx) => idx !== i),
                    })
                  }
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${btnGhost()} mt-2`}
            onClick={() =>
              updatePlan({
                benefits: [
                  ...plan.benefits,
                  {
                    type: "MONTHLY_FREE_ITEM",
                    label: "Yeni hak",
                    quota: 1,
                  },
                ],
              })
            }
          >
            + Hak ekle
          </button>
        </div>

        <SoftBox className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Önizleme
          </p>
          <p className="mt-2">
            {plan.label} — {(plan.priceTry / 100).toLocaleString("tr-TR")} TL /{" "}
            {plan.billingInterval === "MONTH" ? "ay" : "yıl"}
          </p>
        </SoftBox>
      </div>
    </Panel>
  );
}
