"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MAX_MULTI_STAMP_GROUPS,
  MAX_WALLET_STAMP_SLOTS,
  buildMultiStampWalletLayoutForProgram,
  defaultGroupStampTheme,
  maxThresholdPerGroup,
  validateMultiStampWalletCapacity,
} from "@ngl/shared";
import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  inputClassName,
} from "../../components/ui";

export type ProductGroupDraft = {
  id: string;
  label: string;
  multiplier: number;
  stampTheme?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
};

export type LaneDraft = {
  id: string;
  label: string;
  stampTheme?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
};

export type TierDraft = {
  id?: string;
  sortOrder?: number;
  threshold: number;
  rewardLabel: string;
  redeemCost: number;
  laneId?: string | null;
};

export type MultiStampDraft = {
  programType: "STAMP_CARD" | "MULTI_STAMP";
  mode: "LANES" | "MULTIPLIER";
  productGroups: ProductGroupDraft[];
  lanes: LaneDraft[];
  tiers: TierDraft[];
};

type Program = {
  type: string;
  config: {
    mode?: "LANES" | "MULTIPLIER";
    productGroups?: ProductGroupDraft[];
    lanes?: LaneDraft[];
  };
  tiers: TierDraft[];
};

export function defaultMultiStampDraft(
  stampsRequired: number,
  rewardLabel: string,
): MultiStampDraft {
  return {
    programType: "STAMP_CARD",
    mode: "MULTIPLIER",
    productGroups: [
      { id: "coffee", label: "Kahve", multiplier: 1, stampTheme: "COFFEE" },
      { id: "dessert", label: "Tatlı", multiplier: 2, stampTheme: "DESSERT" },
    ],
    lanes: [
      { id: "coffee", label: "Kahve", stampTheme: "COFFEE" },
      { id: "dessert", label: "Tatlı", stampTheme: "DESSERT" },
    ],
    tiers: [
      {
        threshold: stampsRequired,
        rewardLabel,
        redeemCost: stampsRequired,
      },
    ],
  };
}

export function draftFromProgram(
  program: Program,
  fallback: MultiStampDraft,
): MultiStampDraft {
  if (program.type !== "MULTI_STAMP") {
    return { ...fallback, programType: "STAMP_CARD" };
  }
  return {
    programType: "MULTI_STAMP",
    mode: program.config.mode ?? "MULTIPLIER",
    productGroups: program.config.productGroups?.length
      ? program.config.productGroups.map((g, i) => ({
          ...g,
          stampTheme: g.stampTheme ?? defaultGroupStampTheme(i),
        }))
      : fallback.productGroups,
    lanes: program.config.lanes?.length
      ? program.config.lanes.map((l, i) => ({
          ...l,
          stampTheme: l.stampTheme ?? defaultGroupStampTheme(i),
        }))
      : fallback.lanes,
    tiers: program.tiers.length
      ? program.tiers.map((t) => ({
          id: t.id,
          sortOrder: t.sortOrder,
          threshold: t.threshold,
          rewardLabel: t.rewardLabel,
          redeemCost: t.redeemCost ?? t.threshold,
          laneId: t.laneId,
        }))
      : fallback.tiers,
  };
}

type PresetId = "PRODUCTS" | "SEPARATE" | "ONE";

/** Mevcut taslağın hangi hazır düzene benzediğini bulur (seçili kutu için). */
function presetOf(d: MultiStampDraft): PresetId | null {
  if (d.mode === "LANES") return "SEPARATE";
  if (d.productGroups.length >= 2) return "PRODUCTS";
  if (d.productGroups.length === 1) return "ONE";
  return null;
}

