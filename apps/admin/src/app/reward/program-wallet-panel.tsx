"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MAX_WALLET_STAMP_SLOTS,
  buildMultiStampWalletLayoutForProgram,
  buildSlotStylesFromLayout,
  multiStampUsesCombinedStrip,
} from "@ngl/shared";
import {
  ErrorBanner,
  Panel,
  PanelHeader,
  btnGhost,
} from "../../components/ui";
import type { BarcodeFormat } from "./_panels/wallet-types";
import { BARCODE_OPTIONS } from "./_panels/wallet-types";
import { WalletDesignForm } from "./_panels/wallet-design-form";
import { WalletPreviewPanel } from "./_panels/wallet-preview-panel";
import {
  draftFromProgramWallet,
  enrichLayoutWithGroupStyles,
  isWalletEligibleProgram,
  walletTemplatePayload,
} from "./_panels/wallet-helpers";
import type {
  ProgramWalletDraft,
  TenantWalletDefaults,
} from "./_panels/wallet-types";
import type { MultiStampDraft } from "./multi-stamp-panel";

export type { ProgramWalletDraft, TenantWalletDefaults };
export {
  draftFromProgramWallet,
  isWalletEligibleProgram,
  walletTemplatePayload,
};

type ProgramWalletPanelProps = {
  programId: string;
  programType: string;
  programName: string;
  stampsRequired: number;
  rewardLabel: string;
  tenant: TenantWalletDefaults;
  draft: ProgramWalletDraft;
  onChange: (draft: ProgramWalletDraft) => void;
  multiStamp?: MultiStampDraft | null;
  onMultiStampChange?: (draft: MultiStampDraft) => void;
  barcodeFormat: BarcodeFormat;
  onBarcodeFormatChange: (f: BarcodeFormat) => void;
  /** Formda hangi bölüm gösterilsin */
  formSection?: "brand" | "stamps" | "fields" | "back";
  /**
   * Yerleşimi dışarıdan belirle (stüdyo görünümü): form ve önizleme aynı
   * state'i paylaşır ama sayfanın farklı yerlerine konabilir.
   */
  renderLayout?: (parts: {
    form: ReactNode;
    preview: ReactNode;
    error: ReactNode;
  }) => ReactNode;
};

