"use client";

import {
  computeStampGrid,
  type GroupStampStyle,
} from "@ngl/shared";
import { StampGlyph, type StampTheme } from "../../../components/stamp-glyph";
import { PREVIEW_PAD, type ProgramWalletDraft } from "./wallet-types";

export function StampStripPreview({
  slotFilled,
  draft,
  filledUrl,
  emptyUrl,
  segmentBoundaries,
  slotStyles,
  transparent = false,
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
  const grid = computeStampGrid(total);
  return (
    <div
      className="relative justify-items-center gap-x-1.5 gap-y-2 rounded-xl"
      style={{
        background: transparent ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.12)",
        backdropFilter: transparent ? "blur(2px)" : undefined,
        display: "grid",
        gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
        padding: transparent ? "0.4rem 0.6rem" : "0.75rem",
      }}
    >
      {slotFilled.map((filled, i) => {
        const style = slotStyles?.[i];
        const theme = (style?.stampTheme ?? draft.stampTheme) as StampTheme;
        const useCustomIcons = theme === "CUSTOM";
        return (
          <StampGlyph
            key={i}
            theme={theme}
            filled={filled}
            color={draft.foregroundColor}
            filledUrl={
              useCustomIcons
                ? style?.stampIconFilledUrl ?? filledUrl
                : undefined
            }
            emptyUrl={
              useCustomIcons ? style?.stampIconEmptyUrl ?? emptyUrl : undefined
            }
          />
        );
      })}
    </div>
  );
}
