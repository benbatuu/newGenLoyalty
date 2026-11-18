"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  MAX_WALLET_STAMP_SLOTS,
  type GroupStampStyle,
  type MultiStampWalletLayout,
} from "@ngl/shared";
import { SoftBox } from "../../../components/ui";
import { resolveAdminAssetUrl } from "../../../lib/public-urls";
import { ApplePassFront } from "./apple-pass-front";
import { StampStripPreview } from "./stamp-strip-preview";
import { WalletBarcode } from "./wallet-barcode";
import type {
  BarcodeFormat,
  GroupPreviewItem,
  ProgramWalletDraft,
  TenantWalletDefaults,
} from "./wallet-types";
import { useLayoutEffect, useRef } from "react";
import { passTextColors } from "../../../lib/wallet-text";

export type WalletPreviewPanelProps = {
  draft: ProgramWalletDraft;
  tenant: TenantWalletDefaults;
  programName: string;
  rewardLabel: string;
  stampsRequired: number;
  showStampStrip: boolean;
  isCashbackCard: boolean;
  isPointCard: boolean;
  isMultiStampCombined: boolean;
  previewLogo: string;
  effectiveFilledUrl: string | null;
  effectiveEmptyUrl: string | null;
  previewSlotFilled: boolean[];
  previewSlotStyles: GroupStampStyle[] | undefined;
  segmentBoundaries: number[] | undefined;
  walletLayout: MultiStampWalletLayout | null;
  totalPreviewFilled: number;
  effectiveTotalSlots: number;
  previewStatus: string;
  previewFilled: number;
  setPreviewFilled: (n: number) => void;
  previewRewardReady: boolean;
  setPreviewRewardReady: (v: boolean) => void;
  previewLaneFilled: Record<string, number>;
  setPreviewLaneFilled: Dispatch<SetStateAction<Record<string, number>>>;
  groupPreviewItems: GroupPreviewItem[];
  previewBalanceTry: string | null;
  barcodeFormat: BarcodeFormat;
};

/** Wallet barkodunun altında görünen kod (örnek) */
const SAMPLE_ALT_TEXT = "769248";

