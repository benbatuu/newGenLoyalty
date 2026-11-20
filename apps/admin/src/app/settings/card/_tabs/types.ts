import type { StampTheme } from "../../../../components/stamp-glyph";

export const SETTINGS_TABS = [
  { id: "stamp", label: "Damgalar", hint: "Simge, şerit, dizilim" },
  { id: "look", label: "Görünüm", hint: "Renk, logo, üst yazı" },
  { id: "fields", label: "Alanlar", hint: "Başlıklar, header, ek alan" },
  { id: "back", label: "Arka yüz", hint: "İletişim, koşullar" },
  { id: "barcode", label: "Barkod", hint: "Biçim, paylaşım" },
  { id: "relevance", label: "Kilit ekranı", hint: "Konum, tarih" },
  { id: "notify", label: "Bildirimler", hint: "Kilit ekranı mesajları" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export type StampInset = "TIGHT" | "NORMAL" | "WIDE";
export type BarcodeFormat = "QR" | "PDF417" | "AZTEC" | "CODE128";
export type AssetSlot = "stampFilled" | "stampEmpty" | "logo" | "icon";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  foregroundColor: string | null;
  labelColor: string | null;
  logoText: string | null;
  stampFieldLabel: string | null;
  rewardFieldLabel: string | null;
  statusFieldLabel: string | null;
  broadcastFieldLabel: string | null;
  broadcastEmptyText: string | null;
  showStampField: boolean;
  showRewardField: boolean;
  showStatusField: boolean;
  showBroadcastField: boolean;
  rewardReadyText: string | null;
  stampsRemainingTemplate: string | null;
  headerFieldLabel: string | null;
  passDescription: string | null;
  passHowItWorks: string | null;
  passTerms: string | null;
  passLocations: string | null;
  passHours: string | null;
  passWebsiteUrl: string | null;
  passPhone: string | null;
  passDescriptionLabel: string | null;
  passHowItWorksLabel: string | null;
  passTermsLabel: string | null;
  passLocationsLabel: string | null;
  passHoursLabel: string | null;
  passWebsiteLabel: string | null;
  passPhoneLabel: string | null;
  passExtra1Label: string | null;
  passExtra1Value: string | null;
  passExtra2Label: string | null;
  passExtra2Value: string | null;
  passExtra3Label: string | null;
  passExtra3Value: string | null;
  notifyIconUrl: string | null;
  stampChangeMessage: string | null;
  rewardChangeMessage: string | null;
  statusChangeMessage: string | null;
  headerChangeMessage: string | null;
  barcodeFormat: string | null;
  walletDefaults?: Record<string, unknown> | null;
  stampTheme: string | null;
  stampIconFilledUrl: string | null;
  stampIconEmptyUrl: string | null;
  stampInset: string | null;
  planCode: string;
  planPriceTry: number;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "CANCELLED" | "SUSPENDED";
  subscriptionActivatedAt: string | null;
  rewardRule: {
    stampsRequired: number;
    rewardLabel: string;
  } | null;
};

export const INSETS: { id: StampInset; label: string; hint: string }[] = [
  { id: "TIGHT", label: "Dar", hint: "Kenara yakın" },
  { id: "NORMAL", label: "Normal", hint: "Dengeli boşluk" },
  { id: "WIDE", label: "Geniş", hint: "Bol kenar" },
];

export const PREVIEW_PAD: Record<StampInset, string> = {
  TIGHT: "0.5rem 0.65rem",
  NORMAL: "0.75rem 1.35rem",
  WIDE: "0.85rem 1.85rem",
};

export const BARCODES: { id: BarcodeFormat; label: string; hint: string }[] = [
  { id: "QR", label: "QR", hint: "Kare — önerilen" },
  { id: "AZTEC", label: "Aztec", hint: "Kare benzeri" },
  { id: "PDF417", label: "PDF417", hint: "Yatay 2D" },
  { id: "CODE128", label: "Code 128", hint: "1D çizgi" },
];

export type { StampTheme };
