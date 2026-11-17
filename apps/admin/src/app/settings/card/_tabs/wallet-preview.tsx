"use client";

import { Panel } from "../../../../components/ui";
import { resolveAdminAssetUrl } from "../../../../lib/public-urls";
import { StampGlyph, type StampTheme } from "../../../../components/stamp-glyph";
import { BarcodePreview } from "./barcode-preview";
import { PREVIEW_PAD, type BarcodeFormat, type StampInset } from "./types";
import { passTextColors } from "../../../../lib/wallet-text";

type WalletPreviewProps = {
  previewSide: "front" | "back" | "notify";
  setPreviewSide: (v: "front" | "back" | "notify") => void;
  primaryColor: string;
  foregroundColor: string;
  labelColor: string;
  logoUrl: string;
  previewLogo: string;
  headerFieldLabel: string;
  previewFilled: number;
  stampsRequired: number;
  stampGrid: { cols: number; rows: number };
  stampInset: StampInset;
  stampTheme: StampTheme;
  stampIconFilledUrl: string;
  stampIconEmptyUrl: string;
  showStampField: boolean;
  showRewardField: boolean;
  showStatusField: boolean;
  showBroadcastField: boolean;
  previewStampLabel: string;
  previewRewardLabel: string;
  previewStatusLabel: string;
  previewBroadcastLabel: string;
  previewBroadcastEmpty: string;
  rewardLabel: string;
  previewStatus: string;
  barcodeFormat: BarcodeFormat;
  backPreviewItems: { label: string; value: string }[];
  name: string;
  notifyIconUrl: string;
  notifyPreviewText: string;
  previewNotifyKind: "stamp" | "reward" | "status" | "header";
  setPreviewNotifyKind: (v: "stamp" | "reward" | "status" | "header") => void;
  rewardReady: boolean;
  setPreviewFilled: (v: number) => void;
};

