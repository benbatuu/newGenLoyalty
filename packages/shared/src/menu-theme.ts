export const MENU_THEME_PRESETS = ["editorial", "catalog", "showcase"] as const;
export type MenuThemePreset = (typeof MENU_THEME_PRESETS)[number];

export const MENU_NAV_MODES = ["grid", "chips", "sidebar"] as const;
export type MenuNavMode = (typeof MENU_NAV_MODES)[number];

export const MENU_CARD_LAYOUTS = ["compact", "card", "split", "imageFirst"] as const;
export type MenuCardLayout = (typeof MENU_CARD_LAYOUTS)[number];

export const MENU_HERO_ALIGNS = ["left", "center"] as const;
export type MenuHeroAlign = (typeof MENU_HERO_ALIGNS)[number];

export const MENU_SURFACE_STYLES = ["paper", "ink", "linen"] as const;
export type MenuSurfaceStyle = (typeof MENU_SURFACE_STYLES)[number];

export const MENU_RADII = ["sharp", "soft", "round"] as const;
export type MenuRadius = (typeof MENU_RADII)[number];

export const MENU_FONT_PAIRS = ["serif", "sans", "display", "mono", "grotesk", "rounded"] as const;
export type MenuFontPair = (typeof MENU_FONT_PAIRS)[number];

export const MENU_DENSITIES = ["compact", "regular", "relaxed"] as const;
export type MenuDensity = (typeof MENU_DENSITIES)[number];

export const MENU_SHADOWS = ["none", "soft", "lift"] as const;
export type MenuShadowLevel = (typeof MENU_SHADOWS)[number];

export const MENU_CONTAINER_WIDTHS = ["narrow", "medium", "wide"] as const;
export type MenuContainerWidth = (typeof MENU_CONTAINER_WIDTHS)[number];

export const MENU_SECTION_SPACINGS = ["tight", "regular", "loose"] as const;
export type MenuSectionSpacing = (typeof MENU_SECTION_SPACINGS)[number];

export type MenuThemeHeroConfig = {
  showLogo: boolean;
  showCover: boolean;
  showTableLabel: boolean;
  align: MenuHeroAlign;
};

export type MenuThemeCategoryNavConfig = {
  mode: MenuNavMode;
  showImages: boolean;
  columnsMobile: number;
  columnsDesktop: number;
};

export type MenuThemeProductCardConfig = {
  layout: MenuCardLayout;
  showImages: boolean;
  showBadges: boolean;
  showCalories: boolean;
  showPrepTime: boolean;
  showVariantsCollapsed: boolean;
};

export type MenuThemeStyleConfig = {
  primaryColor: string;
  accentColor: string;
  surfaceStyle: MenuSurfaceStyle;
  radius: MenuRadius;
  fontPair: MenuFontPair;
  density: MenuDensity;
  shadowLevel: MenuShadowLevel;
};

export type MenuThemePageConfig = {
  containerWidth: MenuContainerWidth;
  sectionSpacing: MenuSectionSpacing;
  stickyCategoryNav: boolean;
  showFooterBranding: boolean;
};

export type MenuThemeConfig = {
  hero: MenuThemeHeroConfig;
  categoryNav: MenuThemeCategoryNavConfig;
  productCard: MenuThemeProductCardConfig;
  style: MenuThemeStyleConfig;
  page: MenuThemePageConfig;
};

export type MenuThemeState = {
  preset: MenuThemePreset;
  config: MenuThemeConfig;
};

export const MENU_THEME_META: Record<
  MenuThemePreset,
  { labelTr: string; hintTr: string }
> = {
  editorial: {
    labelTr: "Editorial",
    hintTr: "Tipografi ağırlıklı, sade ve prestijli kafe menüsü.",
  },
  catalog: {
    labelTr: "Katalog",
    hintTr: "Kategori görselleri önde, kart bazlı keşif.",
  },
  showcase: {
    labelTr: "Vitrin",
    hintTr: "Büyük hero ve görsel ürün sunumu.",
  },
};

