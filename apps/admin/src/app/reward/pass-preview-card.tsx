"use client";

import { resolveAdminAssetUrl } from "../../lib/public-urls";
import { passTextColors } from "../../lib/wallet-text";
import { ApplePassFront } from "./_panels/apple-pass-front";
import { StampStripPreview } from "./_panels/stamp-strip-preview";
import { WalletBarcode } from "./_panels/wallet-barcode";
import { draftFromProgramWallet } from "./_panels/wallet-helpers";
import type { BarcodeFormat, TenantWalletDefaults } from "./_panels/wallet-types";
import { programTypeLabel, type ProgramCard } from "./program-cards-hub";

const STAMP_TYPES = new Set(["STAMP_CARD", "MULTI_STAMP"]);

/** Kartın Wallet'taki ön yüzüne benzeyen önizleme (galeri için). */
export function PassPreviewCard({
  program,
  tenant,
  barcodeFormat,
}: {
  program: ProgramCard & { config?: Record<string, unknown> };
  tenant: TenantWalletDefaults;
  barcodeFormat: BarcodeFormat;
}) {
  const draft = draftFromProgramWallet(program.config, tenant, program.name);
  const tc = passTextColors(draft.backgroundImageUrl ? null : draft.primaryColor, draft.foregroundColor, draft.labelColor);
  const tier = program.tiers[0];
  const isStamp = STAMP_TYPES.has(program.type);
  const total = Math.min(Math.max(tier?.threshold ?? 6, 1), 20);
  const filled = Math.floor(total / 2);
  const slotFilled = Array.from({ length: total }, (_, i) => i < filled);
  const reward = tier?.rewardLabel ?? programTypeLabel(program.type);
  const logo = draft.logoUrl || tenant.logoUrl;
  const topText = logo ? draft.logoText.trim() : draft.logoText.trim() || program.name;

  const fields = isStamp
    ? [
        { k: "s", label: (draft.stampFieldLabel || "DAMGA").toUpperCase(), value: `${filled} / ${total}` },
        { k: "r", label: (draft.rewardFieldLabel || "ÖDÜL").toUpperCase(), value: reward },
      ]
    : [
        { k: "t", label: "KART", value: programTypeLabel(program.type) },
        { k: "r", label: (draft.rewardFieldLabel || "ÖDÜL").toUpperCase(), value: reward },
      ];

  return (
    <ApplePassFront
      background={
        draft.backgroundImageUrl
          ? `url(${resolveAdminAssetUrl(draft.backgroundImageUrl)}) center/cover no-repeat`
          : draft.primaryColor
      }
      fg={tc.fg}
      label={tc.label}
      logo={logo ? resolveAdminAssetUrl(logo) : null}
      logoText={topText}
      header={
        tenant.headerFieldLabel?.trim() && isStamp
          ? [{ key: "h", label: tenant.headerFieldLabel.trim().toUpperCase(), value: `${filled} / ${total}` }]
          : undefined
      }
      strip={
        isStamp ? (
          <StampStripPreview
            slotFilled={slotFilled}
            draft={draft}
            filledUrl={draft.stampIconFilledUrl || null}
            emptyUrl={draft.stampIconEmptyUrl || null}
          />
        ) : undefined
      }
      primary={isStamp ? undefined : { label: programTypeLabel(program.type).toUpperCase(), value: "0" }}
      fields={fields.map((f) => ({ key: f.k, label: f.label, value: f.value }))}
      barcode={<WalletBarcode format={barcodeFormat} width={130} />}
      altText="769248"
    />
  );
}
