"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  inputClassName,
} from "../../components/ui";

export type CashbackCategoryDraft = {
  categoryId: string;
  label: string;
  multiplier: number;
};

export type CashbackCardDraft = {
  earnPercent: number;
  categoryRates: CashbackCategoryDraft[];
  maxEarnPerDayTry: number;
  minRedeemTry: number;
  maxRedeemPercent: number;
  maxRedeemPerDayTry: number;
  requireAmountConfirmationAboveTry: number;
  stackWithDiscount: boolean;
};

type CashbackProgram = {
  config: {
    earnPercent?: number;
    categoryRates?: CashbackCategoryDraft[];
    maxEarnPerDayKurus?: number;
    minRedeemKurus?: number;
    maxRedeemPercent?: number;
    maxRedeemPerDayKurus?: number;
    requireAmountConfirmationAbove?: number;
    stackWithDiscount?: boolean;
  };
};

export function defaultCashbackCardDraft(): CashbackCardDraft {
  return {
    earnPercent: 10,
    categoryRates: [],
    maxEarnPerDayTry: 1000,
    minRedeemTry: 5,
    maxRedeemPercent: 50,
    maxRedeemPerDayTry: 500,
    requireAmountConfirmationAboveTry: 500,
    stackWithDiscount: false,
  };
}

export function draftFromCashbackProgram(
  program: CashbackProgram,
): CashbackCardDraft {
  const c = program.config ?? {};
  const base = defaultCashbackCardDraft();
  return {
    earnPercent: c.earnPercent ?? base.earnPercent,
    categoryRates: c.categoryRates?.length ? c.categoryRates : base.categoryRates,
    maxEarnPerDayTry: Math.round(
      (c.maxEarnPerDayKurus ?? base.maxEarnPerDayTry * 100) / 100,
    ),
    minRedeemTry: Math.round((c.minRedeemKurus ?? base.minRedeemTry * 100) / 100),
    maxRedeemPercent: c.maxRedeemPercent ?? base.maxRedeemPercent,
    maxRedeemPerDayTry: Math.round(
      (c.maxRedeemPerDayKurus ?? base.maxRedeemPerDayTry * 100) / 100,
    ),
    requireAmountConfirmationAboveTry: Math.round(
      (c.requireAmountConfirmationAbove ?? base.requireAmountConfirmationAboveTry * 100) /
        100,
    ),
    stackWithDiscount: c.stackWithDiscount ?? base.stackWithDiscount,
  };
}

export function cashbackCardConfigPayload(draft: CashbackCardDraft) {
  return {
    earnPercent: draft.earnPercent,
    categoryRates: draft.categoryRates.map((c) => ({
      categoryId: c.categoryId,
      label: c.label.trim() || c.categoryId,
      multiplier: c.multiplier,
    })),
    tieredRates: [{ minLifetimeSpendKurus: 0, rateMultiplier: 1 }],
    minEarnKurus: 0,
    maxEarnPerDayKurus: Math.round(draft.maxEarnPerDayTry * 100),
    minRedeemKurus: Math.round(draft.minRedeemTry * 100),
    maxRedeemPercent: draft.maxRedeemPercent,
    maxRedeemPerDayKurus: Math.round(draft.maxRedeemPerDayTry * 100),
    requireAmountConfirmationAbove: Math.round(
      draft.requireAmountConfirmationAboveTry * 100,
    ),
    stackWithDiscount: draft.stackWithDiscount,
    earnOnNetAfterCredit: true,
  };
}

function formatTryPreview(amountTry: number) {
  return amountTry.toFixed(2).replace(".", ",");
}

export function CashbackCardPanel({
  draft,
  onChange,
}: {
  draft: CashbackCardDraft;
  onChange: (next: CashbackCardDraft) => void;
}) {
  function updateCategory(i: number, patch: Partial<CashbackCategoryDraft>) {
    const categoryRates = draft.categoryRates.map((c, idx) =>
      idx === i ? { ...c, ...patch } : c,
    );
    onChange({ ...draft, categoryRates });
  }

  const exampleSpendTry = 500;
  const exampleEarnTry =
    Math.floor((exampleSpendTry * 100 * draft.earnPercent) / 100) / 100;

  return (
    <Panel>
      <PanelHeader
        title="Cashback ayarları"
        description="Müşteri harcadığı tutarın bir kısmını bakiye olarak geri kazanır. Kasada kartı okutup tutarı girersin."
      />
      <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <Field label="Harcamanın kaç yüzdesi geri dönsün? (%)">
          <input
            className={inputClassName()}
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={draft.earnPercent}
            onChange={(e) =>
              onChange({
                ...draft,
                earnPercent: Number(e.target.value) || 0,
              })
            }
          />
        </Field>

        <SoftBox>
          <p className="text-sm text-[var(--ink)]">
            Örnek: ₺{exampleSpendTry} harcama →{" "}
            <span className="font-semibold tabular-nums">
              +₺{formatTryPreview(exampleEarnTry)}
            </span>{" "}
            cashback (%{draft.earnPercent})
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Kasiyer mobil uygulamadan veya tezgâhtan QR okutup hesap tutarını girer.
          </p>
        </SoftBox>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bir müşteri bir günde en fazla kaç TL kazanabilir?">
            <input
              className={inputClassName()}
              type="number"
              min={0}
              value={draft.maxEarnPerDayTry}
              onChange={(e) =>
                onChange({
                  ...draft,
                  maxEarnPerDayTry: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
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
          </Field>
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--ink)]">
            Kategori çarpanları
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Opsiyonel — tezgâhta seçilen kategoriye göre cashback çarpılır.
          </p>
          {draft.categoryRates.length > 0 ? (
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
                      updateCategory(i, {
                        multiplier: Number(e.target.value) || 1,
                      })
                    }
                    title="Çarpan"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Henüz kategori yok — tüm harcamalarda aynı oran uygulanır.
            </p>
          )}
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

        <SoftBox>
          <p className="text-xs font-medium text-[var(--ink)]">Kullanım (redeem)</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Müşteri biriken bakiyeyi sonraki alışverişte kullanır.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="En az kaç TL bakiyeyle kullanılabilir?">
              <input
                className={inputClassName()}
                type="number"
                min={0}
                value={draft.minRedeemTry}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    minRedeemTry: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Sepetin en fazla yüzde kaçı bakiyeyle ödenebilir?">
              <input
                className={inputClassName()}
                type="number"
                min={1}
                max={100}
                value={draft.maxRedeemPercent}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    maxRedeemPercent: Number(e.target.value) || 50,
                  })
                }
              />
            </Field>
            <Field label="Bir günde en fazla kaç TL bakiye kullanılabilir?">
              <input
                className={inputClassName()}
                type="number"
                min={0}
                value={draft.maxRedeemPerDayTry}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    maxRedeemPerDayTry: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
          </div>
        </SoftBox>

        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={draft.stackWithDiscount}
            onChange={(e) =>
              onChange({ ...draft, stackWithDiscount: e.target.checked })
            }
          />
          İndirim kartı ile birlikte kullanılabilir
        </label>
      </div>
    </Panel>
  );
}
