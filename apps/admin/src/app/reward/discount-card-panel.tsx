"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  inputClassName,
} from "../../components/ui";

export type DiscountTierDraft = {
  minVisits: number;
  value: number;
  discountType: "PERCENT" | "FIXED";
};

export type DiscountCardDraft = {
  discountType: "PERCENT" | "FIXED";
  value: number;
  tierTrigger: "VISITS" | "SPEND" | "VIP";
  tieredDiscounts: DiscountTierDraft[];
  maxUsesPerDay: number;
  maxUsesPerMonth: number;
  stackWithCampaigns: boolean;
};

type DiscountProgram = {
  config: Partial<DiscountCardDraft> & {
    tieredDiscounts?: DiscountTierDraft[];
  };
};

export function defaultDiscountCardDraft(): DiscountCardDraft {
  return {
    discountType: "PERCENT",
    value: 10,
    tierTrigger: "VISITS",
    tieredDiscounts: [
      { minVisits: 0, value: 10, discountType: "PERCENT" },
      { minVisits: 20, value: 15, discountType: "PERCENT" },
    ],
    maxUsesPerDay: 1,
    maxUsesPerMonth: 30,
    stackWithCampaigns: false,
  };
}

export function draftFromDiscountProgram(
  program: DiscountProgram,
): DiscountCardDraft {
  const c = program.config ?? {};
  const base = defaultDiscountCardDraft();
  return {
    discountType: c.discountType ?? base.discountType,
    value: c.value ?? base.value,
    tierTrigger: c.tierTrigger ?? base.tierTrigger,
    tieredDiscounts: c.tieredDiscounts?.length
      ? c.tieredDiscounts
      : base.tieredDiscounts,
    maxUsesPerDay: c.maxUsesPerDay ?? base.maxUsesPerDay,
    maxUsesPerMonth: c.maxUsesPerMonth ?? base.maxUsesPerMonth,
    stackWithCampaigns: c.stackWithCampaigns ?? base.stackWithCampaigns,
  };
}

export function discountCardConfigPayload(draft: DiscountCardDraft) {
  return {
    discountType: draft.discountType,
    value: draft.value,
    tierTrigger: draft.tierTrigger,
    tieredDiscounts: draft.tieredDiscounts.map((t) => ({
      minVisits: t.minVisits,
      value: t.value,
      discountType: t.discountType,
    })),
    maxUsesPerDay: draft.maxUsesPerDay,
    maxUsesPerMonth: draft.maxUsesPerMonth,
    applicableCategories: [],
    stackWithCampaigns: draft.stackWithCampaigns,
  };
}

export function DiscountCardPanel({
  draft,
  onChange,
}: {
  draft: DiscountCardDraft;
  onChange: (next: DiscountCardDraft) => void;
}) {
  function updateTier(i: number, patch: Partial<DiscountTierDraft>) {
    const tieredDiscounts = draft.tieredDiscounts.map((t, idx) =>
      idx === i ? { ...t, ...patch } : t,
    );
    onChange({ ...draft, tieredDiscounts });
  }

  const label =
    draft.discountType === "PERCENT"
      ? `%${draft.value} indirim`
      : `${(draft.value / 100).toFixed(2)} TL indirim`;

  return (
    <Panel>
      <PanelHeader
        title="İndirim ayarları"
        description="Bu karttaki müşteri kasada kartını gösterince indirim uygulanır."
      />
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="İndirim nasıl olsun?">
            <select
              className={inputClassName()}
              value={draft.discountType}
              onChange={(e) =>
                onChange({
                  ...draft,
                  discountType: e.target.value as DiscountCardDraft["discountType"],
                })
              }
            >
              <option value="PERCENT">Yüzde (%)</option>
              <option value="FIXED">Sabit tutar (kuruş)</option>
            </select>
          </Field>
          <Field
            label={
              draft.discountType === "PERCENT" ? "İndirim (%)" : "Tutar (kuruş)"
            }
          >
            <input
              className={inputClassName()}
              type="number"
              min={1}
              value={draft.value}
              onChange={(e) =>
                onChange({ ...draft, value: Number(e.target.value) || 1 })
              }
            />
          </Field>
        </div>

        <Field label="Hangi ziyaret sayısında indirim artsın?">
          <select
            className={inputClassName()}
            value={draft.tierTrigger}
            onChange={(e) =>
              onChange({
                ...draft,
                tierTrigger: e.target.value as DiscountCardDraft["tierTrigger"],
              })
            }
          >
            <option value="VISITS">Ziyaret sayısı</option>
            <option value="SPEND">Harcama</option>
            <option value="VIP">VIP seviye</option>
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bir günde en fazla kaç kez kullanılabilir?">
            <input
              className={inputClassName()}
              type="number"
              min={1}
              value={draft.maxUsesPerDay}
              onChange={(e) =>
                onChange({
                  ...draft,
                  maxUsesPerDay: Number(e.target.value) || 1,
                })
              }
            />
          </Field>
          <Field label="Bir ayda en fazla kaç kez kullanılabilir?">
            <input
              className={inputClassName()}
              type="number"
              min={1}
              value={draft.maxUsesPerMonth}
              onChange={(e) =>
                onChange({
                  ...draft,
                  maxUsesPerMonth: Number(e.target.value) || 1,
                })
              }
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={draft.stackWithCampaigns}
            onChange={(e) =>
              onChange({ ...draft, stackWithCampaigns: e.target.checked })
            }
          />
          Kampanyalarla birleştirilebilir
        </label>

        <div>
          <p className="text-sm font-medium text-[var(--ink)]">
            Kademeli indirimler
          </p>
          <ul className="mt-3 space-y-2">
            {draft.tieredDiscounts.map((tier, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
              >
                <input
                  className={inputClassName()}
                  type="number"
                  min={0}
                  value={tier.minVisits}
                  onChange={(e) =>
                    updateTier(i, { minVisits: Number(e.target.value) || 0 })
                  }
                  placeholder="Kaç ziyarette?"
                />
                <input
                  className={inputClassName()}
                  type="number"
                  min={1}
                  value={tier.value}
                  onChange={(e) =>
                    updateTier(i, { value: Number(e.target.value) || 1 })
                  }
                  placeholder="Ne kadar indirim?"
                />
                <select
                  className={inputClassName()}
                  value={tier.discountType}
                  onChange={(e) =>
                    updateTier(i, {
                      discountType: e.target
                        .value as DiscountTierDraft["discountType"],
                    })
                  }
                >
                  <option value="PERCENT">%</option>
                  <option value="FIXED">TL</option>
                </select>
                <button
                  type="button"
                  className={btnGhost()}
                  onClick={() =>
                    onChange({
                      ...draft,
                      tieredDiscounts: draft.tieredDiscounts.filter(
                        (_, idx) => idx !== i,
                      ),
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
                tieredDiscounts: [
                  ...draft.tieredDiscounts,
                  { minVisits: 0, value: 10, discountType: "PERCENT" },
                ],
              })
            }
          >
            + Kademe
          </button>
        </div>

        <SoftBox className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Önizleme
          </p>
          <p className="mt-2">{label}</p>
        </SoftBox>
      </div>
    </Panel>
  );
}