/** Hazır düzenler. Kullanıcı sadece seçer; alanlar otomatik dolar. */
function buildPreset(id: PresetId, stampsRequired: number, rewardLabel: string): MultiStampDraft {
  const n = Math.max(1, stampsRequired);
  if (id === "PRODUCTS") {
    // Tek kart: kahve 1 damga, tatlı 2 damga. Dolunca bir ödül.
    return {
      programType: "STAMP_CARD",
      mode: "MULTIPLIER",
      productGroups: [
        { id: "coffee", label: "Kahve", multiplier: 1, stampTheme: "COFFEE" },
        { id: "cold", label: "Soğuk içecek", multiplier: 2, stampTheme: "COFFEE" },
        { id: "dessert", label: "Tatlı", multiplier: 3, stampTheme: "DESSERT" },
      ],
      lanes: [],
      tiers: [{ threshold: n, rewardLabel, redeemCost: n }],
    };
  }
  if (id === "SEPARATE") {
    // İki ayrı sıra: kahve sırası ve tatlı sırası, her biri kendi ödülü.
    return {
      programType: "STAMP_CARD",
      mode: "LANES",
      productGroups: [],
      lanes: [
        { id: "coffee", label: "Kahve", stampTheme: "COFFEE" },
        { id: "dessert", label: "Tatlı", stampTheme: "DESSERT" },
      ],
      tiers: [
        { threshold: n, rewardLabel: "1 bedava kahve", redeemCost: n, laneId: "coffee" },
        { threshold: n, rewardLabel: "1 bedava tatlı", redeemCost: n, laneId: "dessert" },
      ],
    };
  }
  // ONE: tek ürün, klasik damga kartı gibi.
  return {
    programType: "STAMP_CARD",
    mode: "MULTIPLIER",
    productGroups: [{ id: "item", label: "Ürün", multiplier: 1, stampTheme: "COFFEE" }],
    lanes: [],
    tiers: [{ threshold: n, rewardLabel, redeemCost: n }],
  };
}

const PRESET_OPTIONS: { id: PresetId; title: string; body: string; example: string }[] = [
  {
    id: "PRODUCTS",
    title: "Ürüne göre damga",
    body: "Tek kart. Her ürün grubu kendi çarpanıyla damga verir: 1x, 2x, 3x (4x'e kadar).",
    example: "Kahve 1x · Soğuk içecek 2x · Tatlı 3x",
  },
  {
    id: "SEPARATE",
    title: "Ayrı sıralar",
    body: "Kahve için bir sıra, tatlı için bir sıra. Her sıranın kendi ödülü var.",
    example: "10 kahve → kahve ödülü · 10 tatlı → tatlı ödülü",
  },
  {
    id: "ONE",
    title: "Tek ürün",
    body: "Klasik damga kartı. Her alışta 1 damga.",
    example: "10 damgada ödül",
  },
];

