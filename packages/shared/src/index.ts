/** Shared domain contracts for Dokun & Kazan */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
  CASHIER = 'CASHIER',
}

/** Stamp source — MVP uses cashier only; nfc reserved for later */
export enum StampSource {
  CASHIER = 'cashier',
  NFC = 'nfc',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

/** Sadakat program tipleri */
export enum ProgramType {
  STAMP_CARD = 'STAMP_CARD',
  MULTI_STAMP = 'MULTI_STAMP',
  POINT_CARD = 'POINT_CARD',
  DISCOUNT_CARD = 'DISCOUNT_CARD',
  EVENT_CARD = 'EVENT_CARD',
  STAFF_CARD = 'STAFF_CARD',
  MEMBERSHIP_CARD = 'MEMBERSHIP_CARD',
  CASHBACK_CARD = 'CASHBACK_CARD',
}

export type StampCardConfig = {
  earnRule: 'PER_VISIT' | 'PER_RECEIPT';
  stampsPerEarn: number;
  maxStampsPerDay: number;
  blockStampWhenRewardReady: boolean;
  resetOnRedeem: 'ZERO' | 'ROLLOVER_EXCESS';
};

export const DEFAULT_STAMP_CARD_CONFIG: StampCardConfig = {
  earnRule: 'PER_VISIT',
  stampsPerEarn: 1,
  maxStampsPerDay: 1,
  blockStampWhenRewardReady: true,
  resetOnRedeem: 'ZERO',
};

/** Tek MVP paketi — online ödeme (iyzico) son faz */
export const CAFE_PLAN = {
  code: 'cafe',
  priceTry: 990,
  labelTr: 'Kafe paketi',
} as const;

/** Paket kodları (feature flag matrisi — task.md) */
export const PLAN_CODES = {
  STARTER: 'starter',
  GROWTH: 'growth',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const;

export {
  PLAN_DEFINITIONS,
  PLAN_FEATURES,
  PROGRAM_TYPE_LABELS,
  PROGRAM_TYPE_HINTS,
  PROGRAM_TYPE_REQUIREMENTS,
  PROGRAM_TYPE_CATALOG_ORDER,
  buildProgramTypeCatalog,
  findLowestPlanForProgramType,
  computeProgramQuota,
  planHasFeature,
  resolvePlanDefinition,
  resolvePlanFeatures,
  type PlanCode,
  type PlanDefinition,
  type ProgramQuotaSnapshot,
  type ProgramTypeCatalogEntry,
  type ProgramTypeCode,
  type ProgramTypeQuota,
} from './plans';

export {
  ADMIN_MENU_CATALOG,
  PLAN_MENU_KEYS,
  resolvePlanMenuKeys,
  isKnownMenuKey,
  type AdminMenuKey,
} from './plan-menus';

export { ROLLOUT_FLAGS } from './rollout-flags';

export {
  MAX_WALLET_STAMP_SLOTS,
  MAX_MULTI_STAMP_GROUPS,
  buildMultiStampWalletLayout,
  buildMultiStampWalletLayoutForProgram,
  buildMultiplierGroupWalletLayout,
  buildSlotStylesFromLayout,
  computeStampGrid,
  maxThresholdPerGroup,
  multiStampUsesCombinedStrip,
  resolveLaneThreshold,
  validateMultiStampWalletCapacity,
  type GroupStampStyle,
  type MultiStampWalletLayout,
  type MultiStampWalletSegment,
} from './multi-stamp-wallet';

export {
  WALLET_STAMP_ICON_MAX,
  WALLET_STAMP_ICON_MIN,
  WALLET_STAMP_INSET_LAYOUT,
  WALLET_STRIP_H,
  WALLET_STRIP_W,
  computeWalletStampPositions,
  resolveWalletStampGrid,
  type WalletStampInset,
  type WalletStampLayoutOptions,
  type WalletStampManualPosition,
  type WalletStampPosition,
  type WalletStampRowAdjust,
} from './wallet-stamp-layout';

export {
  STAMP_THEME_ICONS,
  STAMP_THEME_OPTIONS,
  DEFAULT_GROUP_STAMP_THEMES,
  defaultGroupStampTheme,
  getStampThemeIconUrls,
  normalizeStampThemeId,
  resolveStampIconSrc,
  type StampThemeIconSet,
  type StampThemeId,
} from './stamp-theme-icons';

export {
  STORE_CARD_IMAGE_SPECS,
  formatPassImageSize,
  type WalletPassImageSpec,
} from './wallet-pass-images';

export {
  createEmptyEmailDocument,
  cryptoRandomId,
  emailDocumentFromMarkdown,
  applyEmailBranding,
  normalizeEmailDocument,
  isEmailDocument,
  plainTextFromDocument,
  renderEmailHtml,
  resolveEmailTheme,
  sanitizeEmailHtml,
  DEFAULT_EMAIL_THEME,
  type EmailBlock,
  type EmailDocument,
  type EmailTheme,
  type EmailBrandingInput,
  type EmailBlockStyle,
} from './email-document';

export {
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  SPACING_OPTIONS,
  blockStyleToInlineCss,
  blockStyleToReactCss,
  defaultsForBlockType,
  getBlockStyle,
  patchBlockStyle,
  resolvePadding,
  type EmailFontSize,
  type EmailFontWeight,
  type EmailFontFamily,
  type EmailTextAlign,
  type EmailLineHeight,
  type EmailSpacing,
  type EmailBorderRadius,
  type EmailImageWidth,
} from './email-block-style';

export {
  EMAIL_SECTORS,
  getEmailStarter,
  listEmailStarters,
  listEmailStartersBySector,
  type EmailSectorId,
  type EmailStarterTemplate,
} from './email-starters';

export {
  MENU_BLOCK_TYPES,
  MENU_BLOCK_CATALOG,
  MENU_NAV_FLOWS,
  MENU_LANGS,
  MENU_LANG_CATALOG,
  MENU_BOTTOM_NAV_IDS,
  MENU_DEVICES,
  MENU_FEEDBACK_FIELD_TYPES,
  createMenuBlock,
  createDefaultMenuDocument,
  defaultMenuChrome,
  defaultDeviceFrames,
  defaultMenuDocTheme,
  normalizeMenuDocument,
  resolveMenuDocument,
  resolveDeviceNumber,
  resolveBlockStyle,
  resolveThemeForDevice,
  isMenuDocument,
  menuDocumentFromThemeConfig,
  moveMenuBlock,
  removeMenuBlock,
  patchMenuBlock,
  insertMenuBlock,
  defaultProductDetail,
  defaultExplorePage,
  defaultFeedbackForm,
  normalizeFeedbackForm,
  pickMenuLocale,
  pickContentName,
  pickContentDescription,
  getMenuLangMeta,
  isKnownMenuLang,
  normalizeMenuLangList,
  type MenuBlock,
  type MenuBlockType,
  type MenuDocument,
  type MenuDocTheme,
  type MenuNavFlow,
  type MenuBlockStyle,
  type MenuBlockStyleBase,
  type MenuChrome,
  type MenuLang,
  type MenuLangMeta,
  type MenuLocalized,
  type MenuContentI18n,
  type MenuBottomNavId,
  type MenuBottomNavItem,
  type MenuHeaderBlock,
  type MenuLogoShape,
  type MenuWelcomeBlock,
  type MenuCategoriesBlock,
  type MenuItemsBlock,
  type MenuProductDetail,
  type MenuProductImageAspect,
  type MenuBottomNavBlock,
  type MenuExplorePage,
  type MenuExploreSection,
  type MenuExploreCard,
  type MenuExploreLinkKind,
  type MenuFeedbackForm,
  type MenuFeedbackField,
  type MenuFeedbackFieldType,
  type MenuDeviceId,
  type MenuDeviceFrame,
  resolveMenuOverlay,
  DEFAULT_MENU_OVERLAYS,
  DEFAULT_DIALOG_WIDTH,
  resolveDetailDialogWidth,
  type MenuOverlayStyle,
} from './menu-document';

export {
  MENU_THEME_PRESETS,
  MENU_NAV_MODES,
  MENU_CARD_LAYOUTS,
  MENU_HERO_ALIGNS,
  MENU_SURFACE_STYLES,
  MENU_RADII,
  MENU_FONT_PAIRS,
  MENU_DENSITIES,
  MENU_SHADOWS,
  MENU_CONTAINER_WIDTHS,
  MENU_SECTION_SPACINGS,
  MENU_THEME_META,
  defaultThemeConfig,
  mergeThemeConfig,
  normalizeMenuThemePreset,
  resolveMenuTheme,
  surfacePalette,
  contrastOn,
  contrastRatio,
  ensureReadableAccent,
  themeHasLowContrast,
  type MenuThemePreset,
  type MenuThemeConfig,
  type MenuThemeState,
  type MenuNavMode,
  type MenuCardLayout,
} from './menu-theme';

export {
  EMAIL_MERGE_TAGS,
  applyMergeTags,
  formatMergeToken,
  mergeContextFromCustomer,
  mergeTagById,
  personalizeEmailDocument,
  sampleMergeContext,
  type EmailMergeContext,
  type EmailMergeTagDef,
  type EmailMergeTagId,
} from './email-merge-tags';

export type ApiHealth = {
  status: 'ok';
  service: string;
};

export type ProgramTierDto = {
  id: string;
  sortOrder: number;
  threshold: number;
  rewardLabel: string;
  redeemCost: number;
  laneId: string | null;
};

export type LoyaltyProgramDto = {
  id: string;
  tenantId: string;
  type: ProgramType | string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  config: StampCardConfig | Record<string, unknown>;
  validFrom: string | null;
  validUntil: string | null;
  tiers: ProgramTierDto[];
};
export * from './menu-tags';