const HEX = /^#([0-9a-fA-F]{6})$/;

function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isHex(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

export function contrastOn(hex: string): "#111111" | "#f7f4ef" {
  return relativeLuminance(hex) > 0.45 ? "#111111" : "#f7f4ef";
}

export function ensureReadableAccent(
  color: string,
  surface: string,
  fallback: string,
): string {
  if (!isHex(color)) return fallback;
  return contrastRatio(color, surface) >= 2.4 ? color : fallback;
}

export function surfacePalette(style: MenuSurfaceStyle): {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  line: string;
} {
  if (style === "ink") {
    return {
      bg: "#12110f",
      panel: "#1c1a17",
      ink: "#f4efe6",
      muted: "#b7aea0",
      line: "#2d2923",
    };
  }
  if (style === "linen") {
    return {
      bg: "#efe6d6",
      panel: "#f7f1e6",
      ink: "#2a2118",
      muted: "#6f6254",
      line: "#d8cbb6",
    };
  }
  return {
    bg: "#f6f3ee",
    panel: "#fffdf9",
    ink: "#1b1916",
    muted: "#6b645b",
    line: "#e4ddd3",
  };
}

export function defaultThemeConfig(
  preset: MenuThemePreset,
  brandColor?: string | null,
): MenuThemeConfig {
  const primary = isHex(brandColor ?? "") ? brandColor! : "#1b1916";
  const accent =
    preset === "catalog" ? "#c45c26" : preset === "showcase" ? "#8b3d4d" : "#2f5d50";

  const base: MenuThemeConfig = {
    hero: {
      showLogo: true,
      showCover: preset === "showcase",
      showTableLabel: true,
      align: preset === "showcase" ? "center" : "left",
    },
    categoryNav: {
      mode: preset === "showcase" ? "chips" : "grid",
      showImages: preset !== "editorial",
      columnsMobile: 2,
      columnsDesktop: preset === "catalog" ? 4 : 3,
    },
    productCard: {
      layout:
        preset === "showcase"
          ? "imageFirst"
          : preset === "catalog"
            ? "card"
            : "split",
      showImages: true,
      showBadges: true,
      showCalories: true,
      showPrepTime: preset !== "editorial",
      showVariantsCollapsed: true,
    },
    style: {
      primaryColor: primary,
      accentColor: accent,
      surfaceStyle: preset === "showcase" ? "ink" : preset === "catalog" ? "linen" : "paper",
      radius: preset === "editorial" ? "sharp" : preset === "catalog" ? "soft" : "round",
      fontPair: preset === "editorial" ? "serif" : preset === "showcase" ? "display" : "sans",
      density: preset === "editorial" ? "relaxed" : "regular",
      shadowLevel: preset === "catalog" ? "soft" : preset === "showcase" ? "lift" : "none",
    },
    page: {
      containerWidth: preset === "catalog" ? "wide" : "medium",
      sectionSpacing: preset === "editorial" ? "loose" : "regular",
      stickyCategoryNav: true,
      showFooterBranding: true,
    },
  };
  return base;
}

export function normalizeMenuThemePreset(value: unknown): MenuThemePreset {
  return asEnum(value, MENU_THEME_PRESETS, "editorial");
}

export function mergeThemeConfig(
  preset: MenuThemePreset,
  raw: unknown,
  brandColor?: string | null,
): MenuThemeConfig {
  const fallback = defaultThemeConfig(preset, brandColor);
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const hero = (src.hero && typeof src.hero === "object" ? src.hero : {}) as Record<
    string,
    unknown
  >;
  const nav = (
    src.categoryNav && typeof src.categoryNav === "object" ? src.categoryNav : {}
  ) as Record<string, unknown>;
  const card = (
    src.productCard && typeof src.productCard === "object" ? src.productCard : {}
  ) as Record<string, unknown>;
  const style = (src.style && typeof src.style === "object" ? src.style : {}) as Record<
    string,
    unknown
  >;
  const page = (src.page && typeof src.page === "object" ? src.page : {}) as Record<
    string,
    unknown
  >;

  const surface = surfacePalette(
    asEnum(style.surfaceStyle, MENU_SURFACE_STYLES, fallback.style.surfaceStyle),
  );
  const primaryRaw = isHex(style.primaryColor)
    ? style.primaryColor
    : fallback.style.primaryColor;
  const accentRaw = isHex(style.accentColor)
    ? style.accentColor
    : fallback.style.accentColor;

  return {
    hero: {
      showLogo: asBool(hero.showLogo, fallback.hero.showLogo),
      showCover: asBool(hero.showCover, fallback.hero.showCover),
      showTableLabel: asBool(hero.showTableLabel, fallback.hero.showTableLabel),
      align: asEnum(hero.align, MENU_HERO_ALIGNS, fallback.hero.align),
    },
    categoryNav: {
      mode: asEnum(nav.mode, MENU_NAV_MODES, fallback.categoryNav.mode),
      showImages: asBool(nav.showImages, fallback.categoryNav.showImages),
      columnsMobile: asInt(nav.columnsMobile, fallback.categoryNav.columnsMobile, 1, 3),
      columnsDesktop: asInt(
        nav.columnsDesktop,
        fallback.categoryNav.columnsDesktop,
        2,
        4,
      ),
    },
    productCard: {
      layout: asEnum(card.layout, MENU_CARD_LAYOUTS, fallback.productCard.layout),
      showImages: asBool(card.showImages, fallback.productCard.showImages),
      showBadges: asBool(card.showBadges, fallback.productCard.showBadges),
      showCalories: asBool(card.showCalories, fallback.productCard.showCalories),
      showPrepTime: asBool(card.showPrepTime, fallback.productCard.showPrepTime),
      showVariantsCollapsed: asBool(
        card.showVariantsCollapsed,
        fallback.productCard.showVariantsCollapsed,
      ),
    },
    style: {
      primaryColor: ensureReadableAccent(primaryRaw, surface.bg, fallback.style.primaryColor),
      accentColor: ensureReadableAccent(accentRaw, surface.bg, fallback.style.accentColor),
      surfaceStyle: asEnum(
        style.surfaceStyle,
        MENU_SURFACE_STYLES,
        fallback.style.surfaceStyle,
      ),
      radius: asEnum(style.radius, MENU_RADII, fallback.style.radius),
      fontPair: asEnum(style.fontPair, MENU_FONT_PAIRS, fallback.style.fontPair),
      density: asEnum(style.density, MENU_DENSITIES, fallback.style.density),
      shadowLevel: asEnum(style.shadowLevel, MENU_SHADOWS, fallback.style.shadowLevel),
    },
    page: {
      containerWidth: asEnum(
        page.containerWidth,
        MENU_CONTAINER_WIDTHS,
        fallback.page.containerWidth,
      ),
      sectionSpacing: asEnum(
        page.sectionSpacing,
        MENU_SECTION_SPACINGS,
        fallback.page.sectionSpacing,
      ),
      stickyCategoryNav: asBool(page.stickyCategoryNav, fallback.page.stickyCategoryNav),
      showFooterBranding: asBool(page.showFooterBranding, fallback.page.showFooterBranding),
    },
  };
}

export function resolveMenuTheme(
  presetRaw: unknown,
  configRaw: unknown,
  brandColor?: string | null,
): MenuThemeState {
  const preset = normalizeMenuThemePreset(presetRaw);
  return {
    preset,
    config: mergeThemeConfig(preset, configRaw, brandColor),
  };
}

export function themeHasLowContrast(config: MenuThemeConfig): boolean {
  const surface = surfacePalette(config.style.surfaceStyle);
  return (
    contrastRatio(config.style.primaryColor, surface.bg) < 3 ||
    contrastRatio(config.style.accentColor, surface.bg) < 3
  );
}
