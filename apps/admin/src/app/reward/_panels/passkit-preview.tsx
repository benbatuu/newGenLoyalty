"use client";

import { useState } from "react";
import { resolveAdminAssetUrl } from "../../../lib/public-urls";
import { passTextColors } from "../../../lib/wallet-text";
import { ApplePassFront } from "./apple-pass-front";
import { StampStripPreview } from "./stamp-strip-preview";
import { WalletBarcode } from "./wallet-barcode";
import type { ProgramWalletDraft, TenantWalletDefaults, BarcodeFormat } from "./wallet-types";

/** Kart detayı: Apple Wallet ön / arka yüz önizlemesi (tüm PassKit alanlarıyla) */
export function PassKitPreview({
  draft,
  tenant,
  barcodeFormat,
  side,
  isStamp,
  stampsRequired,
  filled,
  rewardLabel,
  statusText,
  programName,
}: {
  draft: ProgramWalletDraft;
  tenant: TenantWalletDefaults;
  barcodeFormat?: BarcodeFormat;
  side: "front" | "back";
  isStamp: boolean;
  stampsRequired: number;
  filled: number;
  rewardLabel: string;
  statusText: string;
  programName: string;
}) {
  const tc = passTextColors(draft.backgroundImageUrl ? null : draft.primaryColor, draft.foregroundColor, draft.labelColor);

  if (side === "back") {
    const items = draft.backFields.filter((f) => f.value.trim());
    return (
      <div className="w-full overflow-hidden rounded-[14px] bg-[#f2f2f7] text-[#111] shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
        <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
          {programName}
        </p>
        {items.length === 0 ? (
          <p className="px-4 pb-6 pt-3 text-[15px] text-[#6b7280]">Arka yüz alanı eklenmedi.</p>
        ) : (
          <ul className="divide-y divide-[#d1d1d6] px-4 pb-3">
            {items.map((f) => (
              <li key={f.key} className="py-3">
                <p className="text-[11px] uppercase tracking-wide text-[#8e8e93]">{f.label}</p>
                <p className="text-[15px]">{f.value}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const hasLogo = Boolean(draft.logoUrl || tenant.logoUrl);
  const explicitText = draft.logoText.trim();
  const topText = hasLogo ? explicitText : explicitText || programName;
  const headerValue = isStamp ? `${filled}/${stampsRequired}` : "0";
  const header = [
    ...(tenant.headerFieldLabel?.trim()
      ? [{ key: "h0", label: tenant.headerFieldLabel.trim().toUpperCase(), value: headerValue }]
      : []),
    ...draft.headerFields
      .filter((f) => f.label.trim() && f.value.trim())
      .map((f, i) => ({ key: `h${i + 1}`, label: f.label.trim().toUpperCase(), value: f.value.trim() })),
  ].slice(0, 2);

  const fields = [
    {
      key: "s",
      label: (draft.stampFieldLabel || (isStamp ? "DAMGA" : "BAKİYE")).toUpperCase(),
      value: isStamp ? `${filled} / ${stampsRequired}` : "0",
    },
    { key: "r", label: (draft.rewardFieldLabel || "ÖDÜL").toUpperCase(), value: rewardLabel },
    { key: "d", label: (draft.statusFieldLabel || "DURUM").toUpperCase(), value: statusText },
  ];
  // Yardımcı (aux) alanlar gösterilmiyor; wallet ile aynı
  const aux: { key: string; label: string; value: string }[] = [];

  const format = (barcodeFormat || draft.barcodeFormat || tenant.barcodeFormat || "QR") as BarcodeFormat;
  const altText =
    draft.barcodeAltMode === "NONE" ? "" : draft.barcodeAltMode === "CUSTOM" ? draft.barcodeAltText : "769248";
  const slotFilled = Array.from({ length: stampsRequired }, (_, i) => i < filled);
  const expires = draft.expirationDate
    ? `Geçerlilik: ${new Date(draft.expirationDate).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}`
    : undefined;

  return (
    <ApplePassFront
      background={
        draft.backgroundImageUrl
          ? `url(${resolveAdminAssetUrl(draft.backgroundImageUrl)}) center/cover no-repeat`
          : draft.primaryColor
      }
      fg={tc.fg}
      label={tc.label}
      logo={hasLogo ? resolveAdminAssetUrl(draft.logoUrl || tenant.logoUrl || "") : null}
      logoText={topText}
      header={header}
      strip={
        isStamp ? (
          draft.stripImageUrl ? (
            <div className="relative overflow-hidden" style={{ aspectRatio: "375 / 123" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveAdminAssetUrl(draft.stripImageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0">
                <StampStripPreview slotFilled={slotFilled} draft={draft} filledUrl={draft.stampIconFilledUrl || null} emptyUrl={draft.stampIconEmptyUrl || null} transparent />
              </div>
            </div>
          ) : (
            <StampStripPreview slotFilled={slotFilled} draft={draft} filledUrl={draft.stampIconFilledUrl || null} emptyUrl={draft.stampIconEmptyUrl || null} />
          )
        ) : undefined
      }
      primary={isStamp ? undefined : { label: (draft.stampFieldLabel || "BAKİYE").toUpperCase(), value: "0" }}
      fields={fields}
      aux={aux}
      barcode={draft.showBarcode ? <WalletBarcode format={format} width={150} /> : undefined}
      altText={altText}
      expiresText={expires}
    />
  );
}

/** Sabit önizleme paneli: Ön/Arka seçici, dolu damga kaydırıcısı ve Apple Wallet kartı */
export function ApplePreviewPane({
  draft,
  tenant,
  barcodeFormat,
  isStamp,
  stampsRequired,
  rewardLabel,
  remainingTemplate,
  programName,
}: {
  draft: ProgramWalletDraft;
  tenant: TenantWalletDefaults;
  barcodeFormat?: BarcodeFormat;
  isStamp: boolean;
  stampsRequired: number;
  rewardLabel: string;
  remainingTemplate: string;
  programName: string;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [picked, setPicked] = useState<number | null>(null);
  const total = Math.min(Math.max(stampsRequired, 1), 20);
  const filled = Math.min(picked ?? Math.ceil(total / 2), total);
  const statusText = (remainingTemplate || "{remaining} damga kaldı").replace(
    /\{remaining\}/gi,
    String(Math.max(total - filled, 0)),
  );
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Apple Wallet</p>
        <div className="flex rounded-lg border border-[var(--line)] p-0.5 text-xs" role="group" aria-label="Kart yüzü">
          {(["front", "back"] as const).map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={side === x}
              onClick={() => setSide(x)}
              className={`min-h-[32px] rounded-md px-3 ${side === x ? "bg-[var(--panel)] font-medium shadow-sm" : "text-[var(--muted)]"}`}
            >
              {x === "front" ? "Ön" : "Arka"}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[340px]">
        <PassKitPreview
          draft={draft}
          tenant={tenant}
          barcodeFormat={barcodeFormat}
          side={side}
          isStamp={isStamp}
          stampsRequired={total}
          filled={filled}
          rewardLabel={rewardLabel}
          statusText={statusText}
          programName={programName}
        />
      </div>
      {isStamp && side === "front" && (
        <label className="block text-xs text-[var(--muted)]">
          Önizlemedeki dolu damga: {filled} / {total}
          <input
            type="range"
            min={0}
            max={total}
            value={filled}
            onChange={(e) => setPicked(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      )}
      <p className="text-[11px] text-[var(--muted)]">
        Önizleme Wallet düzenine göre çizilir; fontlar ve ince ölçüler iOS sürümüne göre küçük farklar gösterebilir.
      </p>
    </div>
  );
}
