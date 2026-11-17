import type { MenuContentI18n, MenuDocument, MenuThemeState } from "@ngl/shared";

export type MenuVariant = {
  name: string;
  price: number;
  kind?: "option" | "extra";
  translations?: Record<string, { name?: string }>;
};

export type MenuItemData = {
  id: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  description: string | null;
  translations?: MenuContentI18n | null;
  price: string;
  currency: string;
  imageUrl: string | null;
  allergens: string[];
  tags: string[];
  variants: MenuVariant[] | null;
  calories: number | null;
  prepTimeMin: number | null;
};

export type MenuCategoryData = {
  id: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  description: string | null;
  translations?: MenuContentI18n | null;
  imageUrl: string | null;
  items: MenuItemData[];
};

export type BranchData = { id: string; name: string };

export type MenuTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

export type PublicMenuPayload = {
  tenant: MenuTenant;
  theme: MenuThemeState & { document?: MenuDocument };
  categories: MenuCategoryData[];
  branches: BranchData[];
  /** Etiket adı → { dil: çeviri } */
  tagLabels?: Record<string, Record<string, string>>;
  table?: { id: string; label: string };
  /** Aktif tema kaydı — önbelleği geçersiz kılmak için */
  revision?: string | null;
};

export type MenuThemeCanvasProps = {
  menu: PublicMenuPayload;
  selectedBranch?: string;
  onBranchChange?: (branchId: string) => void;
  hideBranchSelect?: boolean;
  compact?: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string | null) => void;
  previewWidth?: number;
  /** Builder / önizleme cihazı — public sayfada otomatik seçilir */
  previewDevice?: "mobile" | "tablet" | "desktop";
  interactive?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  /** Builder: ürün detay sayfasını örnek ürünle aç */
  previewProductDetail?: boolean;
  /** Builder: Keşfet sayfasını aç */
  previewExplore?: boolean;
};