export function ProgramWalletPanel({
  programId,
  programType,
  programName,
  stampsRequired,
  rewardLabel,
  tenant,
  draft,
  onChange,
  multiStamp,
  onMultiStampChange,
  renderLayout,
  barcodeFormat,
  onBarcodeFormatChange,
  formSection,
}: ProgramWalletPanelProps) {
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFilled, setPreviewFilled] = useState(
    Math.min(3, Math.max(stampsRequired, 1)),
  );
  const [previewRewardReady, setPreviewRewardReady] = useState(false);
  const [previewLaneFilled, setPreviewLaneFilled] = useState<
    Record<string, number>
  >({});

  const isMultiStampCombined =
    programType === "MULTI_STAMP" &&
    multiStamp != null &&
    multiStampUsesCombinedStrip(multiStamp.mode, {
      lanes: multiStamp.lanes,
      productGroups: multiStamp.productGroups,
    });

  const groupPreviewItems = useMemo(() => {
    if (!isMultiStampCombined || !multiStamp) return [];
    const groups =
      multiStamp.mode === "LANES"
        ? multiStamp.lanes.map((l) => ({ id: l.id, label: l.label }))
        : multiStamp.productGroups.map((g) => ({ id: g.id, label: g.label }));
    const tierThreshold =
      multiStamp.tiers[0]?.threshold ?? stampsRequired;
    return groups.map((group, index) => {
      const tier =
        multiStamp.tiers.find((t) => t.laneId === group.id) ??
        multiStamp.tiers[index] ??
        multiStamp.tiers[0];
      const threshold =
        multiStamp.mode === "LANES"
          ? (tier?.threshold ?? stampsRequired)
          : tierThreshold;
      return {
        groupId: group.id,
        label: group.label,
        threshold,
        rewardLabel: tier?.rewardLabel ?? rewardLabel,
      };
    });
  }, [isMultiStampCombined, multiStamp, stampsRequired, rewardLabel]);

  useEffect(() => {
    setPreviewFilled(Math.min(3, Math.max(stampsRequired, 1)));
    setPreviewRewardReady(false);
  }, [programType, programName, stampsRequired]);

  useEffect(() => {
    if (!isMultiStampCombined) return;
    setPreviewLaneFilled((prev) => {
      const next: Record<string, number> = {};
      for (const group of groupPreviewItems) {
        const threshold = group.threshold;
        next[group.groupId] = Math.min(
          prev[group.groupId] ?? Math.min(2, threshold),
          threshold,
        );
      }
      return next;
    });
  }, [isMultiStampCombined, groupPreviewItems]);

  const walletLayout = useMemo(() => {
    if (!isMultiStampCombined || !multiStamp) return null;
    const balances: Record<string, number> = {};
    for (const group of groupPreviewItems) {
      balances[group.groupId] = previewLaneFilled[group.groupId] ?? 0;
    }
    return buildMultiStampWalletLayoutForProgram(
      multiStamp.mode,
      {
        lanes: multiStamp.lanes,
        productGroups: multiStamp.productGroups,
      },
      multiStamp.tiers,
      { balances, fallbackThreshold: stampsRequired },
    );
  }, [
    isMultiStampCombined,
    multiStamp,
    groupPreviewItems,
    previewLaneFilled,
    stampsRequired,
  ]);

  const previewSlotFilled = useMemo(() => {
    if (walletLayout) return walletLayout.slotFilled;
    const total = Math.max(1, Math.min(stampsRequired, MAX_WALLET_STAMP_SLOTS));
    return Array.from({ length: total }, (_, i) => i < previewFilled);
  }, [walletLayout, stampsRequired, previewFilled]);

  const previewSlotStyles = useMemo(() => {
    if (!walletLayout) return undefined;
    const layout =
      isMultiStampCombined && multiStamp
        ? enrichLayoutWithGroupStyles(
            walletLayout,
            multiStamp,
            draft.stampTheme !== "CUSTOM" ? draft.stampTheme : "COFFEE",
          )
        : walletLayout;
    return buildSlotStylesFromLayout(layout, {
      stampTheme: draft.stampTheme !== "CUSTOM" ? draft.stampTheme : "COFFEE",
      ...(draft.stampTheme === "CUSTOM"
        ? {
            stampIconFilledUrl:
              draft.stampIconFilledUrl.trim() || tenant.stampIconFilledUrl,
            stampIconEmptyUrl:
              draft.stampIconEmptyUrl.trim() || tenant.stampIconEmptyUrl,
          }
        : {}),
    });
  }, [walletLayout, draft, tenant, isMultiStampCombined, multiStamp]);

  const segmentBoundaries = walletLayout?.segments
    .slice(1)
    .map((s) => s.startIndex);

  const effectiveTotalSlots = previewSlotFilled.length;

  if (!isWalletEligibleProgram(programType)) {
    return null;
  }

  const effectiveFilledUrl =
    draft.stampIconFilledUrl.trim() || tenant.stampIconFilledUrl;
  const effectiveEmptyUrl =
    draft.stampIconEmptyUrl.trim() || tenant.stampIconEmptyUrl;

  const previewLogo = draft.logoText.trim() || programName || tenant.name;
  const showStampStrip =
    programType === "STAMP_CARD" || programType === "MULTI_STAMP";
  const isCashbackCard = programType === "CASHBACK_CARD";
  const isPointCard = programType === "POINT_CARD";

  const previewBalanceTry = isCashbackCard
    ? `${(previewFilled * 10).toFixed(2).replace(".", ",")}`
    : null;

  const totalPreviewFilled = isMultiStampCombined
    ? walletLayout?.totalFilled ?? 0
    : previewFilled;

  const previewStatus = previewRewardReady
    ? tenant.rewardReadyText?.trim() || "Ödül hazır!"
    : isCashbackCard
      ? "Kasada kullanılabilir"
      : isMultiStampCombined
        ? `${walletLayout?.segments.length ?? 0} grup · ${totalPreviewFilled}/${effectiveTotalSlots}`
        : `${Math.max(stampsRequired - previewFilled, 0)} kaldı`;

  const formNode = (
    <>
        <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
          <p className="text-sm font-medium text-[var(--ink)]">Barkod türü</p>
          <p className="text-xs text-[var(--muted)]">Müşterinin telefonunda kartın altında görünür. Kasiyer bu kodu okutur.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kasada okutulacak kod">
            {BARCODE_OPTIONS.map((opt) => {
              const active = barcodeFormat === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onBarcodeFormatChange(opt.id)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${active ? "border-[var(--ink)] bg-[var(--surface)] ring-1 ring-[var(--ink)]/20" : "border-[var(--line)] hover:bg-[var(--surface)]"}`}
                >
                  <span className="block text-[0.8125rem] font-semibold text-[var(--ink)]">{opt.label}</span>
                  <span className="block text-[0.6875rem] text-[var(--muted)]">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
        <WalletDesignForm
          programId={programId}
          programName={programName}
          stampsRequired={stampsRequired}
          section={formSection}
          draft={draft}
          onChange={onChange}
          uploadBusy={uploadBusy}
          setUploadBusy={setUploadBusy}
          setUploadError={setUploadError}
          showStampStrip={showStampStrip}
          isMultiStampCombined={isMultiStampCombined}
          multiStamp={multiStamp}
          onMultiStampChange={onMultiStampChange}
          groupPreviewItems={groupPreviewItems}
          effectiveFilledUrl={effectiveFilledUrl}
          effectiveEmptyUrl={effectiveEmptyUrl}
        />
      </>
  );
  const previewNode = (
        <WalletPreviewPanel
          draft={draft}
          tenant={tenant}
          programName={programName}
          rewardLabel={rewardLabel}
          stampsRequired={stampsRequired}
          showStampStrip={showStampStrip}
          isCashbackCard={isCashbackCard}
          isPointCard={isPointCard}
          isMultiStampCombined={isMultiStampCombined}
          previewLogo={previewLogo}
          effectiveFilledUrl={effectiveFilledUrl}
          effectiveEmptyUrl={effectiveEmptyUrl}
          previewSlotFilled={previewSlotFilled}
          previewSlotStyles={previewSlotStyles}
          segmentBoundaries={segmentBoundaries}
          walletLayout={walletLayout}
          totalPreviewFilled={totalPreviewFilled}
          effectiveTotalSlots={effectiveTotalSlots}
          previewStatus={previewStatus}
          previewFilled={previewFilled}
          setPreviewFilled={setPreviewFilled}
          previewRewardReady={previewRewardReady}
          setPreviewRewardReady={setPreviewRewardReady}
          previewLaneFilled={previewLaneFilled}
          setPreviewLaneFilled={setPreviewLaneFilled}
          groupPreviewItems={groupPreviewItems}
          previewBalanceTry={previewBalanceTry}
          barcodeFormat={barcodeFormat}
        />
  );
  const errorNode = <ErrorBanner message={uploadError} />;

  if (renderLayout) {
    return <>{renderLayout({ form: formNode, preview: previewNode, error: errorNode })}</>;
  }

  return (
    <Panel>
      <PanelHeader
        title="Kartın görünümü"
        description="Müşterinin telefonunda görünen kart. Renkleri ve yazıları buradan değiştirirsin."
        action={
          <Link href="/settings/card" className={btnGhost()}>
            Marka varsayılanları
          </Link>
        }
      />

      <ErrorBanner message={uploadError} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        {formNode}
        {previewNode}
      </div>
    </Panel>
  );
}
