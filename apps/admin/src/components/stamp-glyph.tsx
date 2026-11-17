"use client";

import { resolveAdminAssetUrl } from "../lib/public-urls";
import {
  STAMP_THEME_OPTIONS,
  resolveStampIconSrc,
  type StampThemeId,
} from "@ngl/shared";

export type StampTheme = StampThemeId;

export const STAMP_THEMES = [
  ...STAMP_THEME_OPTIONS,
  { id: "CUSTOM" as const, label: "Özel", emoji: "🖼️", hint: "Kendi ikon yükle" },
];

type StampGlyphProps = {
  theme: StampTheme;
  filled: boolean;
  color: string;
  filledUrl?: string | null;
  emptyUrl?: string | null;
  size?: number;
};

export function StampGlyph({
  theme,
  filled,
  color,
  filledUrl,
  emptyUrl,
  size = 28,
}: StampGlyphProps) {
  const iconOverrides =
    theme === "CUSTOM" ? { filledUrl, emptyUrl } : undefined;
  const src = resolveStampIconSrc(theme, filled, iconOverrides);
  if (src) {
    // Yüklenen görseller API'nin medya adresinden gelir; admin üzerinden (/backend/media) çözülür
    const url = resolveAdminAssetUrl(src) || src;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        style={{
          width: size,
          height: size,
          opacity:
            theme === "CUSTOM" && !filled && !emptyUrl && filledUrl ? 0.35 : 1,
        }}
      />
    );
  }

  const opacity = filled ? 1 : 0.32;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64" as const,
  };

  if (theme === "STAR") {
    return (
      <svg {...common} style={{ opacity }}>
        <path
          d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
      </svg>
    );
  }
  if (theme === "HEART") {
    return (
      <svg {...common} style={{ opacity }}>
        <path
          d="M32 50 C32 50 12 36 12 24 C12 16 18 12 24 12 C28 12 31 14 32 18 C33 14 36 12 40 12 C46 12 52 16 52 24 C52 36 32 50 32 50 Z"
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth="3"
        />
      </svg>
    );
  }
  return (
    <svg {...common} style={{ opacity }}>
      <path
        d="M20 48 L20 28 C20 18 26 12 32 12 C38 12 44 18 44 28 L44 48"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth="3"
      />
      <path d="M16 48 L48 48" stroke={color} strokeWidth="3" />
    </svg>
  );
}
