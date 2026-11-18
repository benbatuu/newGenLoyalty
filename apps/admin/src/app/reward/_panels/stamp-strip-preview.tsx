"use client";

import {
  WALLET_STRIP_H,
  WALLET_STRIP_W,
  type GroupStampStyle,
} from "@ngl/shared";
import { StampGlyph, type StampTheme } from "../../../components/stamp-glyph";
import { stampLayoutForDraft } from "./wallet-helpers";
import type { ProgramWalletDraft } from "./wallet-types";

/**
 * Wallet damga şeridinin önizlemesi. Konumlar sunucudaki pass-art ile aynı
 * (@ngl/shared computeWalletStampPositions) — 750×246 uzayı yüzdeye çevrilir.
 */
export function StampStripPreview({
  slotFilled,
  draft,
  filledUrl,
  emptyUrl,
  slotStyles,
}: {
  slotFilled: boolean[];
  draft: ProgramWalletDraft;
  filledUrl: string | null;
  emptyUrl: string | null;
  segmentBoundaries?: number[];
  slotStyles?: GroupStampStyle[];
  transparent?: boolean;
}) {
  const total = slotFilled.length;
  if (total === 0) return null;
  const { positions } = stampLayoutForDraft(draft, total);

  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: `${WALLET_STRIP_W} / ${WALLET_STRIP_H}`,
      }}
    >
      {slotFilled.map((filled, i) => {
        const style = slotStyles?.[i];
        const pos = positions[i];
        if (!pos) return null;
        const theme = (style?.stampTheme ?? draft.stampTheme) as StampTheme;
        const useCustomIcons = theme === "CUSTOM";
        return (
          <div
            key={i}
            className="absolute [&_img]:!h-full [&_img]:!w-full [&_svg]:!h-full [&_svg]:!w-full"
            style={{
              left: `${(pos.x / WALLET_STRIP_W) * 100}%`,
              top: `${(pos.y / WALLET_STRIP_H) * 100}%`,
              width: `${(pos.iconSize / WALLET_STRIP_W) * 100}%`,
              aspectRatio: "1 / 1",
              zIndex: pos.z,
            }}
          >
            <StampGlyph
              theme={theme}
              filled={filled}
              color={draft.foregroundColor}
              size={pos.iconSize}
              filledUrl={
                useCustomIcons
                  ? style?.stampIconFilledUrl ?? filledUrl
                  : undefined
              }
              emptyUrl={
                useCustomIcons ? style?.stampIconEmptyUrl ?? emptyUrl : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
