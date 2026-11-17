import type { MenuContentI18n, MenuLang, MenuLocalized } from "@ngl/shared";
import { pickContentName, pickMenuLocale } from "@ngl/shared";

export type MenuUiKey =
  | "selectCategory"
  | "products"
  | "product"
  | "back"
  | "search"
  | "cart"
  | "suggest"
  | "complaint"
  | "wifi"
  | "explore"
  | "waiter"
  | "addToCart"
  | "added"
  | "emptyCart"
  | "clearCart"
  | "close"
  | "send"
  | "message"
  | "name"
  | "thanks"
  | "copy"
  | "copied"
  | "callWaiter"
  | "callWaiterHint"
  | "wifiHint"
  | "noItems"
  | "variants"
  | "extras"
  | "allergens"
  | "kcal"
  | "minutes"
  | "disclaimer"
  | "sendFailed";

const DICT: Record<string, Record<MenuUiKey, string>> = {
  tr: {
    selectCategory: "Kategori seçin",
    products: "ürün",
    product: "Ürün",
    back: "Geri",
    search: "Menüde ara…",
    cart: "Sepet",
    suggest: "Öneri",
    complaint: "Şikayet",
    wifi: "Wi-Fi",
    explore: "Keşfet",
    waiter: "Garson",
    addToCart: "Sepete ekle",
    added: "Eklendi",
    emptyCart: "Sepetiniz boş",
    clearCart: "Temizle",
    close: "Kapat",
    send: "Gönder",
    message: "Mesajınız",
    name: "Adınız",
    thanks: "Teşekkürler, iletildi.",
    copy: "Kopyala",
    copied: "Kopyalandı",
    callWaiter: "Garson çağır",
    callWaiterHint: "Masaya garson isteniyor olarak işaretlenecek.",
    wifiHint: "Ağa bağlanmak için bilgileri kullanın.",
    noItems: "Bu kategoride ürün yok.",
    variants: "Seçenekler",
    extras: "Ekstralar",
    allergens: "Alerjenler",
    kcal: "kcal",
    minutes: "dk",
    disclaimer:
      "Görseller yalnızca temalı amaçlıdır; sunumda farklılık gösterebilir.",
    sendFailed: "Gönderilemedi, tekrar deneyin.",
  },
  en: {
    selectCategory: "Choose a category",
    products: "items",
    product: "Product",
    back: "Back",
    search: "Search the menu…",
    cart: "Cart",
    suggest: "Suggest",
    complaint: "Complaint",
    wifi: "Wi-Fi",
    explore: "Explore",
    waiter: "Waiter",
    addToCart: "Add to cart",
    added: "Added",
    emptyCart: "Your cart is empty",
    clearCart: "Clear",
    close: "Close",
    send: "Send",
    message: "Your message",
    name: "Your name",
    thanks: "Thanks, we received it.",
    copy: "Copy",
    copied: "Copied",
    callWaiter: "Call waiter",
    callWaiterHint: "We'll flag that a waiter is needed at your table.",
    wifiHint: "Use these details to join the network.",
    noItems: "No items in this category.",
    variants: "Options",
    extras: "Extras",
    allergens: "Allergens",
    kcal: "kcal",
    minutes: "min",
    disclaimer: "Images are for illustration; presentation may vary.",
    sendFailed: "Could not send. Try again.",
  },
  ru: {
    selectCategory: "Выберите категорию",
    products: "поз.",
    product: "Блюдо",
    back: "Назад",
    search: "Поиск по меню…",
    cart: "Корзина",
    suggest: "Идея",
    complaint: "Жалоба",
    wifi: "Wi-Fi",
    explore: "Обзор",
    waiter: "Официант",
    addToCart: "В корзину",
    added: "Добавлено",
    emptyCart: "Корзина пуста",
    clearCart: "Очистить",
    close: "Закрыть",
    send: "Отправить",
    message: "Сообщение",
    name: "Имя",
    thanks: "Спасибо, мы получили.",
    copy: "Копировать",
    copied: "Скопировано",
    callWaiter: "Позвать официанта",
    callWaiterHint: "Мы отметим, что к столу нужен официант.",
    wifiHint: "Подключитесь с этими данными.",
    noItems: "В этой категории нет блюд.",
    variants: "Варианты",
    extras: "Дополнительно",
    allergens: "Аллергены",
    kcal: "ккал",
    minutes: "мин",
    disclaimer: "Фото иллюстративные; подача может отличаться.",
    sendFailed: "Не удалось отправить. Попробуйте ещё раз.",
  },
};

export type MenuUiLabels = Partial<Record<string, MenuLocalized>>;

export function t(
  lang: MenuLang,
  key: MenuUiKey,
  uiLabels?: MenuUiLabels | null,
): string {
  const custom = uiLabels?.[key]
    ? pickMenuLocale(uiLabels[key], lang, "")
    : "";
  if (custom) return custom;
  return (
    DICT[lang]?.[key] ??
    DICT.en?.[key] ??
    DICT.tr?.[key] ??
    key
  );
}

/** Alt menü öğesinin dil bazlı etiketi — drawer başlığı için */
export function navItemLabel(
  item:
    | { id: string; label: MenuLocalized | string }
    | null
    | undefined,
  lang: MenuLang,
  fallback: string,
): string {
  if (!item) return fallback;
  const map =
    typeof item.label === "string" ? { tr: item.label } : (item.label ?? {});
  return pickMenuLocale(map, lang, fallback);
}

/** Builder: düzenlenebilir arayüz anahtarları */
export const MENU_UI_LABEL_KEYS: { key: MenuUiKey; label: string }[] = [
  { key: "selectCategory", label: "Kategoriler başlığı" },
  { key: "back", label: "Geri" },
  { key: "search", label: "Arama placeholder" },
  { key: "products", label: "Ürün sayısı eki" },
  { key: "product", label: "Ürün" },
  { key: "noItems", label: "Boş kategori" },
  { key: "addToCart", label: "Sepete ekle" },
  { key: "cart", label: "Sepet" },
  { key: "emptyCart", label: "Boş sepet" },
  { key: "clearCart", label: "Sepeti temizle" },
  { key: "close", label: "Kapat" },
  { key: "suggest", label: "Öneri" },
  { key: "complaint", label: "Şikayet" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "wifiHint", label: "Wi-Fi açıklama" },
  { key: "explore", label: "Keşfet" },
  { key: "waiter", label: "Garson" },
  { key: "callWaiter", label: "Garson çağır" },
  { key: "callWaiterHint", label: "Garson ipucu" },
  { key: "allergens", label: "Alerjenler" },
  { key: "variants", label: "Seçenekler" },
  { key: "extras", label: "Ekstralar" },
  { key: "send", label: "Gönder" },
  { key: "thanks", label: "Teşekkür" },
  { key: "copy", label: "Kopyala" },
  { key: "copied", label: "Kopyalandı" },
];

export function localizedName(
  lang: MenuLang,
  name: string,
  nameTr: string | null | undefined,
  nameEn: string | null | undefined,
  translations?: MenuContentI18n | null,
): string {
  return pickContentName(lang, name, nameTr, nameEn, translations);
}