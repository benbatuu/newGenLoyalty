import {
  defaultThemeConfig,
  mergeThemeConfig,
  normalizeMenuThemePreset,
  surfacePalette,
  type MenuThemeConfig,
  type MenuThemePreset,
} from './menu-theme';
import {
  MENU_LANGS,
  normalizeMenuLangCode,
  normalizeMenuLangList,
  pickMenuLocale,
  type MenuLang,
  type MenuLocalized,
} from './menu-langs';

export {
  MENU_LANG_CATALOG,
  MENU_LANGS,
  getMenuLangMeta,
  isKnownMenuLang,
  normalizeMenuLangCode,
  normalizeMenuLangList,
  pickMenuLocale,
  pickContentName,
  pickContentDescription,
  type MenuLang,
  type MenuLangMeta,
  type MenuLocalized,
  type MenuContentI18n,
} from './menu-langs';

export const MENU_BLOCK_TYPES = [
  'header',
  'cover',
  'welcome',
  'search',
  'categories',
  'items',
  'text',
  'image',
  'divider',
  'spacer',
  'footer',
  'branchPicker',
  'bottomNav',
] as const;

export type MenuBlockType = (typeof MENU_BLOCK_TYPES)[number];

export const MENU_NAV_FLOWS = ['scroll', 'drilldown'] as const;
export type MenuNavFlow = (typeof MENU_NAV_FLOWS)[number];

export const MENU_BOTTOM_NAV_IDS = [
  'cart',
  'suggest',
  'complaint',
  'wifi',
  'explore',
  'waiter',
] as const;
export type MenuBottomNavId = (typeof MENU_BOTTOM_NAV_IDS)[number];

export type MenuBottomNavItem = {
  id: MenuBottomNavId;
  enabled: boolean;
  /** Dil bazlı etiket; boş dil canlıda varsayılan i18n’e düşer */
  label: MenuLocalized;
};

export const MENU_EXPLORE_LINK_KINDS = [
  'url',
  'instagram',
  'facebook',
  'maps',
  'phone',
  'email',
  'whatsapp',
] as const;
export type MenuExploreLinkKind = (typeof MENU_EXPLORE_LINK_KINDS)[number];

export type MenuExploreCard = {
  id: string;
  enabled: boolean;
  kind: MenuExploreLinkKind;
  href: string;
  value: string;
  title: MenuLocalized;
  subtitle: MenuLocalized;
};

export type MenuExploreSection = {
  id: string;
  heading: MenuLocalized;
  cards: MenuExploreCard[];
};

export type MenuExplorePage = {
  eyebrow: MenuLocalized;
  title: MenuLocalized;
  description: MenuLocalized;
  location: MenuLocalized;
  hours: MenuLocalized;
  sections: MenuExploreSection[];
};

export const MENU_FEEDBACK_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'tel',
  'select',
] as const;
export type MenuFeedbackFieldType = (typeof MENU_FEEDBACK_FIELD_TYPES)[number];

export type MenuFeedbackField = {
  id: string;
  type: MenuFeedbackFieldType;
  /** name | message sabitleri API’ye özel map edilir; diğerleri custom */
  role: 'name' | 'message' | 'custom';
  label: MenuLocalized;
  placeholder: MenuLocalized;
  required: boolean;
  options: { id: string; label: MenuLocalized }[];
};

export type MenuFeedbackForm = {
  fields: MenuFeedbackField[];
  /** Gönder butonu */
  submitLabel: MenuLocalized;
  /** Başarılı gönderim mesajı */
  thanksMessage: MenuLocalized;
};

export type MenuBlockStyleBase = {
  paddingTop?: number;
  paddingBottom?: number;
  paddingX?: number;
  background?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontWeight?: number;
  borderRadius?: number;
  gap?: number;
  /** Bu ekranda bloğu gizle (byDevice ile cihaz bazlı) */
  hidden?: boolean;
};

export const MENU_DEVICES = ['mobile', 'tablet', 'desktop'] as const;
export type MenuDeviceId = (typeof MENU_DEVICES)[number];

export type MenuDeviceFrame = {
  /** Önizleme / viewport çerçeve genişliği */
  width: number;
  /** Önizleme çerçeve yüksekliği (builder) */
  height: number;
  /** İçerik max genişliği */
  maxWidth: number;
  pagePadding: number;
  /** true: içerik açıldığı ekranın tamamına yayılır (maxWidth uygulanmaz) */
  fullWidth?: boolean;
};

export type MenuBlockStyle = MenuBlockStyleBase & {
  /** Cihaza özel stil override */
  byDevice?: Partial<Record<MenuDeviceId, MenuBlockStyleBase>>;
};

export type MenuDocTheme = {
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  headingColor: string;
  fontPair: 'serif' | 'sans' | 'display' | 'mono' | 'grotesk' | 'rounded';
  radius: 'sharp' | 'soft' | 'round';
  /** Varsayılan (geriye uyumluluk) */
  pagePadding: number;
  maxWidth: number;
  /** Mobil / tablet / masaüstü çerçeve ve boşluk */
  devices: Record<MenuDeviceId, MenuDeviceFrame>;
  /** Ürün detayı ve başlık menüleri: alttan çekmece veya ortada pencere (cihaza göre) */
  overlays?: Partial<Record<MenuDeviceId, MenuOverlayStyle>>;
};

export type MenuOverlayStyle = 'drawer' | 'dialog';

export const DEFAULT_MENU_OVERLAYS: Record<MenuDeviceId, MenuOverlayStyle> = {
  mobile: 'drawer',
  tablet: 'dialog',
  desktop: 'dialog',
};

/** Cihaz için açılır pencere tipini döndürür (ayar yoksa varsayılan) */
export function resolveMenuOverlay(
  theme: { overlays?: Partial<Record<MenuDeviceId, MenuOverlayStyle>> },
  device: MenuDeviceId,
): MenuOverlayStyle {
  return theme.overlays?.[device] ?? DEFAULT_MENU_OVERLAYS[device];
}

function normalizeOverlays(
  raw: unknown,
): Partial<Record<MenuDeviceId, MenuOverlayStyle>> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Partial<Record<MenuDeviceId, MenuOverlayStyle>> = {};
  (['mobile', 'tablet', 'desktop'] as MenuDeviceId[]).forEach((d) => {
    if (src[d] === 'drawer' || src[d] === 'dialog') out[d] = src[d] as MenuOverlayStyle;
  });
  return out;
}

type Styled = { style?: MenuBlockStyle };

export type MenuLogoShape = 'round' | 'square' | 'wide';

export type MenuHeaderBlock = {
  id: string;
  type: 'header';
  showLogo: boolean;
  /** QR menüye özel logo; boşsa işletme logosu kullanılır */
  logoUrl: string;
  logoShape: MenuLogoShape;
  /** @deprecated logoWidth / logoHeight kullanın */
  logoSize: number;
  /** @deprecated logoWidth kullanın */
  logoWideRatio: number;
  /** Logo kutusu genişliği (px) */
  logoWidth: number;
  /** Logo kutusu yüksekliği (px) */
  logoHeight: number;
  /** Tablet / masaüstü için logo boyutu (boşsa logoWidth/logoHeight) */
  logoWidthByDevice?: Partial<Record<MenuDeviceId, number>>;
  logoHeightByDevice?: Partial<Record<MenuDeviceId, number>>;
  showName: boolean;
  showTable: boolean;
  sticky: boolean;
  showLanguages: boolean;
  languages: MenuLang[];
  defaultLanguage: MenuLang;
  eyebrow: string;
  title: string;
  subtitle: string;
  align: 'left' | 'center';
  /**
   * Menü arayüz metinleri (Kategoriler, Geri, …) — dil kodu → metin.
   * Boşsa paket varsayılanları kullanılır.
   */
  uiLabels: Partial<Record<string, MenuLocalized>>;
} & Styled;

