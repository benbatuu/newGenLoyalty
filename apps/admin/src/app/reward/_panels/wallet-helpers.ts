import {
  type GroupStampStyle,
  type MultiStampWalletLayout,
} from "@ngl/shared";
import type { StampTheme } from "../../../components/stamp-glyph";
import type { MultiStampDraft } from "../multi-stamp-panel";
import type {
  ProgramWalletDraft,
  StampInset,
  TenantWalletDefaults,
  WalletBackField,
} from "./wallet-types";

export function draftFromProgramWallet(
  config: Record<string, unknown> | undefined,
  tenant: TenantWalletDefaults,
  programName: string,
): ProgramWalletDraft {
  const wt =
    config?.walletTemplate && typeof config.walletTemplate === "object"
      ? (config.walletTemplate as Record<string, unknown>)
      : {};

  return {
    primaryColor:
      (wt.primaryColor as string) || tenant.primaryColor || "#1B4332",
    foregroundColor:
      (wt.foregroundColor as string) || tenant.foregroundColor || "#FFFFFF",
    labelColor: (wt.labelColor as string) || tenant.labelColor || "#DCDCDC",
    stampTheme:
      ((wt.stampTheme as StampTheme) ||
        (tenant.stampTheme as StampTheme) ||
        "COFFEE") as StampTheme,
    stampInset:
      ((wt.stampInset as StampInset) ||
        (tenant.stampInset as StampInset) ||
        "NORMAL") as StampInset,
    logoText:
      (wt.logoText as string) || tenant.logoText || programName || tenant.name,
    passDescription:
      (wt.passDescription as string) ||
      tenant.passDescription ||
      programName,
    stampFieldLabel:
      (wt.stampFieldLabel as string) || tenant.stampFieldLabel || "DAMGA",
    rewardFieldLabel:
      (wt.rewardFieldLabel as string) || tenant.rewardFieldLabel || "ÖDÜL",
    statusFieldLabel:
      (wt.statusFieldLabel as string) || tenant.statusFieldLabel || "DURUM",
    stampIconFilledUrl: (wt.stampIconFilledUrl as string) || "",
    stampIconEmptyUrl: (wt.stampIconEmptyUrl as string) || "",
    logoUrl: (wt.logoUrl as string) || tenant.logoUrl || "",
    stripImageUrl: (wt.stripImageUrl as string) || "",
    backgroundImageUrl: (wt.backgroundImageUrl as string) || "",
    backFields: Array.isArray(wt.backFields)
      ? (wt.backFields as WalletBackField[])
      : [],
  };
}

export function walletTemplatePayload(draft: ProgramWalletDraft) {
  return {
    primaryColor: draft.primaryColor,
    foregroundColor: draft.foregroundColor,
    labelColor: draft.labelColor,
    stampTheme: draft.stampTheme,
    stampInset: draft.stampInset,
    logoText: draft.logoText.trim() || null,
    passDescription: draft.passDescription.trim() || null,
    stampFieldLabel: draft.stampFieldLabel.trim() || null,
    rewardFieldLabel: draft.rewardFieldLabel.trim() || null,
    statusFieldLabel: draft.statusFieldLabel.trim() || null,
    stampIconFilledUrl: draft.stampIconFilledUrl.trim() || null,
    stampIconEmptyUrl: draft.stampIconEmptyUrl.trim() || null,
    logoUrl: draft.logoUrl.trim() || null,
    stripImageUrl: draft.stripImageUrl.trim() || null,
    backgroundImageUrl: draft.backgroundImageUrl.trim() || null,
    backFields: draft.backFields
      .filter((f) => f.value.trim() !== "")
      .map((f) => ({
        key: f.key,
        label: f.label.trim(),
        value: f.value.trim(),
        ...(f.attributedValue?.trim() ? { attributedValue: f.attributedValue.trim() } : {}),
      })),
  };
}

export function isWalletEligibleProgram(type: string): boolean {
  return (
    type === "STAMP_CARD" ||
    type === "MULTI_STAMP" ||
    type === "POINT_CARD" ||
    type === "CASHBACK_CARD" ||
    type === "DISCOUNT_CARD" ||
    type === "EVENT_CARD"
  );
}

export function getGroupStampStyle(
  multiStamp: MultiStampDraft,
  groupId: string,
  fallbackTheme: StampTheme,
): GroupStampStyle & { stampTheme: StampTheme } {
  if (multiStamp.mode === "LANES") {
    const lane = multiStamp.lanes.find((l) => l.id === groupId);
    const theme = (lane?.stampTheme as StampTheme) || fallbackTheme;
    return {
      stampTheme: theme,
      stampIconFilledUrl:
        theme === "CUSTOM" ? lane?.stampIconFilledUrl ?? null : null,
      stampIconEmptyUrl:
        theme === "CUSTOM" ? lane?.stampIconEmptyUrl ?? null : null,
    };
  }
  const group = multiStamp.productGroups.find((g) => g.id === groupId);
  const theme = (group?.stampTheme as StampTheme) || fallbackTheme;
  return {
    stampTheme: theme,
    stampIconFilledUrl:
      theme === "CUSTOM" ? group?.stampIconFilledUrl ?? null : null,
    stampIconEmptyUrl:
      theme === "CUSTOM" ? group?.stampIconEmptyUrl ?? null : null,
  };
}

export function enrichLayoutWithGroupStyles(
  layout: MultiStampWalletLayout,
  multiStamp: MultiStampDraft,
  fallbackTheme: StampTheme,
): MultiStampWalletLayout {
  return {
    ...layout,
    segments: layout.segments.map((seg) => {
      const groupStyle = getGroupStampStyle(
        multiStamp,
        seg.laneId,
        fallbackTheme,
      );
      return {
        ...seg,
        stampTheme: groupStyle.stampTheme,
        stampIconFilledUrl: groupStyle.stampIconFilledUrl,
        stampIconEmptyUrl: groupStyle.stampIconEmptyUrl,
      };
    }),
  };
}