export function WalletPreviewPanel({
  draft,
  tenant,
  programName,
  rewardLabel,
  stampsRequired,
  showStampStrip,
  isCashbackCard,
  isPointCard,
  isMultiStampCombined,
  previewLogo,
  effectiveFilledUrl,
  effectiveEmptyUrl,
  previewSlotFilled,
  previewSlotStyles,
  segmentBoundaries,
  walletLayout,
  totalPreviewFilled,
  effectiveTotalSlots,
  previewStatus,
  previewFilled,
  setPreviewFilled,
  previewRewardReady,
  setPreviewRewardReady,
  previewLaneFilled,
  setPreviewLaneFilled,
  groupPreviewItems,
  previewBalanceTry,
  barcodeFormat,
}: WalletPreviewPanelProps) {
  const tc = passTextColors(draft.backgroundImageUrl ? null : draft.primaryColor, draft.foregroundColor, draft.labelColor);
  const [showBack, setShowBack] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  /** Kutu yüksekliği = aktif yüzün yüksekliği. Yüz değişince kutu da değişir, scroll yok. */
  useLayoutEffect(() => {
    const active = showBack ? backRef.current : frontRef.current;
    if (active && boxRef.current) boxRef.current.style.height = `${active.offsetHeight}px`;
  }, [showBack, draft, showStampStrip, previewFilled, previewRewardReady, walletLayout]);
  const filledBackFields = draft.backFields.filter((f) => f.value.trim() !== "");

  // Wallet (createPkPass ile aynı kurallar): logo varken üst yazı yalnızca açıkça girildiyse görünür
  const hasLogo = Boolean(draft.logoUrl || tenant.logoUrl);
  const explicitTopText = draft.logoText.trim();
  const topLeftText = hasLogo ? explicitTopText : explicitTopText || previewLogo;

  const stampValue = isMultiStampCombined
    ? `${totalPreviewFilled} / ${effectiveTotalSlots}`
    : `${previewFilled} / ${stampsRequired}`;
  const headerLabel = tenant.headerFieldLabel?.trim();
  const rewardValue = previewRewardReady
    ? tenant.rewardReadyText?.trim() || "Ödül hazır!"
    : rewardLabel;

  // Alt alanlar (pass'teki secondaryFields ile aynı sıra ve etiketler)
  const firstValue = showStampStrip
    ? stampValue
    : isCashbackCard
      ? `₺${previewBalanceTry}`
      : isPointCard
        ? previewFilled.toLocaleString("tr-TR")
        : String(previewFilled);
  const secondaryFields: { key: string; label: string; value: string }[] = [
    {
      key: "stamps",
      label: (draft.stampFieldLabel || (showStampStrip ? "DAMGA" : "BAKİYE")).toUpperCase(),
      value: firstValue,
    },
    {
      key: "reward",
      label: (draft.rewardFieldLabel || "ÖDÜL").toUpperCase(),
      value: rewardValue,
    },
    {
      key: "status",
      label: (draft.statusFieldLabel || "DURUM").toUpperCase(),
      value: previewStatus,
    },
  ];

  return (
    <SoftBox className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Wallet önizleme
        </p>
        <button
          type="button"
          className="rounded-md border border-[var(--line)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition"
          onClick={() => setShowBack((v) => !v)}
        >
          {showBack ? "🎨 Ön yüz" : "📝 Arka yüz"}
        </button>
      </div>

      {/* Kart: iki yüz üst üste, 3B çevrilir. Yükseklik en uzun yüze göre sabit. */}
      <div ref={boxRef} className="relative w-full transition-[height] duration-500 ease-out [perspective:1400px]">
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* Ön yüz — Apple storeCard düzeni: logo/üst yazı solda, header sağda, şerit, alanlar, barkod */}
          <div
            ref={frontRef}
            className="absolute inset-x-0 top-0 [backface-visibility:hidden]"
            aria-hidden={showBack}
          >
            <ApplePassFront
              background={
                draft.backgroundImageUrl
                  ? `url(${resolveAdminAssetUrl(draft.backgroundImageUrl)}) center/cover no-repeat`
                  : draft.primaryColor
              }
              fg={tc.fg}
              label={tc.label}
              logo={hasLogo ? resolveAdminAssetUrl(draft.logoUrl || tenant.logoUrl || "") : null}
              logoText={topLeftText}
              header={
                headerLabel
                  ? [
                      {
                        key: "h",
                        label: headerLabel.toUpperCase(),
                        value: isCashbackCard
                          ? `₺${previewBalanceTry}`
                          : isPointCard
                            ? previewFilled.toLocaleString("tr-TR")
                            : stampValue,
                      },
                    ]
                  : undefined
              }
              strip={
                showStampStrip ? (
                  draft.stripImageUrl ? (
                    <div className="relative overflow-hidden" style={{ aspectRatio: "375 / 123" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAdminAssetUrl(draft.stripImageUrl)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0">
                        <StampStripPreview
                          slotFilled={previewSlotFilled}
                          draft={draft}
                          filledUrl={effectiveFilledUrl}
                          emptyUrl={effectiveEmptyUrl}
                          segmentBoundaries={segmentBoundaries}
                          slotStyles={previewSlotStyles}
                          transparent
                        />
                      </div>
                    </div>
                  ) : (
                    <StampStripPreview
                      slotFilled={previewSlotFilled}
                      draft={draft}
                      filledUrl={effectiveFilledUrl}
                      emptyUrl={effectiveEmptyUrl}
                      segmentBoundaries={segmentBoundaries}
                      slotStyles={previewSlotStyles}
                    />
                  )
                ) : undefined
              }
              primary={
                showStampStrip
                  ? undefined
                  : {
                      label: (draft.stampFieldLabel || "BAKİYE").toUpperCase(),
                      value: firstValue,
                    }
              }
              fields={secondaryFields}
              barcode={<WalletBarcode format={barcodeFormat} width={150} />}
              altText={SAMPLE_ALT_TEXT}
            />
          </div>

          {/* Arka yüz — ön yüzle aynı hücrede, 180° çevrik */}
          <div
            ref={backRef}
            className="absolute inset-x-0 top-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={!showBack}
          >
            <div className="flex flex-col overflow-hidden rounded-2xl bg-[#f9f9f9] text-[#111827] shadow-lg">
              <div className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#888]">
                {programName} · Arka yüz
              </div>
              {filledBackFields.length === 0 ? (
                <div className="px-4 pb-5 text-sm text-[#4b5563]">
                  Henüz arka yüz alanı eklenmedi.
                </div>
              ) : (
                <ul className="divide-y divide-[#eee] px-4 pb-4">
                  {filledBackFields.map((field) => (
                    <li key={field.key} className="py-3">
                      <p className="text-[9px] uppercase tracking-wider text-[#888]">{field.label}</p>
                      <p className="mt-0.5 text-sm font-medium text-[#111827]">{field.value}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {!showBack && showStampStrip && (
        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-white/50 p-3">
          {isMultiStampCombined ? (
            groupPreviewItems.map((group) => {
              const filled = previewLaneFilled[group.groupId] ?? 0;
              return (
                <div key={group.groupId}>
                  <label className="text-xs text-[var(--muted)]">
                    {group.label}: {filled} dolu · {group.threshold - filled} boş
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={group.threshold}
                    value={filled}
                    onChange={(e) =>
                      setPreviewLaneFilled((prev) => ({
                        ...prev,
                        [group.groupId]: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full"
                  />
                </div>
              );
            })
          ) : (
            <div>
              <label className="text-xs text-[var(--muted)]">
                Dolu damga: {previewFilled} · Boş:{" "}
                {Math.max(stampsRequired - previewFilled, 0)}
                {previewRewardReady ? " · ödül hazır" : ""}
              </label>
              <input
                type="range"
                min={0}
                max={Math.min(stampsRequired, MAX_WALLET_STAMP_SLOTS)}
                value={previewFilled}
                onChange={(e) => setPreviewFilled(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={previewRewardReady}
              onChange={(e) => setPreviewRewardReady(e.target.checked)}
              className="rounded border-[var(--line)]"
            />
            Önizlemede ödül hazır göster
          </label>
        </div>
      )}

      {!showBack && !showStampStrip && (isCashbackCard || isPointCard) && (
        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-white/50 p-3">
          <label className="text-xs text-[var(--muted)]">
            {isCashbackCard ? "Bakiye önizlemesi" : "Puan önizlemesi"}:{" "}
            {isCashbackCard ? `₺${previewBalanceTry}` : previewFilled.toLocaleString("tr-TR")}
          </label>
          <input
            type="range"
            min={0}
            max={isCashbackCard ? 500 : 5000}
            step={isCashbackCard ? 5 : 50}
            value={previewFilled}
            onChange={(e) => setPreviewFilled(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {!showBack && isMultiStampCombined && walletLayout && (
        <p className="text-xs text-[var(--muted)]">
          Wallet şeridi: {walletLayout.totalSlots} damga (
          {walletLayout.segments.map((s) => `${s.label} ${s.threshold}`).join(" + ")}
          ). Maks. {MAX_WALLET_STAMP_SLOTS} damga / {walletLayout.segments.length} grup.
        </p>
      )}

      {!showBack && (
        <p className="text-xs text-[var(--muted)]">
          Önizleme kaydırıcıları sadece tasarım kontrolü içindir; kayıtta saklanmaz.
          Değişiklikler kaydedildikten sonra yeni Wallet indirmelerine yansır.
        </p>
      )}
    </SoftBox>
  );
}