export type MenuCoverBlock = {
  id: string;
  type: 'cover';
  height: number;
  heightByDevice?: Partial<Record<MenuDeviceId, number>>;
  overlay: number;
  imageUrl: string;
} & Styled;

export type MenuWelcomeBlock = {
  id: string;
  type: 'welcome';
  eyebrow: string;
  title: string;
  subtitle: string;
  locationLabel: string;
} & Styled;

export type MenuSearchBlock = {
  id: string;
  type: 'search';
  /** Dil bazlı yer tutucu; boş dil için tr değeri kullanılır */
  placeholder: MenuLocalized;
} & Styled;

/** Ekran genişliğine göre sütun sayıları (min-width kırılımları). Cihaz değil, genişlik belirler. */
export type MenuGridCols = {
  base: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
};

export type MenuCategoriesBlock = {
  id: string;
  type: 'categories';
  /** Dil bazlı bölüm başlığı (Kategoriler / Categories …) */
  title: MenuLocalized;
  mode: 'grid' | 'chips' | 'list';
  showImages: boolean;
  showCount: boolean;
  /** Mobilde hedef sütun; tablet/masaüstü CSS ile ölçeklenir */
  columns: number;
  columnsByDevice?: Partial<Record<MenuDeviceId, number>>;
  /** @deprecated columnsByDevice.desktop kullanın */
  columnsDesktop: number;
  /**
   * @deprecated Görseller artık aspect-ratio ile sığdırılır; geriye uyumluluk için tutulur
   */
  cardHeight: number;
  cardHeightByDevice?: Partial<Record<MenuDeviceId, number>>;
  /** Kategori görseli oranı */
  imageAspect: 'wide' | 'square' | 'tall';
  openOnClick: boolean;
  /** Genişliğe göre sütun düzeni; yoksa eski columns alanlarından türetilir */
  gridCols?: MenuGridCols;
} & Styled;

export const MENU_PRODUCT_IMAGE_ASPECTS = ['wide', 'square', 'tall', 'hero'] as const;
export type MenuProductImageAspect = (typeof MENU_PRODUCT_IMAGE_ASPECTS)[number];

/** Ürün tıklanınca açılan detay sayfası */
export type MenuProductDetail = {
  imageAspect: MenuProductImageAspect;
  imageBleed: boolean;
  imageRadius: number;
  showImage: boolean;
  showName: boolean;
  showDescription: boolean;
  showPrice: boolean;
  showCalories: boolean;
  showPrepTime: boolean;
  showBadges: boolean;
  showAllergens: boolean;
  /** Ürün detayında seçenekleri (mutlak fiyatlı varyasyonlar) göster */
  showOptions: boolean;
  /** Ürün detayında ekstraları (+₺ eklenen ücretler) göster */
  showExtras: boolean;
  showAddToCart: boolean;
  addToCartLabel: string;
  /** Tablet/masaüstü pencerede görselin tarafı */
  dialogImageSide: 'left' | 'right';
  /** Tablet/masaüstü pencerede görselin yüzdesi (30–70) */
  dialogImageShare: number;
  /** Tablet/masaüstü pencere genişliği (cihaza özel, px) */
  dialogWidthByDevice?: Partial<Record<MenuDeviceId, number>>;
};

export const DEFAULT_DIALOG_WIDTH: Record<MenuDeviceId, number> = {
  mobile: 560,
  tablet: 760,
  desktop: 960,
};

/** Ürün penceresinin genişliğini cihaza göre döndürür */
export function resolveDetailDialogWidth(detail: MenuProductDetail, device: MenuDeviceId): number {
  return detail.dialogWidthByDevice?.[device] ?? DEFAULT_DIALOG_WIDTH[device];
}

export function defaultProductDetail(): MenuProductDetail {
  return {
    imageAspect: 'wide',
    imageBleed: false,
    imageRadius: 12,
    showImage: true,
    showName: true,
    showDescription: true,
    showPrice: true,
    showCalories: false,
    showPrepTime: false,
    showBadges: true,
    showAllergens: true,
    showOptions: true,
    showExtras: true,
    showAddToCart: true,
    addToCartLabel: '',
    dialogImageSide: 'left',
    dialogImageShare: 50,
  };
}

export type MenuItemsBlock = {
  id: string;
  type: 'items';
  title: string;
  layout: 'split' | 'compact' | 'card' | 'imageFirst';
  /** Telefonda ürün sütunu; 1 = liste, 2–3 = ızgara */
  columns: number;
  columnsByDevice?: Partial<Record<MenuDeviceId, number>>;
  showImages: boolean;
  showPrice: boolean;
  showDescription: boolean;
  showBadges: boolean;
  showCalories: boolean;
  showPrepTime: boolean;
  /** Ürün kartında ekstra / seçenek bilgisi */
  showVariants?: boolean;
  gridCols?: MenuGridCols;
  scope: 'all' | 'selected';
  productClick: 'detail' | 'cart' | 'none';
  allowAddToCart: boolean;
  detail: MenuProductDetail;
} & Styled;

export type MenuTextBlock = {
  id: string;
  type: 'text';
  text: string;
  as: 'h2' | 'p';
} & Styled;

export type MenuImageBlock = {
  id: string;
  type: 'image';
  url: string;
  alt: string;
  height: number;
  heightByDevice?: Partial<Record<MenuDeviceId, number>>;
} & Styled;

export type MenuDividerBlock = {
  id: string;
  type: 'divider';
  thickness: number;
  color: string;
} & Styled;

export type MenuSpacerBlock = {
  id: string;
  type: 'spacer';
  size: number;
  sizeByDevice?: Partial<Record<MenuDeviceId, number>>;
} & Styled;

export type MenuFooterBlock = {
  id: string;
  type: 'footer';
  text: string;
  showBranding: boolean;
} & Styled;

export type MenuBranchPickerBlock = {
  id: string;
  type: 'branchPicker';
  label: string;
} & Styled;

export type MenuBottomNavBlock = {
  id: string;
  type: 'bottomNav';
  items: MenuBottomNavItem[];
  wifiSsid: string;
  wifiPassword: string;
  explore: MenuExplorePage;
  suggestForm: MenuFeedbackForm;
  complaintForm: MenuFeedbackForm;
} & Styled;

export type MenuBlock =
  | MenuHeaderBlock
  | MenuCoverBlock
  | MenuWelcomeBlock
  | MenuSearchBlock
  | MenuCategoriesBlock
  | MenuItemsBlock
  | MenuTextBlock
  | MenuImageBlock
  | MenuDividerBlock
  | MenuSpacerBlock
  | MenuFooterBlock
  | MenuBranchPickerBlock
  | MenuBottomNavBlock;

