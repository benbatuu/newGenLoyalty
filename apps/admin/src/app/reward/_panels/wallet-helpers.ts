import {
  computeStampGrid,
  computeWalletStampPositions,
  resolveWalletStampGrid,
  type GroupStampStyle,
  type MultiStampWalletLayout,
  type WalletStampPosition,
} from "@ngl/shared";
import type { StampTheme } from "../../../components/stamp-glyph";
import type { MultiStampDraft } from "../multi-stamp-panel";
import type {
  BarcodeFormat,
  PassKitField,
  PassKitLocation,
  ProgramWalletDraft,
  StampRowAdjust,
  StampInset,
  TenantWalletDefaults,
  WalletBackField,
} from "./wallet-types";

/** ISO → <input type="datetime-local"> değeri (yerel saat) */
function isoToLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function draftFromProgramWallet(
  config: Record<string, unknown> | undefined,
  tenant: TenantWalletDefaults,
  programName: string,
): ProgramWalletDraft {
  const wt =
    config?.walletTemplate && typeof config.walletTemplate === "object"
      ? (config.walletTemplate as Record<string, unknown>)
      : {};

  // Şablonu hiç olmayan yeni kart marka varsayılanını devralır; mevcut kartlar bayrak açıkça true olmadıkça kendi değerlerini korur
  const inherit = config?.walletTemplate ? wt.inheritBrandFields === true : true;
  const brand = ((inherit && tenant.walletDefaults) || {}) as Record<string, unknown>;
  const brandHeader = Array.isArray(brand.headerFields) ? (brand.headerFields as PassKitField[]) : [];
  const brandLocations = Array.isArray(brand.locations) ? (brand.locations as PassKitLocation[]) : [];
  // Damga şeridi/dizilim: devralınıyorsa marka varsayılanı, değilse kartın kendi değeri
  const S = (k: string): unknown => (inherit && brand[k] !== undefined ? brand[k] : (wt as Record<string, unknown>)[k]);

  return {
    inheritBrandFields: inherit,
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
    stampRows: Number(S("stampRows")) || 0,
    stampLayout: S("stampLayout") === "STAGGERED" ? "STAGGERED" : "GRID",
    stampGapX: typeof S("stampGapX") === "number" ? (S("stampGapX") as number) : null,
    stampGapY: typeof S("stampGapY") === "number" ? (S("stampGapY") as number) : null,
    stampIconScale: typeof S("stampIconScale") === "number" ? (S("stampIconScale") as number) : 1,
    stampStaggerRatio: typeof S("stampStaggerRatio") === "number" ? (S("stampStaggerRatio") as number) : 0.5,
    stampOffsetX: typeof S("stampOffsetX") === "number" ? (S("stampOffsetX") as number) : 0,
    stampOffsetY: typeof S("stampOffsetY") === "number" ? (S("stampOffsetY") as number) : 0,
    stampPositions: Array.isArray(S("stampPositions"))
      ? (S("stampPositions") as ProgramWalletDraft["stampPositions"])
      : [],
    stampRowAdjust: Array.isArray(S("stampRowAdjust"))
      ? (S("stampRowAdjust") as (Partial<StampRowAdjust> | null)[]).map((r) => ({
          offsetX: r?.offsetX ?? 0,
          offsetY: r?.offsetY ?? 0,
          scale: r?.scale ?? 1,
        }))
      : [],
    headerFields: inherit
      ? brandHeader
      : Array.isArray(wt.headerFields)
        ? (wt.headerFields as PassKitField[])
        : [],
    auxFields: Array.isArray(wt.auxFields) ? (wt.auxFields as PassKitField[]) : [],
    showBarcode: wt.showBarcode !== false,
    barcodeFormat: (wt.barcodeFormat as BarcodeFormat | undefined) ?? "",
    barcodeAltMode:
      wt.barcodeAltMode === "NONE" || wt.barcodeAltMode === "CUSTOM" ? wt.barcodeAltMode : "CODE",
    barcodeAltText: (wt.barcodeAltText as string) || "",
    locations: (inherit
      ? brandLocations
      : Array.isArray(wt.locations)
        ? (wt.locations as PassKitLocation[])
        : []
    ).map((l) => ({
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
      relevantText: l.relevantText ?? "",
    })),
    relevantDate: isoToLocalInput(
      (inherit ? brand.relevantDate : wt.relevantDate) as string | undefined,
    ),
    expirationDate: isoToLocalInput(
      (inherit ? brand.expirationDate : wt.expirationDate) as string | undefined,
    ),
    suppressStripShine: inherit ? brand.suppressStripShine === true : wt.suppressStripShine === true,
    sharingProhibited: inherit ? brand.sharingProhibited === true : wt.sharingProhibited === true,
    // Kullanıcı alanı bilerek boşalttıysa (kayıtlı ""), tenant adını geri doldurma
    logoText:
      typeof wt.logoText === "string"
        ? (wt.logoText as string)
        : tenant.logoText || programName || tenant.name,
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
    stripImageUrl: (S("stripImageUrl") as string) || "",
    backgroundImageUrl: (wt.backgroundImageUrl as string) || "",
    backFields: Array.isArray(wt.backFields)
      ? (wt.backFields as WalletBackField[])
      : [],
  };
}

