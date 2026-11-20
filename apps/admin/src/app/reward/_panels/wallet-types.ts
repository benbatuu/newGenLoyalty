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
  | "hours"
  | "about"
  | "how"
  | "terms"
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4";

export type WalletBackField = {
  key: BackFieldKey;
  label: string;
  value: string;
  attributedValue?: string; // hyperlink/tel link
};

export const BACK_FIELD_PRESETS: { key: BackFieldKey; label: string; placeholder: string; type?: string }[] = [
  { key: "about", label: "Hakkında", placeholder: "İşletmeniz hakkında kısa bilgi" },
  { key: "how", label: "Nasıl çalışır?", placeholder: "Damga nasıl toplanır, ödül nasıl alınır" },
  { key: "terms", label: "Şartlar & Koşullar", placeholder: "Kampanya şartlarını buraya girin…" },
  { key: "address", label: "Şubeler / Adres", placeholder: "Örn. Bağcılar Mah. No: 1, İstanbul" },
  { key: "hours", label: "Çalışma saatleri", placeholder: "Hft içi 09:00–21:00" },
  { key: "phone", label: "Telefon", placeholder: "+90 555 000 00 00", type: "phone" },
  { key: "email", label: "E-posta", placeholder: "bilgi@isletme.com", type: "email" },
  { key: "website", label: "Web sitesi", placeholder: "https://isletme.com", type: "url" },
  { key: "custom1", label: "Özel alan 1", placeholder: "" },
  { key: "custom2", label: "Özel alan 2", placeholder: "" },
  { key: "custom3", label: "Özel alan 3", placeholder: "" },
  { key: "custom4", label: "Özel alan 4", placeholder: "" },
];

export type ProgramWalletDraft = {
  /** true: Alanlar ve Kilit ekranı marka varsayılanından gelir */
  inheritBrandFields: boolean;
  primaryColor: string;
  foregroundColor: string;
  labelColor: string;
  stampTheme: StampTheme;
  stampInset: StampInset;
  /** Damga satır sayısı; 0 = otomatik */
  stampRows: number;
  /** GRID veya STAGGERED (çift satırlar yarım adım kayar) */
  stampLayout: "GRID" | "STAGGERED";
  /** Boş (null) = kenar boşluğu varsayılanı */
  stampGapX: number | null;
  stampGapY: number | null;
  /** Düzenleyici ayarları */
  stampIconScale: number;
  stampStaggerRatio: number;
  stampOffsetX: number;
  stampOffsetY: number;
  /** Elle sürüklenen damga konumları (index'e göre; null = otomatik) */
  stampPositions: StampManualPos[];
  /** Satır başına kaydırma ve boyut çarpanı (satır indeksine göre) */
  stampRowAdjust: StampRowAdjust[];
  /** PassKit: ek header alanları (en fazla 3, tenant header ile birlikte) */
  headerFields: PassKitField[];
  /** PassKit: ek yardımcı alanlar (en fazla 4) */
  auxFields: PassKitField[];
  showBarcode: boolean;
  /** Boş = işletme varsayılanı */
  barcodeFormat: "" | BarcodeFormat;
  barcodeAltMode: "CODE" | "NONE" | "CUSTOM";
  barcodeAltText: string;
  /** Kilit ekranında kartı öne çıkaran konumlar (en fazla 10) */
  locations: PassKitLocation[];
  /** datetime-local biçimi (YYYY-MM-DDTHH:mm) veya boş */
  relevantDate: string;
  expirationDate: string;
  suppressStripShine: boolean;
  sharingProhibited: boolean;
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
  /** Tenant düzeyi kart üst yazısı (Wallet header alanı etiketi) */
  headerFieldLabel?: string | null;
  logoText: string | null;
  logoUrl: string | null;
  passDescription: string | null;
  stampIconFilledUrl: string | null;
  stampIconEmptyUrl: string | null;
  stampFieldLabel: string | null;
  rewardFieldLabel: string | null;
  statusFieldLabel: string | null;
  rewardReadyText: string | null;
  /** Marka düzeyi kart varsayılanları (Alanlar + Kilit ekranı) */
  walletDefaults?: Record<string, unknown> | null;
};

export const INSETS: { id: StampInset; label: string; hint: string }[] = [
  { id: "TIGHT", label: "Dar", hint: "Kenara yakın" },
  { id: "NORMAL", label: "Normal", hint: "Dengeli" },
  { id: "WIDE", label: "Geniş", hint: "Bol boşluk" },
];

/** 0 = otomatik (damga sayısına göre ızgara) */
export type StampManualPos = { x: number; y: number; size?: number; z?: number } | null;
export type StampRowAdjust = { offsetX: number; offsetY: number; scale: number };

export type PassKitField = { label: string; value: string };
export type PassKitLocation = {
  latitude: number;
  longitude: number;
  relevantText: string;
};

export const STAMP_ROW_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Otomatik" },
  { value: 1, label: "1 satır" },
  { value: 2, label: "2 satır" },
  { value: 3, label: "3 satır" },
  { value: 4, label: "4 satır" },
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
