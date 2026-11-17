"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  MAX_WALLET_STAMP_SLOTS,
  type GroupStampStyle,
  type MultiStampWalletLayout,
} from "@ngl/shared";
import { SoftBox } from "../../../components/ui";
import { resolveAdminAssetUrl } from "../../../lib/public-urls";
import { StampStripPreview } from "./stamp-strip-preview";
import { WalletBarcode } from "./wallet-barcode";
import type {
  BarcodeFormat,
  GroupPreviewItem,
  ProgramWalletDraft,
  TenantWalletDefaults,
} from "./wallet-types";

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

import { useLayoutEffect, useRef } from "react";
import { passTextColors } from "../../../lib/wallet-text";

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
          {/* Ön yüz */}
          <div
            ref={frontRef}
            className="absolute inset-x-0 top-0 [backface-visibility:hidden]"
            aria-hidden={showBack}
          >
            <div
              className="flex flex-col overflow-hidden rounded-2xl shadow-lg"
              style={{
                background: draft.backgroundImageUrl
                  ? `url(${resolveAdminAssetUrl(draft.backgroundImageUrl)}) center/cover no-repeat`
                  : draft.primaryColor,
                color: tc.fg,
              }}
            >
              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div className="flex min-w-0 items-center gap-3">
                  {draft.logoUrl || tenant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveAdminAssetUrl(draft.logoUrl || tenant.logoUrl || "")}
                      alt=""
                      className="h-8 w-16 object-contain"
                    />
                  ) : (
                    <p
                      className="truncate text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: tc.label }}
                    >
                      {previewLogo}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: tc.label }}>
                    {programName}
                  </p>
                </div>
              </div>

              {showStampStrip ? (
                <div className="mt-2 space-y-2 px-4">
                  {isMultiStampCombined && walletLayout && (
                    <div className="flex flex-wrap gap-2">
                      {walletLayout.segments.map((seg) => (
                        <span
                          key={seg.laneId}
                          className="rounded-md bg-black/15 px-2 py-0.5 text-[9px] uppercase tracking-wide"
                          style={{ color: tc.label }}
                        >
                          {seg.label} {seg.filled}/{seg.threshold}
                        </span>
                      ))}
                    </div>
                  )}
                  {draft.stripImageUrl ? (
                    // Özel şerit: görsel tam genişlikte, damgalar onun üstünde (Wallet'taki gibi)
                    <div className="relative -mx-4 overflow-hidden" style={{ aspectRatio: "375 / 123" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAdminAssetUrl(draft.stripImageUrl)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center px-4">
                        <div className="w-full rounded-lg">
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
                  )}
                </div>
              ) : (
                <div className="mx-3 mt-2 rounded-xl bg-black/10 px-3 py-3 text-center">
                  <p className="text-2xl font-semibold tabular-nums">
                    {isCashbackCard
                      ? `₺${previewBalanceTry}`
                      : isPointCard
                        ? previewFilled.toLocaleString("tr-TR")
                        : previewFilled}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider" style={{ color: tc.label }}>
                    {draft.stampFieldLabel || "BAKİYE"}
                  </p>
                </div>
              )}

              <div className="mt-auto grid grid-cols-3 gap-1.5 px-4 pb-2 pt-2">
                <div>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: tc.label }}>
                    {draft.stampFieldLabel}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {showStampStrip
                      ? isMultiStampCombined
                        ? `${totalPreviewFilled}/${effectiveTotalSlots}`
                        : `${previewFilled}/${stampsRequired}`
                      : isCashbackCard
                        ? `₺${previewBalanceTry}`
                        : isPointCard
                          ? previewFilled.toLocaleString("tr-TR")
                          : String(previewFilled)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: tc.label }}>
                    {draft.rewardFieldLabel}
                  </p>
                  <p className="truncate text-sm font-semibold">{rewardLabel}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: tc.label }}>
                    {draft.statusFieldLabel}
                  </p>
                  <p className="truncate text-sm font-semibold">{previewStatus}</p>
                </div>
              </div>
              {/* Barkod — kullanıcının seçtiği format */}
              <div className="mx-4 mb-3 grid place-items-center rounded-md bg-[var(--panel)] p-1.5">
                <WalletBarcode format={barcodeFormat} width={150} />
              </div>
            </div>
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
