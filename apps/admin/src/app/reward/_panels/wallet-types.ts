import type { StampTheme } from "../../../components/stamp-glyph";

export type StampInset = "TIGHT" | "NORMAL" | "WIDE";
export type AssetSlot =
  | "stampFilled"
  | "stampEmpty"
  | "logo"
  | "passBackground"
  | "passStrip";

export type BackFieldKey =
  | "phone"
  | "email"
  | "website"
  | "address"
  | "terms"
  | "custom1"
  | "custom2";

export type WalletBackField = {
  key: BackFieldKey;
  label: string;
  value: string;
  attributedValue?: string; // hyperlink/tel link
};

export const BACK_FIELD_PRESETS: { key: BackFieldKey; label: string; placeholder: string; type?: string }[] = [
  { key: "phone", label: "Telefon", placeholder: "+90 555 000 00 00", type: "phone" },
  { key: "email", label: "E-posta", placeholder: "bilgi@isletme.com", type: "email" },
  { key: "website", label: "Web sitesi", placeholder: "https://isletme.com", type: "url" },
  { key: "address", label: "Adres", placeholder: "Örn. Bağcılar Mah. No: 1, İstanbul" },
  { key: "terms", label: "Şartlar & Koşullar", placeholder: "Kampanya şartlarını buraya girin…" },
  { key: "custom1", label: "Özel alan 1", placeholder: "" },
  { key: "custom2", label: "Özel alan 2", placeholder: "" },
];

export type ProgramWalletDraft = {
  primaryColor: string;
  foregroundColor: string;
  labelColor: string;
  stampTheme: StampTheme;
  stampInset: StampInset;
  logoText: string;
  passDescription: string;
  stampFieldLabel: string;
  rewardFieldLabel: string;
  statusFieldLabel: string;
  stampIconFilledUrl: string;
  stampIconEmptyUrl: string;
  logoUrl: string;
  stripImageUrl: string;
  backgroundImageUrl: string;
  /** Apple Wallet arka yüz alanları */
  backFields: WalletBackField[];
};

export type BarcodeFormat = "QR" | "PDF417" | "AZTEC" | "CODE128";

export const BARCODE_OPTIONS: { id: BarcodeFormat; label: string; hint: string }[] = [
  { id: "QR", label: "QR", hint: "Kare, en yaygın" },
  { id: "AZTEC", label: "Aztec", hint: "Köşesiz kare" },
  { id: "PDF417", label: "PDF417", hint: "Yatay çok satırlı" },
  { id: "CODE128", label: "Code 128", hint: "Yatay çizgi" },
];

export type TenantWalletDefaults = {
  name: string;
  barcodeFormat?: BarcodeFormat;
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
  rewardReadyText: string | null;
};

export const INSETS: { id: StampInset; label: string; hint: string }[] = [
  { id: "TIGHT", label: "Dar", hint: "Kenara yakın" },
  { id: "NORMAL", label: "Normal", hint: "Dengeli" },
  { id: "WIDE", label: "Geniş", hint: "Bol boşluk" },
];

export const PREVIEW_PAD: Record<StampInset, string> = {
  TIGHT: "0.5rem 0.65rem",
  NORMAL: "0.75rem 1.35rem",
  WIDE: "0.85rem 1.85rem",
};

export const WALLET_ELIGIBLE = new Set([
  "STAMP_CARD",
  "MULTI_STAMP",
  "POINT_CARD",
  "CASHBACK_CARD",
  "DISCOUNT_CARD",
  "EVENT_CARD",
]);

export type GroupPreviewItem = {
  groupId: string;
  label: string;
  threshold: number;
  rewardLabel: string;
};

export type { StampTheme };