/** @deprecated Eski temalar için; normalize sırasında bloklara taşınır */
export type MenuChrome = {
  enabled: boolean;
  languages: MenuLang[];
  defaultLanguage: MenuLang;
  stickyHeader: boolean;
  showWelcome: boolean;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  locationLabel: string;
  productClick: 'detail' | 'cart' | 'none';
  allowAddToCart: boolean;
  bottomNavEnabled: boolean;
  bottomNav: MenuBottomNavItem[];
  wifiSsid: string;
  wifiPassword: string;
  categoryColumnsDesktop: number;
};

export type MenuDocument = {
  version: 2;
  navigation: MenuNavFlow;
  theme: MenuDocTheme;
  blocks: MenuBlock[];
};

export const MENU_BLOCK_CATALOG: {
  type: MenuBlockType;
  label: string;
  hint: string;
}[] = [
  { type: 'header', label: 'Başlık', hint: 'Logo, dil, masa, yapışkan üst bar' },
  { type: 'cover', label: 'Kapak', hint: 'Üst görsel şerit' },
  { type: 'welcome', label: 'Karşılama', hint: 'Hoş geldin kartı' },
  { type: 'search', label: 'Arama', hint: 'Ürün / kategori ara' },
  { type: 'categories', label: 'Kategoriler', hint: 'Izgara, etiket veya liste' },
  { type: 'items', label: 'Ürünler', hint: 'Liste, detay sayfası ve tıklama aksiyonu' },
  { type: 'text', label: 'Metin', hint: 'Başlık veya paragraf' },
  { type: 'image', label: 'Görsel', hint: 'Banner veya foto' },
  { type: 'divider', label: 'Ayırıcı', hint: 'İnce çizgi' },
  { type: 'spacer', label: 'Boşluk', hint: 'Dikey boşluk' },
  { type: 'branchPicker', label: 'Şube seçici', hint: 'Çok şubeli menü' },
  { type: 'footer', label: 'Alt bilgi', hint: 'Not ve marka' },
  { type: 'bottomNav', label: 'Alt menü', hint: 'Sepet, Keşfet, Wi‑Fi…' },
];

function defaultBottomNavItems(): MenuBottomNavItem[] {
  return [
    { id: 'cart', enabled: true, label: { tr: 'Sepet', en: 'Cart', ru: 'Корзина' } },
    { id: 'suggest', enabled: true, label: { tr: 'Öneri', en: 'Suggest', ru: 'Предложение' } },
    {
      id: 'complaint',
      enabled: true,
      label: { tr: 'Şikayet', en: 'Complaint', ru: 'Жалоба' },
    },
    { id: 'wifi', enabled: true, label: { tr: 'Wi-Fi', en: 'Wi-Fi', ru: 'Wi-Fi' } },
    { id: 'explore', enabled: true, label: { tr: 'Keşfet', en: 'Explore', ru: 'Обзор' } },
    { id: 'waiter', enabled: false, label: { tr: 'Garson', en: 'Waiter', ru: 'Официант' } },
  ];
}

