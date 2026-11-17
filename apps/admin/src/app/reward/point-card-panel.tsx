"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  inputClassName,
} from "../../components/ui";

export type PointRedeemRuleDraft = {
  pointCost: number;
  rewardType: "FREE_ITEM" | "DISCOUNT_FIXED" | "DISCOUNT_PERCENT";
  rewardLabel: string;
  value?: number;
};

export type PointCategoryDraft = {
  categoryId: string;
  label: string;
  multiplier: number;
};

export type PointCardDraft = {
  earnRateDefault: number;
  categoryRates: PointCategoryDraft[];
  redeemRules: PointRedeemRuleDraft[];
  maxPointsPerDay: number;
  requireAmountConfirmationAboveTry: number;
};

type PointProgram = {
  config: {
    earnRate?: { default?: number };
    categoryRates?: PointCategoryDraft[];
    redeemRules?: PointRedeemRuleDraft[];
    maxPointsPerDay?: number;
    requireAmountConfirmationAbove?: number;
  };
};

export function defaultPointCardDraft(): PointCardDraft {
  return {
    earnRateDefault: 1,
    categoryRates: [
      { categoryId: "drink", label: "İçecek", multiplier: 1 },
      { categoryId: "food", label: "Yiyecek", multiplier: 1 },
    ],
    redeemRules: [
      {
        pointCost: 100,
        rewardType: "FREE_ITEM",
        rewardLabel: "Bedava içecek",
      },
    ],
    maxPointsPerDay: 10_000,
    requireAmountConfirmationAboveTry: 500,
  };
}

export function draftFromPointProgram(program: PointProgram): PointCardDraft {
  const c = program.config ?? {};
  return {
    earnRateDefault: c.earnRate?.default ?? 1,
    categoryRates: c.categoryRates?.length
      ? c.categoryRates.map((cat) => ({
          categoryId: cat.categoryId,
          label: cat.label ?? cat.categoryId,
          multiplier: cat.multiplier,
        }))
      : defaultPointCardDraft().categoryRates,
    redeemRules: c.redeemRules?.length
      ? c.redeemRules
      : defaultPointCardDraft().redeemRules,
    maxPointsPerDay: c.maxPointsPerDay ?? 10_000,
    requireAmountConfirmationAboveTry: Math.round(
      (c.requireAmountConfirmationAbove ?? 50_000) / 100,
    ),
  };
}

export function pointCardConfigPayload(draft: PointCardDraft) {
  return {
    earnRate: { default: draft.earnRateDefault, currency: "TRY" as const },
    categoryRates: draft.categoryRates.map((c) => ({
      categoryId: c.categoryId,
      label: c.label.trim() || c.categoryId,
      multiplier: c.multiplier,
    })),
    tieredEarnRates: [{ minLifetimeSpend: 0, rateMultiplier: 1 }],
    redeemRules: draft.redeemRules.map((r) => ({
      pointCost: r.pointCost,
      rewardType: r.rewardType,
      rewardLabel: r.rewardLabel.trim(),
      ...(r.value != null ? { value: r.value } : {}),
    })),
    maxPointsPerDay: draft.maxPointsPerDay,
    requireAmountConfirmationAbove: Math.round(
      draft.requireAmountConfirmationAboveTry * 100,
    ),
    allowPartialRedeem: false,
  };
}