export function MultiStampPanel({
  draft,
  onChange,
  stampsRequired,
  rewardLabel,
}: {
  draft: MultiStampDraft;
  onChange: (next: MultiStampDraft) => void;
  stampsRequired: number;
  rewardLabel: string;
}) {
  const [local, setLocal] = useState(draft);

  useEffect(() => {
    setLocal(draft);
  }, [draft]);

  function patch(partial: Partial<MultiStampDraft>) {
    const next = { ...local, ...partial };
    setLocal(next);
    onChange(next);
  }

  const groupCount =
    local.mode === "LANES" ? local.lanes.length : local.productGroups.length;
  const perGroupMax = maxThresholdPerGroup(groupCount);
  const walletLayout = buildMultiStampWalletLayoutForProgram(
    local.mode,
    {
      lanes: local.lanes,
      productGroups: local.productGroups,
    },
    local.tiers,
    { fallbackThreshold: stampsRequired },
  );
  const walletValidation = useMemo(
    () =>
      validateMultiStampWalletCapacity(
        local.mode,
        groupCount,
        local.tiers,
        local.lanes,
      ),
    [local.mode, groupCount, local.tiers, local.lanes],
  );

  function patchTier(index: number, partial: Partial<TierDraft>) {
    const tiers = local.tiers.map((t, i) =>
      i === index
        ? { ...t, ...partial, redeemCost: partial.threshold ?? t.threshold }
        : t,
    );
    patch({ tiers });
  }

  return (
    <Panel>
      <PanelHeader
        title="Çoklu damga"
        description="Birden fazla ürün için ayrı damga toplanır."
      />
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Hangi düzen?">
          {PRESET_OPTIONS.map((opt) => {
            const active = presetOf(local) === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  const next = buildPreset(opt.id, stampsRequired, rewardLabel);
                  setLocal(next);
                  onChange(next);
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-[var(--ink)] bg-[var(--surface)] ring-1 ring-[var(--ink)]/20"
                    : "border-[var(--line)] hover:bg-[var(--surface)]"
                }`}
              >
                <span className="block text-[0.875rem] font-semibold text-[var(--ink)]">{opt.title}</span>
                <span className="mt-1 block text-[0.75rem] text-[var(--muted)]">{opt.body}</span>
                <span className="mt-2 block text-[0.6875rem] font-medium text-[var(--ink)]">Örnek: {opt.example}</span>
              </button>
            );
          })}
        </div>

        <details className="rounded-lg border border-[var(--line)] p-3">
          <summary className="cursor-pointer text-[0.8125rem] font-medium text-[var(--muted)]">
            Gelişmiş ayarlar (isteğe bağlı)
          </summary>
          <div className="mt-4 space-y-4">
        <Field label="Damgalar nasıl toplansın?">
          <select
            className={inputClassName()}
            value={local.mode}
            onChange={(e) =>
              patch({ mode: e.target.value as MultiStampDraft["mode"] })
            }
          >
            <option value="MULTIPLIER">
              Tek kartta, ürüne göre farklı sayıda damga (ör. kahve 1, tatlı 2)
            </option>
            <option value="LANES">
              Ayrı kartlar gibi: her ürünün kendi damga sırası olur
            </option>
          </select>
        </Field>

        {local.mode === "MULTIPLIER" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--muted)]">
                  Ürünler
                </p>
                {local.productGroups.map((g, i) => (
                  <div key={g.id || i} className="grid gap-2 sm:grid-cols-3">
                    <input
                      className={inputClassName()}
                      value={g.label}
                      placeholder="Ürün adı (ör. Kahve)"
                      onChange={(e) => {
                        const productGroups = [...local.productGroups];
                        productGroups[i] = {
                          ...g,
                          label: e.target.value,
                          id:
                            g.id ||
                            e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "_")
                              .slice(0, 20),
                        };
                        patch({ productGroups });
                      }}
                    />
                    <input
                      className={inputClassName()}
                      type="number"
                      min={1}
                      max={4}
                      title="Her alışta kaç damga verilsin? 1 = bir damga, 2 = iki damga"
                      value={g.multiplier}
                      onChange={(e) => {
                        const productGroups = [...local.productGroups];
                        productGroups[i] = {
                          ...g,
                          multiplier: Number(e.target.value) || 1,
                        };
                        patch({ productGroups });
                      }}
                    />
                    <button
                      type="button"
                      className={btnGhost()}
                      onClick={() =>
                        patch({
                          productGroups: local.productGroups.filter(
                            (_, j) => j !== i,
                          ),
                        })
                      }
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={local.productGroups.length >= MAX_MULTI_STAMP_GROUPS}
                  onClick={() =>
                    patch({
                      productGroups: [
                        ...local.productGroups,
                        {
                          id: `group_${local.productGroups.length + 1}`,
                          label: "Yeni ürün",
                          multiplier: 1,
                        },
                      ],
                    })
                  }
                >
                  + Ürün ekle
                  {local.productGroups.length >= MAX_MULTI_STAMP_GROUPS
                    ? ` (maks. ${MAX_MULTI_STAMP_GROUPS})`
                    : ""}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--muted)]">
                  Damga sıraları
                </p>
                {local.lanes.map((lane, i) => (
                  <div key={lane.id || i} className="grid gap-2 sm:grid-cols-2">
                    <input
                      className={inputClassName()}
                      value={lane.label}
                      placeholder="Sıra adı (ör. Kahve sırası)"
                      onChange={(e) => {
                        const lanes = [...local.lanes];
                        lanes[i] = {
                          ...lane,
                          label: e.target.value,
                          id:
                            lane.id ||
                            e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "_")
                              .slice(0, 20),
                        };
                        patch({ lanes });
                      }}
                    />
                    <button
                      type="button"
                      className={btnGhost()}
                      onClick={() =>
                        patch({
                          lanes: local.lanes.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={local.lanes.length >= MAX_MULTI_STAMP_GROUPS}
                  onClick={() =>
                    patch({
                      lanes: [
                        ...local.lanes,
                        {
                          id: `lane_${local.lanes.length + 1}`,
                          label: "Yeni sıra",
                        },
                      ],
                    })
                  }
                >
                  + Sıra ekle
                  {local.lanes.length >= MAX_MULTI_STAMP_GROUPS
                    ? ` (maks. ${MAX_MULTI_STAMP_GROUPS})`
                    : ""}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--muted)]">
                Ödüller
              </p>
              {local.tiers.map((tier, i) => (
                <div
                  key={tier.id ?? i}
                  className="grid gap-2 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-2"
                >
                  <input
                    className={inputClassName()}
                    type="number"
                    min={1}
                    max={
                      local.mode === "LANES"
                        ? perGroupMax
                        : MAX_WALLET_STAMP_SLOTS
                    }
                    value={tier.threshold}
                    placeholder="Kaç damgada?"
                    onChange={(e) =>
                      patchTier(i, { threshold: Number(e.target.value) || 1 })
                    }
                  />
                  <input
                    className={inputClassName() + " sm:col-span-2"}
                    value={tier.rewardLabel}
                    placeholder="Ödül ne? (ör. 1 bedava kahve)"
                    onChange={(e) =>
                      patchTier(i, { rewardLabel: e.target.value })
                    }
                  />
                  {local.mode === "LANES" && (
                    <select
                      className={inputClassName() + " sm:col-span-2"}
                      value={tier.laneId ?? ""}
                      onChange={(e) =>
                        patchTier(i, {
                          laneId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Hangi sıra?</option>
                      {local.lanes.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={btnGhost()}
                onClick={() =>
                  patch({
                    tiers: [
                      ...local.tiers,
                      {
                        threshold: stampsRequired,
                        rewardLabel,
                        redeemCost: stampsRequired,
                        laneId:
                          local.mode === "LANES"
                            ? (local.lanes[0]?.id ?? null)
                            : null,
                      },
                    ],
                  })
                }
              >
                + Ödül ekle
              </button>
            </div>

            <SoftBox>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Kart özeti
              </p>
              {walletLayout ? (
                <>
                  <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                    Kartta toplam {walletLayout.totalSlots} damga yeri var
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {walletLayout.segments
                      .map((s) => `${s.label}: ${s.threshold} damga`)
                      .join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    En fazla {MAX_MULTI_STAMP_GROUPS} ürün, kartta en fazla{" "}
                    {MAX_WALLET_STAMP_SLOTS} damga olabilir.
                  </p>
                  {!walletValidation.ok && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {walletValidation.message}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Tek ürün var: kartta {local.tiers[0]?.threshold ?? stampsRequired}{" "}
                  damga olur. Ürün ekledikçe damga sayısı artar.
                </p>
              )}
              <p className="mt-3 text-sm text-[var(--ink)]">
                {local.mode === "MULTIPLIER"
                  ? local.productGroups
                      .map((g) => `${g.label} (${g.multiplier}x)`)
                      .join(" · ")
                  : local.lanes.map((l) => l.label).join(" · ")}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {local.tiers.map((t, i) => (
                  <li key={i}>
                    {t.threshold} damgada → {t.rewardLabel}
                    {t.laneId
                      ? ` (${local.lanes.find((l) => l.id === t.laneId)?.label ?? t.laneId})`
                      : ""}
                  </li>
                ))}
              </ul>
            </SoftBox>
          </div>
        </details>
      </div>
    </Panel>
  );
}