export function walletTemplatePayload(draft: ProgramWalletDraft) {
  return {
    inheritBrandFields: draft.inheritBrandFields,
    primaryColor: draft.primaryColor,
    foregroundColor: draft.foregroundColor,
    labelColor: draft.labelColor,
    stampTheme: draft.stampTheme,
    stampInset: draft.stampInset,
    stampRows: draft.stampRows || null,
    stampLayout: draft.stampLayout,
    stampGapX: draft.stampGapX,
    stampGapY: draft.stampGapY,
    stampIconScale: draft.stampIconScale,
    stampStaggerRatio: draft.stampStaggerRatio,
    stampOffsetX: draft.stampOffsetX,
    stampOffsetY: draft.stampOffsetY,
    stampPositions: draft.stampPositions,
    stampRowAdjust: draft.stampRowAdjust,
    headerFields: draft.headerFields.filter((f) => f.label.trim() && f.value.trim()),
    auxFields: [], // yardımcı alanlar kaldırıldı
    showBarcode: draft.showBarcode,
    barcodeFormat: draft.barcodeFormat || null,
    barcodeAltMode: draft.barcodeAltMode,
    barcodeAltText: draft.barcodeAltText.trim() || null,
    locations: draft.locations
      .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude))
      .map((l) => ({
        latitude: l.latitude,
        longitude: l.longitude,
        relevantText: l.relevantText.trim() || null,
      })),
    relevantDate: localInputToIso(draft.relevantDate),
    expirationDate: localInputToIso(draft.expirationDate),
    suppressStripShine: draft.suppressStripShine,
    sharingProhibited: draft.sharingProhibited,
    logoText: draft.logoText.trim(),
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

/** Düzenleyici sayfası ile kart sayfası arasında kaydedilmemiş taslağı taşıyan anahtar */
export function stampEditorDraftKey(programId: string): string {
  return `stampEditorDraft:${programId}`;
}

/** Önizleme ve düzenleyici için damga ızgarası + konumları (sunucuyla aynı hesap). */
export function stampLayoutForDraft(
  draft: ProgramWalletDraft,
  total: number,
): { cols: number; rows: number; positions: WalletStampPosition[] } {
  const n = Math.max(1, total);
  const { cols, rows } = resolveWalletStampGrid(
    n,
    computeStampGrid(n),
    draft.stampRows,
  );
  const positions = computeWalletStampPositions(
    n,
    cols,
    rows,
    draft.stampInset,
    undefined,
    undefined,
    {
      layout: draft.stampLayout,
      gapX: draft.stampGapX,
      gapY: draft.stampGapY,
      iconScale: draft.stampIconScale,
      staggerRatio: draft.stampStaggerRatio,
      offsetX: draft.stampOffsetX,
      offsetY: draft.stampOffsetY,
      manual: draft.stampPositions,
      rowAdjust: draft.stampRowAdjust,
    },
  );
  return { cols, rows, positions };
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
