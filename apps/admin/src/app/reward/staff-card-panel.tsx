"use client";

import {
  Field,
  Panel,
  PanelHeader,
  SoftBox,
  inputClassName,
} from "../../components/ui";

export type StaffCardDraft = {
  enrollment: "WHITELIST" | "INVITE_CODE";
  benefitType: "STAMP" | "POINT" | "DISCOUNT" | "FIXED_ALLOWANCE";
  percentDiscount: number;
  monthlyBudgetTry: number;
  dailyRedeemLimit: number;
  requireManagerPinAboveTry: number;
  whitelistedPhones: string;
};

type StaffProgram = {
  config: {
    enrollment?: StaffCardDraft["enrollment"];
    benefitType?: StaffCardDraft["benefitType"];
    allowance?: {
      percentDiscount?: number;
      monthlyBudgetTry?: number;
      dailyRedeemLimit?: number;
    };
    requireManagerPinAbove?: number;
    whitelistedPhones?: string[];
  };
};

export function defaultStaffCardDraft(): StaffCardDraft {
  return {
    enrollment: "WHITELIST",
    benefitType: "DISCOUNT",
    percentDiscount: 20,
    monthlyBudgetTry: 500,
    dailyRedeemLimit: 1,
    requireManagerPinAboveTry: 100,
    whitelistedPhones: "",
  };
}

export function draftFromStaffProgram(program: StaffProgram): StaffCardDraft {
  const c = program.config ?? {};
  const base = defaultStaffCardDraft();
  return {
    enrollment: c.enrollment ?? base.enrollment,
    benefitType: c.benefitType ?? base.benefitType,
    percentDiscount: c.allowance?.percentDiscount ?? base.percentDiscount,
    monthlyBudgetTry: Math.round(
      (c.allowance?.monthlyBudgetTry ?? 50_000) / 100,
    ),
    dailyRedeemLimit:
      c.allowance?.dailyRedeemLimit ?? base.dailyRedeemLimit,
    requireManagerPinAboveTry: Math.round(
      (c.requireManagerPinAbove ?? 10_000) / 100,
    ),
    whitelistedPhones: (c.whitelistedPhones ?? []).join("\n"),
  };
}

export function staffCardConfigPayload(
  draft: StaffCardDraft,
  linkedBranchIds: string[] = [],
) {
  const phones = draft.whitelistedPhones
    .split(/[\n,;]+/)
    .map((p) => p.replace(/\D/g, ""))
    .filter(Boolean);
  return {
    enrollment: draft.enrollment,
    whitelistedPhones: phones,
    benefitType: draft.benefitType,
    allowance: {
      percentDiscount: draft.percentDiscount,
      monthlyBudgetTry: Math.round(draft.monthlyBudgetTry * 100),
      dailyRedeemLimit: draft.dailyRedeemLimit,
    },
    requireManagerPinAbove: Math.round(draft.requireManagerPinAboveTry * 100),
    linkedBranchIds,
  };
}

export function StaffCardPanel({
  draft,
  onChange,
}: {
  draft: StaffCardDraft;
  onChange: (next: StaffCardDraft) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Personel ayarları"
        description="Çalışanlara özel indirim. Müşteri kartlarından ayrı tutulur."
      />
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Çalışan nasıl eklenir?">
            <select
              className={inputClassName()}
              value={draft.enrollment}
              onChange={(e) =>
                onChange({
                  ...draft,
                  enrollment: e.target.value as StaffCardDraft["enrollment"],
                })
              }
            >
              <option value="WHITELIST">Telefon whitelist</option>
              <option value="INVITE_CODE">Davet kodu</option>
            </select>
          </Field>
          <Field label="Hak ne?">
            <select
              className={inputClassName()}
              value={draft.benefitType}
              onChange={(e) =>
                onChange({
                  ...draft,
                  benefitType: e.target
                    .value as StaffCardDraft["benefitType"],
                })
              }
            >
              <option value="DISCOUNT">İndirim</option>
              <option value="STAMP">Damga</option>
              <option value="POINT">Puan</option>
              <option value="FIXED_ALLOWANCE">Sabit bütçe</option>
            </select>
          </Field>
        </div>

        {draft.enrollment === "WHITELIST" && (
          <Field label="Kartı kullanabilecek telefon numaraları (her satıra bir tane)">
            <textarea
              className={`${inputClassName()} min-h-[88px]`}
              value={draft.whitelistedPhones}
              onChange={(e) =>
                onChange({ ...draft, whitelistedPhones: e.target.value })
              }
              placeholder="05xx…"
            />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="İndirim yüzdesi">
            <input
              className={inputClassName()}
              type="number"
              min={0}
              max={100}
              value={draft.percentDiscount}
              onChange={(e) =>
                onChange({
                  ...draft,
                  percentDiscount: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
          <Field label="Ayda en fazla kaç TL indirim?">
            <input
              className={inputClassName()}
              type="number"
              min={0}
              value={draft.monthlyBudgetTry}
              onChange={(e) =>
                onChange({
                  ...draft,
                  monthlyBudgetTry: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bir günde en fazla kaç kez kullanılabilir?">
            <input
              className={inputClassName()}
              type="number"
              min={1}
              value={draft.dailyRedeemLimit}
              onChange={(e) =>
                onChange({
                  ...draft,
                  dailyRedeemLimit: Number(e.target.value) || 1,
                })
              }
            />
          </Field>
          <Field label="Bu tutarın üstünde yönetici onayı istenir (TL)">
            <input
              className={inputClassName()}
              type="number"
              min={0}
              value={draft.requireManagerPinAboveTry}
              onChange={(e) =>
                onChange({
                  ...draft,
                  requireManagerPinAboveTry: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
        </div>

        <SoftBox className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Önizleme
          </p>
          <p className="mt-2">
            Personel %{draft.percentDiscount} indirim · günlük max{" "}
            {draft.dailyRedeemLimit} kullanım
          </p>
        </SoftBox>
      </div>
    </Panel>
  );
}