function rid(): string {
  return `mb_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function isRec(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback: number, min?: number, max?: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  let out = n;
  if (min != null) out = Math.max(min, out);
  if (max != null) out = Math.min(max, out);
  return out;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function loc(raw: unknown, fallback: MenuLocalized = {}): MenuLocalized {
  const out: MenuLocalized = { ...fallback };
  if (!isRec(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const code = normalizeMenuLangCode(k, '');
    if (!code || typeof v !== 'string') continue;
    out[code] = v.slice(0, 240);
  }
  return out;
}

/** Eski tek-string alanları MenuLocalized’e çevirir */
function locFlexible(raw: unknown, fallback: MenuLocalized = {}): MenuLocalized {
  if (typeof raw === 'string') {
    const t = raw.trim().slice(0, 240);
    return t ? { ...fallback, tr: t } : { ...fallback };
  }
  return loc(raw, fallback);
}

function defaultExploreCard(
  kind: MenuExploreLinkKind,
  title: MenuLocalized,
  subtitle: MenuLocalized,
): MenuExploreCard {
  return {
    id: rid(),
    enabled: true,
    kind,
    href: '',
    value: '',
    title,
    subtitle,
  };
}

export function defaultExplorePage(): MenuExplorePage {
  return {
    eyebrow: { tr: 'KEŞFET', en: 'EXPLORE', ru: 'ОБЗОР' },
    title: { tr: 'Keşfet', en: 'Explore', ru: 'Обзор' },
    description: {
      tr: 'Sosyal medya, yorumlar ve iletişim.',
      en: 'Social, reviews, and how to reach us.',
      ru: 'Соцсети, отзывы и контакты.',
    },
    location: { tr: '', en: '', ru: '' },
    hours: { tr: '', en: '', ru: '' },
    sections: [
      {
        id: rid(),
        heading: { tr: 'SOSYAL MEDYA', en: 'SOCIAL', ru: 'СОЦСЕТИ' },
        cards: [
          defaultExploreCard(
            'instagram',
            { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
            {
              tr: 'Günlük paylaşımlar',
              en: 'Daily posts',
              ru: 'Ежедневные публикации',
            },
          ),
          defaultExploreCard(
            'facebook',
            { tr: 'Facebook', en: 'Facebook', ru: 'Facebook' },
            {
              tr: 'Duyurular ve etkinlikler',
              en: 'News and events',
              ru: 'Новости и события',
            },
          ),
        ],
      },
      {
        id: rid(),
        heading: { tr: 'YORUMLAR', en: 'REVIEWS', ru: 'ОТЗЫВЫ' },
        cards: [
          defaultExploreCard(
            'url',
            { tr: 'Google Yorumları', en: 'Google reviews', ru: 'Отзывы Google' },
            {
              tr: 'Deneyiminizi paylaşın',
              en: 'Share your experience',
              ru: 'Поделитесь впечатлениями',
            },
          ),
        ],
      },
      {
        id: rid(),
        heading: { tr: 'İLETİŞİM', en: 'CONTACT', ru: 'КОНТАКТЫ' },
        cards: [
          defaultExploreCard(
            'url',
            { tr: 'Web sitesi', en: 'Website', ru: 'Сайт' },
            {
              tr: 'Menü, hikâye ve atmosfer',
              en: 'Menu, story, atmosphere',
              ru: 'Меню, история, атмосфера',
            },
          ),
          defaultExploreCard(
            'url',
            { tr: 'Rezervasyon', en: 'Reservations', ru: 'Бронь' },
            { tr: 'Masınızı ayırtın', en: 'Book a table', ru: 'Забронировать стол' },
          ),
          defaultExploreCard(
            'maps',
            { tr: 'Yol tarifi', en: 'Directions', ru: 'Маршрут' },
            { tr: 'Konuma gidin', en: 'Get directions', ru: 'Как добраться' },
          ),
          defaultExploreCard(
            'phone',
            { tr: 'Bizi ara', en: 'Call us', ru: 'Позвонить' },
            { tr: 'Telefon', en: 'Phone', ru: 'Телефон' },
          ),
          defaultExploreCard(
            'email',
            { tr: 'E-posta', en: 'Email', ru: 'Почта' },
            { tr: 'Yazın', en: 'Write to us', ru: 'Написать' },
          ),
        ],
      },
    ],
  };
}

export function normalizeExplorePage(raw: unknown): MenuExplorePage {
  const d = defaultExplorePage();
  if (!isRec(raw)) return d;
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : null;
  const sections = (sectionsRaw ?? d.sections).slice(0, 12).map((sec) => {
    const s = isRec(sec) ? sec : {};
    const cardsRaw = Array.isArray(s.cards) ? s.cards : [];
    const cards: MenuExploreCard[] = cardsRaw.slice(0, 16).map((c) => {
      const card = isRec(c) ? c : {};
      const kind = MENU_EXPLORE_LINK_KINDS.includes(
        card.kind as MenuExploreLinkKind,
      )
        ? (card.kind as MenuExploreLinkKind)
        : 'url';
      return {
        id: str(card.id, rid()),
        enabled: bool(card.enabled, true),
        kind,
        href: str(card.href, '').slice(0, 500),
        value: str(card.value, '').slice(0, 80),
        title: loc(card.title, {}),
        subtitle: loc(card.subtitle, {}),
      };
    });
    return {
      id: str(s.id, rid()),
      heading: loc(s.heading, {}),
      cards,
    };
  });
  return {
    eyebrow: loc(raw.eyebrow, d.eyebrow),
    title: loc(raw.title, d.title),
    description: loc(raw.description, d.description),
    location: loc(raw.location, d.location),
    hours: loc(raw.hours, d.hours),
    sections,
  };
}

export function defaultFeedbackForm(
  kind: 'suggest' | 'complaint' = 'suggest',
): MenuFeedbackForm {
  void kind;
  return {
    fields: [
      {
        id: 'fld_name',
        type: 'text',
        role: 'name',
        label: { tr: 'Adınız', en: 'Your name', ru: 'Ваше имя' },
        placeholder: {
          tr: 'İsim (isteğe bağlı)',
          en: 'Name (optional)',
          ru: 'Имя (необязательно)',
        },
        required: false,
        options: [],
      },
      {
        id: 'fld_message',
        type: 'textarea',
        role: 'message',
        label: { tr: 'Mesajınız', en: 'Your message', ru: 'Ваше сообщение' },
        placeholder: {
          tr: 'Yazın…',
          en: 'Write here…',
          ru: 'Напишите…',
        },
        required: true,
        options: [],
      },
    ],
    submitLabel: { tr: 'Gönder', en: 'Send', ru: 'Отправить' },
    thanksMessage: {
      tr: 'Teşekkürler, iletildi.',
      en: 'Thanks, we received it.',
      ru: 'Спасибо, мы получили.',
    },
  };
}

export function normalizeFeedbackForm(raw: unknown): MenuFeedbackForm {
  const d = defaultFeedbackForm();
  if (!isRec(raw) || !Array.isArray(raw.fields) || raw.fields.length === 0) {
    return d;
  }
  const fields: MenuFeedbackField[] = raw.fields.slice(0, 16).map((f, i) => {
    const row = isRec(f) ? f : {};
    const type = MENU_FEEDBACK_FIELD_TYPES.includes(
      row.type as MenuFeedbackFieldType,
    )
      ? (row.type as MenuFeedbackFieldType)
      : 'text';
    const roleRaw = str(row.role, 'custom');
    const role: MenuFeedbackField['role'] =
      roleRaw === 'name' || roleRaw === 'message' ? roleRaw : 'custom';
    const optionsRaw = Array.isArray(row.options) ? row.options : [];
    return {
      id: str(row.id, `fld_${i}_${rid()}`).slice(0, 40),
      type,
      role,
      label: loc(row.label, {}),
      placeholder: loc(row.placeholder, {}),
      required: bool(row.required, role === 'message'),
      options: optionsRaw.slice(0, 20).map((o, oi) => {
        const opt = isRec(o) ? o : {};
        return {
          id: str(opt.id, `opt_${oi}`).slice(0, 40),
          label: loc(opt.label, {}),
        };
      }),
    };
  });
  if (!fields.some((f) => f.role === 'message')) {
    fields.push(d.fields.find((f) => f.role === 'message')!);
  }
  return {
    fields,
    submitLabel: loc(raw.submitLabel, d.submitLabel),
    thanksMessage: loc(raw.thanksMessage, d.thanksMessage),
  };
}

function normalizeProductDetail(raw: unknown): MenuProductDetail {
  const d = defaultProductDetail();
  if (!isRec(raw)) return d;
  const aspect = raw.imageAspect;
  return {
    imageAspect:
      aspect === 'square' || aspect === 'tall' || aspect === 'hero' ? aspect : 'wide',
    imageBleed: bool(raw.imageBleed, d.imageBleed),
    imageRadius: num(raw.imageRadius, d.imageRadius, 0, 40),
    showImage: bool(raw.showImage, d.showImage),
    showName: bool(raw.showName, d.showName),
    showDescription: bool(raw.showDescription, d.showDescription),
    showPrice: bool(raw.showPrice, d.showPrice),
    showCalories: bool(raw.showCalories, d.showCalories),
    showPrepTime: bool(raw.showPrepTime, d.showPrepTime),
    showBadges: bool(raw.showBadges, d.showBadges),
    showAllergens: bool(raw.showAllergens, d.showAllergens),
    showOptions: bool(raw.showOptions, d.showOptions),
    showExtras: bool(raw.showExtras, d.showExtras),
    showAddToCart: bool(raw.showAddToCart, d.showAddToCart),
    addToCartLabel: str(raw.addToCartLabel, d.addToCartLabel).slice(0, 40),
    dialogImageSide: raw.dialogImageSide === 'right' ? 'right' : 'left',
    dialogImageShare: num(raw.dialogImageShare, d.dialogImageShare, 30, 70),
    dialogWidthByDevice: normalizeDeviceNumberMap(raw.dialogWidthByDevice, 480, 1400),
  };
}

function hexOr(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^#([0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

function normalizeLangs(raw: unknown, fallback: MenuLang[]): MenuLang[] {
  return normalizeMenuLangList(raw, fallback);
}

function normalizeUiLabels(raw: unknown): Partial<Record<string, MenuLocalized>> {
  if (!isRec(raw)) return {};
  const out: Partial<Record<string, MenuLocalized>> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof key !== 'string' || key.length > 40) continue;
    out[key] = loc(val, {});
  }
  return out;
}

function normalizeBottomNavItems(raw: unknown): MenuBottomNavItem[] {
  const fallback = defaultBottomNavItems();
  if (!Array.isArray(raw)) return fallback;
  return MENU_BOTTOM_NAV_IDS.map((id) => {
    const found = raw.find((n) => isRec(n) && n.id === id);
    const def = fallback.find((n) => n.id === id)!;
    if (!isRec(found)) return def;
    return {
      id,
      enabled: bool(found.enabled, def.enabled),
      label: locFlexible(found.label, def.label),
    };
  });
}

export function createMenuBlock(type: MenuBlockType): MenuBlock {
  const id = rid();
  switch (type) {
    case 'header':
      return {
        id,
        type,
        showLogo: true,
        logoUrl: '',
        logoShape: 'round',
        logoSize: 40,
        logoWideRatio: 2.4,
        logoWidth: 40,
        logoHeight: 40,
        showName: true,
        showTable: true,
        sticky: true,
        showLanguages: true,
        languages: ['tr', 'en', 'ru'],
        defaultLanguage: 'tr',
        eyebrow: 'Menü',
        title: '',
        subtitle: '',
        align: 'left',
        uiLabels: {},
      };
    case 'cover':
      return {
        id,
        type,
        height: 180,
        heightByDevice: { mobile: 160, tablet: 200, desktop: 240 },
        overlay: 35,
        imageUrl: '',
      };
    case 'welcome':
      return {
        id,
        type,
        eyebrow: 'Hoş geldiniz',
        title: 'Hoş geldiniz. Menünüze göz atın.',
        subtitle: 'Saatler 10:00 — 01:00',
        locationLabel: '',
      };
    case 'search':
      return { id, type, placeholder: { tr: 'Menüde ara…', en: 'Search the menu…', ru: 'Поиск по меню…' } };
    case 'categories':
      return {
        id,
        type,
        title: { tr: 'Kategoriler', en: 'Categories', ru: 'Категории' },
        mode: 'grid',
        showImages: true,
        showCount: true,
        columns: 2,
        columnsByDevice: { mobile: 2, tablet: 3, desktop: 4 },
        columnsDesktop: 4,
        cardHeight: 92,
        cardHeightByDevice: undefined,
        imageAspect: 'wide',
        openOnClick: true,
      };
    case 'items':
      return {
        id,
        type,
        title: '',
        layout: 'split',
        columns: 1,
        columnsByDevice: { mobile: 1, tablet: 1, desktop: 2 },
        showImages: true,
        showPrice: true,
        showDescription: true,
        showBadges: true,
        showCalories: true,
        showPrepTime: false,
        scope: 'selected',
        productClick: 'detail',
        allowAddToCart: true,
        detail: defaultProductDetail(),
      };
    case 'text':
      return { id, type, text: 'Yeni metin', as: 'h2' };
    case 'image':
      return { id, type, url: '', alt: '', height: 160 };
    case 'divider':
      return { id, type, thickness: 1, color: '#e4ddd3' };
    case 'spacer':
      return { id, type, size: 24 };
    case 'footer':
      return { id, type, text: '', showBranding: false };
    case 'branchPicker':
      return { id, type, label: 'Şube' };
    case 'bottomNav':
      return {
        id,
        type,
        items: defaultBottomNavItems(),
        wifiSsid: '',
        wifiPassword: '',
        explore: defaultExplorePage(),
        suggestForm: defaultFeedbackForm('suggest'),
        complaintForm: defaultFeedbackForm('complaint'),
      };
  }
}

export function defaultDeviceFrames(
  maxWidth = 720,
  pagePadding = 16,
): Record<MenuDeviceId, MenuDeviceFrame> {
  return {
    mobile: {
      width: 390,
      height: 720,
      maxWidth: Math.min(390, maxWidth),
      pagePadding,
    },
    tablet: {
      width: 768,
      height: 900,
      maxWidth: Math.min(720, Math.max(maxWidth, 640)),
      pagePadding: Math.max(pagePadding, 20),
    },
    desktop: {
      width: 1100,
      height: 860,
      maxWidth: Math.max(maxWidth, 920),
      pagePadding: Math.max(pagePadding, 24),
    },
  };
}

export function resolveDeviceNumber(
  base: number,
  byDevice: Partial<Record<MenuDeviceId, number>> | undefined,
  device: MenuDeviceId,
): number {
  const v = byDevice?.[device];
  return typeof v === 'number' && Number.isFinite(v) ? v : base;
}

export function resolveBlockStyle(
  style: MenuBlockStyle | undefined,
  device: MenuDeviceId,
): MenuBlockStyleBase {
  if (!style) return {};
  const { byDevice, ...base } = style;
  return { ...base, ...(byDevice?.[device] ?? {}) };
}

export function resolveThemeForDevice(
  theme: MenuDocTheme,
  device: MenuDeviceId,
): MenuDocTheme & { frame: MenuDeviceFrame } {
  const frame = theme.devices?.[device] ?? defaultDeviceFrames(theme.maxWidth, theme.pagePadding)[device];
  return {
    ...theme,
    maxWidth: frame.maxWidth,
    pagePadding: frame.pagePadding,
    frame,
  };
}

export function defaultMenuDocTheme(brandColor?: string | null): MenuDocTheme {
  const palette = surfacePalette('paper');
  const pagePadding = 16;
  const maxWidth = 720;
  return {
    backgroundColor: palette.bg,
    surfaceColor: palette.panel,
    textColor: palette.ink,
    mutedColor: palette.muted,
    accentColor: /^#([0-9a-fA-F]{6})$/.test(brandColor ?? '')
      ? brandColor!
      : '#2f5d50',
    headingColor: palette.ink,
    fontPair: 'serif',
    radius: 'soft',
    pagePadding,
    maxWidth,
    devices: defaultDeviceFrames(maxWidth, pagePadding),
  };
}

/** @deprecated Geriye uyumluluk — yeni kod blokları kullanır */
export function defaultMenuChrome(): MenuChrome {
  return {
    enabled: true,
    languages: ['tr', 'en', 'ru'],
    defaultLanguage: 'tr',
    stickyHeader: true,
    showWelcome: true,
    welcomeEyebrow: 'Hoş geldiniz',
    welcomeTitle: 'Hoş geldiniz. Menünüze göz atın.',
    welcomeSubtitle: 'Saatler 10:00 — 01:00',
    locationLabel: '',
    productClick: 'detail',
    allowAddToCart: true,
    bottomNavEnabled: true,
    bottomNav: defaultBottomNavItems(),
    wifiSsid: '',
    wifiPassword: '',
    categoryColumnsDesktop: 6,
  };
}

export function createDefaultMenuDocument(
  preset: MenuThemePreset = 'editorial',
  brandColor?: string | null,
): MenuDocument {
  const config = defaultThemeConfig(preset, brandColor);
  const palette = surfacePalette(config.style.surfaceStyle);
  const drilldown = true;
  const blocks: MenuBlock[] = [];
  if (config.hero.showCover) blocks.push(createMenuBlock('cover'));
  const header = createMenuBlock('header');
  if (header.type === 'header') {
    header.showLogo = config.hero.showLogo;
    header.showTable = config.hero.showTableLabel;
    header.align = config.hero.align;
    header.eyebrow =
      preset === 'catalog' ? 'Keşfet' : preset === 'showcase' ? 'Vitrin' : 'Menü';
    blocks.push(header);
  }
  blocks.push(createMenuBlock('welcome'));
  blocks.push(createMenuBlock('search'));
  const cats = createMenuBlock('categories');
  if (cats.type === 'categories') {
    cats.mode = config.categoryNav.mode === 'sidebar' ? 'list' : config.categoryNav.mode;
    cats.showImages = config.categoryNav.showImages;
    cats.columns = config.categoryNav.columnsMobile;
    cats.columnsDesktop = config.categoryNav.columnsDesktop;
    cats.openOnClick = drilldown;
    blocks.push(cats);
  }
  const items = createMenuBlock('items');
  if (items.type === 'items') {
    items.layout = config.productCard.layout;
    items.showImages = config.productCard.showImages;
    items.showBadges = config.productCard.showBadges;
    items.showCalories = config.productCard.showCalories;
    items.showPrepTime = config.productCard.showPrepTime;
    items.scope = drilldown ? 'selected' : 'all';
    blocks.push(items);
  }
  const footer = createMenuBlock('footer');
  if (footer.type === 'footer') {
    footer.showBranding = false;
    blocks.push(footer);
  }
  blocks.push(createMenuBlock('bottomNav'));
  const maxWidth =
    config.page.containerWidth === 'narrow'
      ? 560
      : config.page.containerWidth === 'wide'
        ? 1100
        : 920;
  return {
    version: 2,
    navigation: 'drilldown',
    theme: {
      backgroundColor: palette.bg,
      surfaceColor: palette.panel,
      textColor: palette.ink,
      mutedColor: palette.muted,
      accentColor: config.style.accentColor,
      headingColor: palette.ink,
      fontPair: config.style.fontPair,
      radius: config.style.radius,
      pagePadding: 16,
      maxWidth,
      devices: defaultDeviceFrames(maxWidth, 16),
    },
    blocks,
  };
}

function normalizeDeviceNumberMap(
  raw: unknown,
  min: number,
  max: number,
): Partial<Record<MenuDeviceId, number>> | undefined {
  if (!isRec(raw)) return undefined;
  const out: Partial<Record<MenuDeviceId, number>> = {};
  for (const d of MENU_DEVICES) {
    if (raw[d] != null) out[d] = num(raw[d], min, min, max);
  }
  return Object.keys(out).length ? out : undefined;
}

/** Sütun düzeni (Mobil=base, Tablet=md, Masaüstü=xl …); geçersiz değerler atılır */
function normalizeGridCols(raw: unknown): MenuGridCols | undefined {
  if (!isRec(raw)) return undefined;
  const clamp = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(6, Math.round(v))) : undefined;
  const base = clamp(raw.base);
  if (base == null) return undefined;
  const out: MenuGridCols = { base };
  for (const k of ['sm', 'md', 'lg', 'xl', '2xl'] as const) {
    const v = clamp(raw[k]);
    if (v != null) out[k] = v;
  }
  return out;
}

function normalizeStyleBase(raw: Record<string, unknown>): MenuBlockStyleBase {
  const style: MenuBlockStyleBase = {};
  if (raw.paddingTop != null) style.paddingTop = num(raw.paddingTop, 0, 0, 120);
  if (raw.paddingBottom != null) style.paddingBottom = num(raw.paddingBottom, 0, 0, 120);
  if (raw.paddingX != null) style.paddingX = num(raw.paddingX, 0, 0, 80);
  if (typeof raw.background === 'string') style.background = raw.background;
  if (typeof raw.color === 'string') style.color = raw.color;
  if (raw.textAlign === 'left' || raw.textAlign === 'center' || raw.textAlign === 'right') {
    style.textAlign = raw.textAlign;
  }
  if (raw.fontSize != null) style.fontSize = num(raw.fontSize, 16, 10, 64);
  if (raw.fontWeight != null) style.fontWeight = num(raw.fontWeight, 400, 300, 800);
  if (raw.borderRadius != null) style.borderRadius = num(raw.borderRadius, 0, 0, 48);
  if (raw.gap != null) style.gap = num(raw.gap, 8, 0, 48);
  if (typeof raw.hidden === 'boolean') style.hidden = raw.hidden;
  return style;
}

function normalizeStyle(raw: unknown): MenuBlockStyle | undefined {
  if (!isRec(raw)) return undefined;
  const style: MenuBlockStyle = normalizeStyleBase(raw);
  if (isRec(raw.byDevice)) {
    const byDevice: Partial<Record<MenuDeviceId, MenuBlockStyleBase>> = {};
    for (const d of MENU_DEVICES) {
      if (isRec(raw.byDevice[d])) {
        byDevice[d] = normalizeStyleBase(raw.byDevice[d] as Record<string, unknown>);
      }
    }
    if (Object.keys(byDevice).length) style.byDevice = byDevice;
  }
  return Object.keys(style).length ? style : undefined;
}

function normalizeDeviceFrames(
  raw: unknown,
  fallbackMaxWidth: number,
  fallbackPadding: number,
): Record<MenuDeviceId, MenuDeviceFrame> {
  const defaults = defaultDeviceFrames(fallbackMaxWidth, fallbackPadding);
  if (!isRec(raw)) return defaults;
  const out = { ...defaults };
  for (const d of MENU_DEVICES) {
    const src = isRec(raw[d]) ? raw[d] : {};
    out[d] = {
      width: num(src.width, defaults[d].width, 280, 1600),
      height: num(src.height, defaults[d].height, 400, 1400),
      maxWidth: num(src.maxWidth, defaults[d].maxWidth, 280, 1400),
      pagePadding: num(src.pagePadding, defaults[d].pagePadding, 0, 64),
      ...(src.fullWidth === true ? { fullWidth: true } : {}),
    };
  }
  return out;
}

function normalizeBlock(raw: unknown): MenuBlock | null {
  if (!isRec(raw)) return null;
  const type = str(raw.type, '') as MenuBlockType;
  if (!(MENU_BLOCK_TYPES as readonly string[]).includes(type)) return null;
  const base = createMenuBlock(type);
  const style = normalizeStyle(raw.style);
  const merged = { ...base, id: str(raw.id, base.id), ...(style ? { style } : {}) };
  switch (merged.type) {
    case 'header': {
      const logoShape =
        raw.logoShape === 'square' || raw.logoShape === 'wide'
          ? raw.logoShape
          : 'round';
      const logoSize = num(raw.logoSize, merged.logoSize, 24, 96);
      const logoWideRatio = num(
        raw.logoWideRatio,
        merged.logoWideRatio,
        1.6,
        4,
      );
      const legacyW =
        logoShape === 'wide' ? Math.round(logoSize * logoWideRatio) : logoSize;
      return {
        ...merged,
        showLogo: bool(raw.showLogo, merged.showLogo),
        logoUrl: str(raw.logoUrl, merged.logoUrl),
        logoShape,
        logoSize,
        logoWideRatio,
        logoWidth: num(raw.logoWidth, legacyW, 24, 280),
        logoHeight: num(raw.logoHeight, logoSize, 24, 160),
        logoWidthByDevice: normalizeDeviceNumberMap(raw.logoWidthByDevice, 24, 280),
        logoHeightByDevice: normalizeDeviceNumberMap(raw.logoHeightByDevice, 24, 160),
        showName: bool(raw.showName, merged.showName),
        showTable: bool(raw.showTable, merged.showTable),
        sticky: bool(raw.sticky, merged.sticky),
        showLanguages: bool(raw.showLanguages, merged.showLanguages),
        languages: normalizeLangs(raw.languages, merged.languages),
        defaultLanguage: (() => {
          const langs = normalizeLangs(raw.languages, merged.languages);
          const def = normalizeMenuLangCode(
            raw.defaultLanguage,
            merged.defaultLanguage || 'tr',
          );
          return langs.includes(def) ? def : langs[0]!;
        })(),
        eyebrow: str(raw.eyebrow, merged.eyebrow),
        title: str(raw.title, merged.title),
        subtitle: str(raw.subtitle, merged.subtitle),
        align: raw.align === 'center' ? 'center' : 'left',
        uiLabels: normalizeUiLabels(raw.uiLabels ?? merged.uiLabels),
      };
    }
    case 'cover':
      return {
        ...merged,
        height: num(raw.height, merged.height, 80, 420),
        heightByDevice: normalizeDeviceNumberMap(raw.heightByDevice, 80, 420),
        overlay: num(raw.overlay, merged.overlay, 0, 80),
        imageUrl: str(raw.imageUrl, merged.imageUrl),
      };
    case 'welcome':
      return {
        ...merged,
        eyebrow: str(raw.eyebrow, merged.eyebrow),
        title: str(raw.title, merged.title),
        subtitle: str(raw.subtitle, merged.subtitle),
        locationLabel: str(raw.locationLabel, merged.locationLabel),
      };
    case 'search':
      return { ...merged, placeholder: loc(raw.placeholder, merged.placeholder) };
    case 'categories': {
      const columnsDesktop = num(raw.columnsDesktop, merged.columnsDesktop, 2, 8);
      const columnsByDevice =
        normalizeDeviceNumberMap(raw.columnsByDevice, 1, 8) ?? {
          mobile: num(raw.columns, merged.columns, 1, 4),
          tablet: Math.min(4, columnsDesktop),
          desktop: columnsDesktop,
        };
      return {
        ...merged,
        title: locFlexible(raw.title, merged.title),
        mode:
          raw.mode === 'chips' || raw.mode === 'list' || raw.mode === 'grid'
            ? raw.mode
            : merged.mode,
        showImages: bool(raw.showImages, merged.showImages),
        showCount: bool(raw.showCount, merged.showCount),
        columns: num(raw.columns, merged.columns, 1, 4),
        columnsByDevice,
        columnsDesktop,
        cardHeight: num(raw.cardHeight, merged.cardHeight, 48, 220),
        cardHeightByDevice: normalizeDeviceNumberMap(raw.cardHeightByDevice, 48, 220),
        imageAspect:
          raw.imageAspect === 'square' || raw.imageAspect === 'tall'
            ? raw.imageAspect
            : 'wide',
        openOnClick: bool(raw.openOnClick, merged.openOnClick),
        ...(normalizeGridCols(raw.gridCols) ? { gridCols: normalizeGridCols(raw.gridCols) } : {}),
      };
    }
    case 'items':
      return {
        ...merged,
        title: str(raw.title, merged.title),
        layout:
          raw.layout === 'compact' ||
          raw.layout === 'card' ||
          raw.layout === 'imageFirst' ||
          raw.layout === 'split'
            ? raw.layout
            : merged.layout,
        columns: num(raw.columns, merged.columns, 1, 3),
        columnsByDevice:
          normalizeDeviceNumberMap(raw.columnsByDevice, 1, 4) ?? {
            mobile: num(raw.columns, merged.columns, 1, 3),
            tablet: num(raw.columns, merged.columns, 1, 3) === 1 ? 1 : Math.min(3, num(raw.columns, merged.columns, 1, 3) + 1),
            desktop:
              num(raw.columns, merged.columns, 1, 3) === 1
                ? 2
                : Math.min(4, num(raw.columns, merged.columns, 1, 3) + 1),
          },
        showImages: bool(raw.showImages, merged.showImages),
        showPrice: bool(raw.showPrice, merged.showPrice),
        showDescription: bool(raw.showDescription, merged.showDescription),
        showBadges: bool(raw.showBadges, merged.showBadges),
        showCalories: bool(raw.showCalories, merged.showCalories),
        showPrepTime: bool(raw.showPrepTime, merged.showPrepTime),
        scope: raw.scope === 'all' ? 'all' : 'selected',
        productClick:
          raw.productClick === 'cart' || raw.productClick === 'none'
            ? raw.productClick
            : 'detail',
        allowAddToCart: bool(raw.allowAddToCart, merged.allowAddToCart),
        detail: normalizeProductDetail(raw.detail ?? merged.detail),
        ...(typeof raw.showVariants === 'boolean' ? { showVariants: raw.showVariants } : {}),
        ...(normalizeGridCols(raw.gridCols) ? { gridCols: normalizeGridCols(raw.gridCols) } : {}),
      };
    case 'text':
      return {
        ...merged,
        text: str(raw.text, merged.text),
        as: raw.as === 'p' ? 'p' : 'h2',
      };
    case 'image':
      return {
        ...merged,
        url: str(raw.url, merged.url),
        alt: str(raw.alt, merged.alt),
        height: num(raw.height, merged.height, 40, 480),
        heightByDevice: normalizeDeviceNumberMap(raw.heightByDevice, 40, 480),
      };
    case 'divider':
      return {
        ...merged,
        thickness: num(raw.thickness, merged.thickness, 1, 8),
        color: hexOr(raw.color, merged.color),
      };
    case 'spacer':
      return {
        ...merged,
        size: num(raw.size, merged.size, 4, 160),
        sizeByDevice: normalizeDeviceNumberMap(raw.sizeByDevice, 4, 160),
      };
    case 'footer':
      return {
        ...merged,
        text: str(raw.text, merged.text),
        showBranding: bool(raw.showBranding, merged.showBranding),
      };
    case 'branchPicker':
      return { ...merged, label: str(raw.label, merged.label) };
    case 'bottomNav':
      return {
        ...merged,
        items: normalizeBottomNavItems(raw.items),
        wifiSsid: str(raw.wifiSsid, merged.wifiSsid),
        wifiPassword: str(raw.wifiPassword, merged.wifiPassword),
        explore: normalizeExplorePage(raw.explore ?? merged.explore),
        suggestForm: normalizeFeedbackForm(
          raw.suggestForm ?? merged.suggestForm,
        ),
        complaintForm: normalizeFeedbackForm(
          raw.complaintForm ?? merged.complaintForm,
        ),
      };
  }
}

/** Eski chrome alanını yeni bloklara taşır (tek seferlik migrate). */
function migrateLegacyChrome(blocks: MenuBlock[], chromeRaw: unknown): MenuBlock[] {
  if (!isRec(chromeRaw) || chromeRaw.enabled === false) return blocks;
  let next = [...blocks];
  const langs = normalizeLangs(chromeRaw.languages, ['tr', 'en', 'ru']);
  const defLang = (() => {
    const def = normalizeMenuLangCode(chromeRaw.defaultLanguage, 'tr');
    return langs.includes(def) ? def : langs[0]!;
  })();

  const header = next.find((b) => b.type === 'header');
  if (header?.type === 'header') {
    header.sticky = bool(chromeRaw.stickyHeader, true);
    header.showLanguages = true;
    header.languages = langs;
    header.defaultLanguage = defLang;
  }

  if (!next.some((b) => b.type === 'welcome') && bool(chromeRaw.showWelcome, true)) {
    const welcome = createMenuBlock('welcome');
    if (welcome.type === 'welcome') {
      welcome.eyebrow = str(chromeRaw.welcomeEyebrow, welcome.eyebrow);
      welcome.title = str(chromeRaw.welcomeTitle, welcome.title);
      welcome.subtitle = str(chromeRaw.welcomeSubtitle, welcome.subtitle);
      welcome.locationLabel = str(chromeRaw.locationLabel, welcome.locationLabel);
      const hi = next.findIndex((b) => b.type === 'header');
      next.splice(hi >= 0 ? hi + 1 : 0, 0, welcome);
    }
  }

  for (const b of next) {
    if (b.type === 'categories') {
      b.columnsDesktop = num(
        chromeRaw.categoryColumnsDesktop,
        b.columnsDesktop,
        2,
        8,
      );
    }
    if (b.type === 'items') {
      b.productClick =
        chromeRaw.productClick === 'cart' || chromeRaw.productClick === 'none'
          ? chromeRaw.productClick
          : 'detail';
      b.allowAddToCart = bool(chromeRaw.allowAddToCart, true);
    }
  }

  if (
    bool(chromeRaw.bottomNavEnabled, true) &&
    !next.some((b) => b.type === 'bottomNav')
  ) {
    const nav = createMenuBlock('bottomNav');
    if (nav.type === 'bottomNav') {
      nav.items = normalizeBottomNavItems(chromeRaw.bottomNav);
      nav.wifiSsid = str(chromeRaw.wifiSsid, '');
      nav.wifiPassword = str(chromeRaw.wifiPassword, '');
      next.push(nav);
    }
  }

  return next;
}

export function isMenuDocument(raw: unknown): raw is MenuDocument {
  return (
    isRec(raw) &&
    Array.isArray(raw.blocks) &&
    (raw.version === 2 || raw.version === '2' || raw.blocks.length > 0)
  );
}

export function normalizeMenuDocument(
  raw: unknown,
  preset: MenuThemePreset = 'editorial',
  brandColor?: string | null,
): MenuDocument {
  if (!isMenuDocument(raw) && isRec(raw) && raw.hero && raw.categoryNav) {
    const config = mergeThemeConfig(preset, raw, brandColor);
    return menuDocumentFromThemeConfig(preset, config);
  }
  if (!isRec(raw) || !Array.isArray(raw.blocks)) {
    return createDefaultMenuDocument(preset, brandColor);
  }
  const fallback = defaultMenuDocTheme(brandColor);
  const themeSrc = isRec(raw.theme) ? raw.theme : {};
  let blocks = raw.blocks
    .map((b) => normalizeBlock(b))
    .filter((b): b is MenuBlock => !!b);
  if (raw.chrome) {
    blocks = migrateLegacyChrome(blocks, raw.chrome);
  }
  const pagePadding = num(themeSrc.pagePadding, fallback.pagePadding, 8, 48);
  const maxWidth = num(themeSrc.maxWidth, fallback.maxWidth, 360, 1400);
  return {
    version: 2,
    navigation: raw.navigation === 'scroll' ? 'scroll' : 'drilldown',
    theme: {
      backgroundColor: hexOr(themeSrc.backgroundColor, fallback.backgroundColor),
      surfaceColor: hexOr(themeSrc.surfaceColor, fallback.surfaceColor),
      textColor: hexOr(themeSrc.textColor, fallback.textColor),
      mutedColor: hexOr(themeSrc.mutedColor, fallback.mutedColor),
      accentColor: hexOr(themeSrc.accentColor, fallback.accentColor),
      headingColor: hexOr(themeSrc.headingColor, fallback.headingColor),
      fontPair:
        ['sans', 'display', 'mono', 'grotesk', 'rounded'].includes(themeSrc.fontPair as string)
          ? (themeSrc.fontPair as 'sans' | 'display' | 'mono' | 'grotesk' | 'rounded')
          : 'serif',
      radius:
        themeSrc.radius === 'sharp' || themeSrc.radius === 'round'
          ? themeSrc.radius
          : 'soft',
      pagePadding,
      maxWidth,
      devices: normalizeDeviceFrames(themeSrc.devices, maxWidth, pagePadding),
      overlays: normalizeOverlays(themeSrc.overlays),
    },
    blocks: blocks.length ? blocks : createDefaultMenuDocument(preset, brandColor).blocks,
  };
}

export function menuDocumentFromThemeConfig(
  preset: MenuThemePreset,
  config: MenuThemeConfig,
): MenuDocument {
  const doc = createDefaultMenuDocument(preset);
  const header = doc.blocks.find((b) => b.type === 'header');
  if (header?.type === 'header') {
    header.showLogo = config.hero.showLogo;
    header.showTable = config.hero.showTableLabel;
    header.align = config.hero.align;
  }
  const cats = doc.blocks.find((b) => b.type === 'categories');
  if (cats?.type === 'categories') {
    cats.mode = config.categoryNav.mode === 'sidebar' ? 'list' : config.categoryNav.mode;
    cats.showImages = config.categoryNav.showImages;
    cats.columns = config.categoryNav.columnsMobile;
    cats.openOnClick = true;
  }
  const items = doc.blocks.find((b) => b.type === 'items');
  if (items?.type === 'items') {
    items.layout = config.productCard.layout;
    items.showImages = config.productCard.showImages;
    items.showBadges = config.productCard.showBadges;
    items.showCalories = config.productCard.showCalories;
    items.showPrepTime = config.productCard.showPrepTime;
  }
  const palette = surfacePalette(config.style.surfaceStyle);
  doc.theme = {
    ...doc.theme,
    backgroundColor: palette.bg,
    surfaceColor: palette.panel,
    textColor: palette.ink,
    mutedColor: palette.muted,
    accentColor: config.style.accentColor,
    headingColor: palette.ink,
    fontPair: config.style.fontPair,
    radius: config.style.radius,
  };
  if (!config.hero.showCover) {
    doc.blocks = doc.blocks.filter((b) => b.type !== 'cover');
  }
  return doc;
}

export function resolveMenuDocument(
  presetRaw: unknown,
  configRaw: unknown,
  brandColor?: string | null,
): MenuDocument {
  const preset = normalizeMenuThemePreset(presetRaw);
  return normalizeMenuDocument(configRaw, preset, brandColor);
}

export function moveMenuBlock(
  doc: MenuDocument,
  id: string,
  dir: -1 | 1,
): MenuDocument {
  const i = doc.blocks.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= doc.blocks.length) return doc;
  const blocks = [...doc.blocks];
  const [row] = blocks.splice(i, 1);
  blocks.splice(j, 0, row!);
  return { ...doc, blocks };
}

export function removeMenuBlock(doc: MenuDocument, id: string): MenuDocument {
  return { ...doc, blocks: doc.blocks.filter((b) => b.id !== id) };
}

export function patchMenuBlock(
  doc: MenuDocument,
  id: string,
  patch: Partial<MenuBlock>,
): MenuDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b) => {
      if (b.id !== id) return b;
      const next = { ...b, ...patch } as MenuBlock;
      if (
        b.type === 'items' &&
        next.type === 'items' &&
        isRec((patch as Partial<MenuItemsBlock>).detail)
      ) {
        next.detail = {
          ...defaultProductDetail(),
          ...b.detail,
          ...(patch as Partial<MenuItemsBlock>).detail,
        };
      }
      return next;
    }),
  };
}

export function insertMenuBlock(
  doc: MenuDocument,
  type: MenuBlockType,
  afterId?: string | null,
): MenuDocument {
  const block = createMenuBlock(type);
  if (!afterId) return { ...doc, blocks: [...doc.blocks, block] };
  const i = doc.blocks.findIndex((b) => b.id === afterId);
  if (i < 0) return { ...doc, blocks: [...doc.blocks, block] };
  const blocks = [...doc.blocks];
  blocks.splice(i + 1, 0, block);
  return { ...doc, blocks };
}