export function WalletPreview({
  previewSide,
  setPreviewSide,
  primaryColor,
  foregroundColor,
  labelColor,
  logoUrl,
  previewLogo,
  headerFieldLabel,
  previewFilled,
  stampsRequired,
  stampGrid,
  stampInset,
  stampTheme,
  stampIconFilledUrl,
  stampIconEmptyUrl,
  showStampField,
  showRewardField,
  showStatusField,
  showBroadcastField,
  previewStampLabel,
  previewRewardLabel,
  previewStatusLabel,
  previewBroadcastLabel,
  previewBroadcastEmpty,
  rewardLabel,
  previewStatus,
  barcodeFormat,
  backPreviewItems,
  name,
  notifyIconUrl,
  notifyPreviewText,
  previewNotifyKind,
  setPreviewNotifyKind,
  rewardReady,
  setPreviewFilled,
}: WalletPreviewProps) {
  const tc = passTextColors(primaryColor, foregroundColor, labelColor);
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <Panel>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            Canlı önizleme
          </h2>
          <div className="flex rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-md px-2.5 py-1.5 font-medium transition ${previewSide === "front" ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
              onClick={() => setPreviewSide("front")}
            >
              Ön
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1.5 font-medium transition ${previewSide === "back" ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
              onClick={() => setPreviewSide("back")}
            >
              Arka
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1.5 font-medium transition ${previewSide === "notify" ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
              onClick={() => setPreviewSide("notify")}
            >
              Bildirim
            </button>
          </div>
        </div>

        {previewSide === "front" ? (
          <div
            className="overflow-hidden rounded-2xl shadow-lg"
            style={{ background: primaryColor, color: tc.fg }}
          >
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveAdminAssetUrl(logoUrl)}
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
              {headerFieldLabel.trim() ? (
                <div className="shrink-0 text-right">
                  <p
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: tc.label }}
                  >
                    {headerFieldLabel.trim()}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {previewFilled}/{stampsRequired}
                  </p>
                </div>
              ) : null}
            </div>

            <div
              className="mx-3 mt-3 justify-items-center gap-x-1.5 gap-y-2 rounded-xl"
              style={{
                background: "rgba(0,0,0,0.12)",
                display: "grid",
                gridTemplateColumns: `repeat(${stampGrid.cols}, minmax(0, 1fr))`,
                padding: PREVIEW_PAD[stampInset] || PREVIEW_PAD.NORMAL,
              }}
            >
              {Array.from({ length: Math.min(stampsRequired, 16) }).map(
                (_, i) => (
                  <StampGlyph
                    key={i}
                    theme={stampTheme}
                    filled={i < previewFilled}
                    color={tc.fg}
                    filledUrl={
                      stampTheme === "CUSTOM" ? stampIconFilledUrl : undefined
                    }
                    emptyUrl={
                      stampTheme === "CUSTOM" ? stampIconEmptyUrl : undefined
                    }
                  />
                ),
              )}
            </div>

            <div className="px-4 pb-4 pt-3">
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${
                    [
                      showStampField,
                      showRewardField,
                      showStatusField,
                      showBroadcastField,
                    ].filter(Boolean).length || 1
                  }, minmax(0, 1fr))`,
                }}
              >
                {showStampField ? (
                  <div>
                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{ color: tc.label }}
                    >
                      {previewStampLabel}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {previewFilled}/{stampsRequired}
                    </p>
                  </div>
                ) : null}
                {showRewardField ? (
                  <div>
                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{ color: tc.label }}
                    >
                      {previewRewardLabel}
                    </p>
                    <p className="text-xs font-medium leading-snug">
                      {rewardLabel}
                    </p>
                  </div>
                ) : null}
                {showStatusField ? (
                  <div>
                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{ color: tc.label }}
                    >
                      {previewStatusLabel}
                    </p>
                    <p className="text-xs font-medium leading-snug">
                      {previewStatus}
                    </p>
                  </div>
                ) : null}
                {showBroadcastField ? (
                  <div>
                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{ color: tc.label }}
                    >
                      {previewBroadcastLabel}
                    </p>
                    <p className="text-xs font-medium leading-snug">
                      {previewBroadcastEmpty}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex flex-col items-center gap-1">
                <BarcodePreview format={barcodeFormat} />
                <p className="text-[10px] opacity-70">{barcodeFormat}</p>
              </div>
            </div>
          </div>
        ) : previewSide === "back" ? (
          <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm">
            {backPreviewItems.map((item, idx) => (
              <div key={`${item.label}-${idx}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {item.label}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[var(--surface)] to-[var(--panel)] border border-[var(--line)] p-4 text-[var(--ink)] shadow-[var(--shadow-md)]">
              <p className="mb-3 text-center text-[10px] font-medium tracking-wide text-white/50">
                Kilit ekranı
              </p>
              <div className="rounded-2xl bg-[var(--panel)]/10 p-3 backdrop-blur">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                    style={{ background: primaryColor }}
                  >
                    {notifyIconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAdminAssetUrl(notifyIconUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAdminAssetUrl(logoUrl)}
                        alt=""
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-white/80">
                        {(name || "K").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">
                        {name || "Kafe"}
                      </p>
                      <span className="shrink-0 text-[11px] text-white/45">
                        şimdi
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-white/85">
                      {notifyPreviewText}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-white/40">
                Wallet pass güncelleme bildirimi
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "stamp" as const, label: "Damga" },
                  { id: "reward" as const, label: "Ödül" },
                  { id: "status" as const, label: "Durum" },
                  ...(headerFieldLabel.trim()
                    ? [{ id: "header" as const, label: "Header" }]
                    : []),
                ] as { id: typeof previewNotifyKind; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreviewNotifyKind(opt.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    previewNotifyKind === opt.id
                      ? "border-[var(--ink)] bg-[var(--accent)] text-white"
                      : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              İkon ve metin canlı güncellenir. Damga kaydırıcısı örnek
              değerdeki sayıyı değiştirir.
            </p>
          </div>
        )}

        <div className="mt-3">
          <label className="text-xs text-[var(--muted)]">
            Önizleme dolu damga: {previewFilled}
            {rewardReady ? " · ödül hazır" : ""}
          </label>
          <input
            type="range"
            min={0}
            max={stampsRequired}
            value={previewFilled}
            onChange={(e) => setPreviewFilled(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Değişiklikler anında önizlenir. Kaydetince tüm müşteri Wallet
          kartları güncellenir.
        </p>
      </Panel>
    </aside>
  );
}