export function PointCardPanel({
  draft,
  onChange,
}: {
  draft: PointCardDraft;
  onChange: (next: PointCardDraft) => void;
}) {
  function updateRule(i: number, patch: Partial<PointRedeemRuleDraft>) {
    const redeemRules = draft.redeemRules.map((r, idx) =>
      idx === i ? { ...r, ...patch } : r,
    );
    onChange({ ...draft, redeemRules });
  }

  function updateCategory(i: number, patch: Partial<PointCategoryDraft>) {
    const categoryRates = draft.categoryRates.map((c, idx) =>
      idx === i ? { ...c, ...patch } : c,
    );
    onChange({ ...draft, categoryRates });
  }

  return (
    <Panel>
      <PanelHeader
        title="Puan ayarları"
        description="Müşteri ne kadar harcarsa o kadar puan kazanır. Kasada tutarı girince puan otomatik hesaplanır."
      />
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="1 TL harcama kaç puan versin?">
            <input
              className={inputClassName()}
              type="number"
              min={0.1}
              step={0.1}
              value={draft.earnRateDefault}
              onChange={(e) =>
                onChange({
                  ...draft,
                  earnRateDefault: Number(e.target.value) || 1,
                })
              }
            />
          </Field>
          <Field label="Bir müşteri bir günde en fazla kaç puan kazanabilir?">
            <input
              className={inputClassName()}
              type="number"
              min={1}
              value={draft.maxPointsPerDay}
              onChange={(e) =>
                onChange({
                  ...draft,
                  maxPointsPerDay: Number(e.target.value) || 10_000,
                })
              }
            />
          </Field>
        </div>

        <Field label="Bu tutarın üstündeki harcamada kasiyer onay ister (TL)">
          <input
            className={inputClassName()}
            type="number"
            min={0}
            value={draft.requireAmountConfirmationAboveTry}
            onChange={(e) =>
              onChange({
                ...draft,
                requireAmountConfirmationAboveTry: Number(e.target.value) || 0,
              })
            }
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Bu tutarın üzerinde kasiyerden ek onay istenir.
          </p>
        </Field>

        <div>
          <p className="text-sm font-medium text-[var(--ink)]">
            Kategori çarpanları
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Tezgâhta seçilen kategoriye göre puan çarpılır.
          </p>
          <ul className="mt-3 space-y-2">
            {draft.categoryRates.map((cat, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-[1fr_1fr_80px]"
              >
                <input
                  className={inputClassName()}
                  value={cat.label}
                  onChange={(e) => updateCategory(i, { label: e.target.value })}
                  placeholder="Etiket"
                />
                <input
                  className={inputClassName()}
                  value={cat.categoryId}
                  onChange={(e) =>
                    updateCategory(i, { categoryId: e.target.value })
                  }
                  placeholder="id"
                />
                <input
                  className={inputClassName()}
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={cat.multiplier}
                  onChange={(e) =>
                    updateCategory(i, { multiplier: Number(e.target.value) || 1 })
                  }
                  title="Çarpan"
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${btnGhost()} mt-2`}
            onClick={() =>
              onChange({
                ...draft,
                categoryRates: [
                  ...draft.categoryRates,
                  {
                    categoryId: `cat_${draft.categoryRates.length + 1}`,
                    label: "Yeni kategori",
                    multiplier: 1,
                  },
                ],
              })
            }
          >
            + Kategori
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Puanla ödüller</p>
          <ul className="mt-3 space-y-2">
            {draft.redeemRules.map((rule, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-[100px_1fr_auto]"
              >
                <input
                  className={inputClassName()}
                  type="number"
                  min={1}
                  value={rule.pointCost}
                  onChange={(e) =>
                    updateRule(i, { pointCost: Number(e.target.value) || 1 })
                  }
                  placeholder="Puan"
                />
                <input
                  className={inputClassName()}
                  value={rule.rewardLabel}
                  onChange={(e) =>
                    updateRule(i, { rewardLabel: e.target.value })
                  }
                  placeholder="Ödül adı"
                />
                <button
                  type="button"
                  className={btnGhost()}
                  onClick={() =>
                    onChange({
                      ...draft,
                      redeemRules: draft.redeemRules.filter((_, idx) => idx !== i),
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
              onChange({
                ...draft,
                redeemRules: [
                  ...draft.redeemRules,
                  {
                    pointCost: 50,
                    rewardType: "FREE_ITEM",
                    rewardLabel: "Yeni ödül",
                  },
                ],
              })
            }
          >
            + Ödül kuralı
          </button>
        </div>

        <SoftBox className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Örnek
          </p>
          <p className="mt-2">
            47,50 TL harcama →{" "}
            {Math.floor(47.5 * draft.earnRateDefault)} puan (kampanya hariç)
          </p>
        </SoftBox>
      </div>
    </Panel>
  );
}
