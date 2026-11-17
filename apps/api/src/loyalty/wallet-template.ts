/** Per-program Apple/Google Wallet görsel şablonu (LoyaltyProgram.config.walletTemplate) */

export type ProgramWalletTemplate = {
  primaryColor?: string | null;
  foregroundColor?: string | null;
  labelColor?: string | null;
  stampTheme?: string | null;
  stampInset?: string | null;
  logoText?: string | null;
  logoUrl?: string | null;
  passDescription?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
  /** Özel tam şerit — Apple strip 375×123 @1x (750×246 @2x) */
  stripImageUrl?: string | null;
  /** Kart arka plan görseli — Apple background 180×220 @1x */
  backgroundImageUrl?: string | null;
  stampFieldLabel?: string | null;
  rewardFieldLabel?: string | null;
  statusFieldLabel?: string | null;
  showStampField?: boolean;
  showRewardField?: boolean;
  showStatusField?: boolean;
};

export type TenantBrandingSource = {
  primaryColor: string | null;
  foregroundColor: string | null;
  labelColor: string | null;
  stampTheme: string | null;
  stampInset: string | null;
  logoText: string | null;
  logoUrl: string | null;
  passDescription: string | null;
  stampIconFilledUrl: string | null;
  stampIconEmptyUrl: string | null;
  stampFieldLabel: string | null;
  rewardFieldLabel: string | null;
  statusFieldLabel: string | null;
  showStampField: boolean;
  showRewardField: boolean;
  showStatusField: boolean;
  name: string | null;
};

export type ResolvedPassBranding = {
  primaryColor: string;
  foregroundColor: string;
  labelColor: string;
  stampTheme: string;
  stampInset: string;
  logoText: string | null;
  logoUrl: string | null;
  passDescription: string | null;
  stampIconFilledUrl: string | null;
  stampIconEmptyUrl: string | null;
  stampFieldLabel: string | null;
  rewardFieldLabel: string | null;
  statusFieldLabel: string | null;
  showStampField: boolean;
  showRewardField: boolean;
  showStatusField: boolean;
  orgName: string;
};

export function parseWalletTemplate(
  config: unknown,
): ProgramWalletTemplate | null {
  if (!config || typeof config !== 'object') return null;
  const wt = (config as Record<string, unknown>).walletTemplate;
  if (!wt || typeof wt !== 'object' || Array.isArray(wt)) return null;
  return wt as ProgramWalletTemplate;
}

export function mergeProgramConfig(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const next = { ...base, ...patch };
  if (
    patch.walletTemplate &&
    typeof patch.walletTemplate === 'object' &&
    !Array.isArray(patch.walletTemplate) &&
    base.walletTemplate &&
    typeof base.walletTemplate === 'object' &&
    !Array.isArray(base.walletTemplate)
  ) {
    next.walletTemplate = {
      ...(base.walletTemplate as object),
      ...(patch.walletTemplate as object),
    };
  }
  return next;
}

export function resolvePassBranding(
  tenant: TenantBrandingSource,
  template: ProgramWalletTemplate | null | undefined,
): ResolvedPassBranding {
  return {
    primaryColor: template?.primaryColor ?? tenant.primaryColor ?? '#1B4332',
    foregroundColor:
      template?.foregroundColor ?? tenant.foregroundColor ?? '#FFFFFF',
    labelColor: template?.labelColor ?? tenant.labelColor ?? '#DCDCDC',
    stampTheme: template?.stampTheme ?? tenant.stampTheme ?? 'COFFEE',
    stampInset: template?.stampInset ?? tenant.stampInset ?? 'NORMAL',
    logoText: template?.logoText ?? tenant.logoText,
    logoUrl: template?.logoUrl ?? tenant.logoUrl,
    passDescription: template?.passDescription ?? tenant.passDescription,
    stampIconFilledUrl:
      template?.stampIconFilledUrl ?? tenant.stampIconFilledUrl,
    stampIconEmptyUrl: template?.stampIconEmptyUrl ?? tenant.stampIconEmptyUrl,
    stampFieldLabel: template?.stampFieldLabel ?? tenant.stampFieldLabel,
    rewardFieldLabel: template?.rewardFieldLabel ?? tenant.rewardFieldLabel,
    statusFieldLabel: template?.statusFieldLabel ?? tenant.statusFieldLabel,
    showStampField: template?.showStampField ?? tenant.showStampField,
    showRewardField: template?.showRewardField ?? tenant.showRewardField,
    showStatusField: template?.showStatusField ?? tenant.showStatusField,
    orgName:
      template?.logoText?.trim() ||
      tenant.logoText?.trim() ||
      tenant.name?.trim() ||
      'Damga Kartı',
  };
}
