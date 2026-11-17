"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  createDefaultMenuDocument,
  defaultExplorePage,
  defaultProductDetail,
  getMenuLangMeta,
  normalizeMenuDocument,
  pickContentDescription,
  pickMenuLocale,
  resolveBlockStyle,
  resolveDeviceNumber,
  resolveThemeForDevice,
  type MenuBlock,
  type MenuBlockStyleBase,
  type MenuBottomNavBlock,
  type MenuDeviceId,
  type MenuDocument,
  type MenuHeaderBlock,
  type MenuItemsBlock,
  type MenuLang,
  type MenuLogoShape,
  type MenuProductDetail,
  type MenuProductImageAspect,
} from "@ngl/shared";
import type {
  PublicMenuPayload,
  MenuCategoryData,
  MenuItemData,
  MenuThemeCanvasProps,
  MenuVariant,
} from "./menu-theme-types";
import { localizedName, navItemLabel, t, type MenuUiLabels } from "./menu-i18n";
import {
  ExplorePage,
  FeedbackForm,
  MenuBottomNav,
  MenuSheet,
  WifiCredentials,
  useMenuInteractions,
} from "./menu-venue-actions";
import { resolvePublicAssetUrl } from "@/lib/public-urls";

const FONT_HREF: Record<string, string> = {
  serif:
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap",
  sans: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500&display=swap",
  display:
    "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500;1,700&family=Figtree:wght@400;500;600&display=swap",
};

function fontsOf(pair: MenuDocument["theme"]["fontPair"]) {
  if (pair === "serif") {
    return { display: '"Fraunces", Georgia, serif', body: '"Source Serif 4", Georgia, serif' };
  }
  if (pair === "display") {
    return { display: '"Playfair Display", Georgia, serif', body: '"Figtree", sans-serif' };
  }
  return { display: '"Manrope", sans-serif', body: '"IBM Plex Sans", sans-serif' };
}

function radiusCss(r: MenuDocument["theme"]["radius"]) {
  return r === "sharp" ? "4px" : r === "round" ? "22px" : "12px";
}

function detectDevice(): MenuDeviceId {
  if (typeof window === "undefined") return "mobile";
  const w = window.innerWidth;
  if (w >= 1024) return "desktop";
  if (w >= 768) return "tablet";
  return "mobile";
}

function aspectCss(aspect: "wide" | "square" | "tall" | undefined): string {
  if (aspect === "square") return "1 / 1";
  if (aspect === "tall") return "3 / 4";
  return "4 / 3";
}

function productAspectCss(aspect: MenuProductImageAspect): string {
  if (aspect === "square") return "1 / 1";
  if (aspect === "tall") return "3 / 4";
  if (aspect === "hero") return "4 / 5";
  return "16 / 10";
}

/** Her yüklenen görseli kart içinde eşit kırpar (oran yükleme boyutundan bağımsız) */
function FitImage({
  src,
  alt = "",
  radius,
  aspect,
  className,
}: {
  src: string;
  alt?: string;
  radius?: string | number;
  aspect: string;
  className?: string;
}) {
  // "4 / 3" | "1 / 1" | "16 / 10" → padding-% for reliable grid sizing
  const parts = aspect.split("/").map((p) => Number(p.trim()));
  const w = parts[0] && Number.isFinite(parts[0]) ? parts[0] : 4;
  const h = parts[1] && Number.isFinite(parts[1]) ? parts[1] : 3;
  const pad = `${(h / w) * 100}%`;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: pad,
        overflow: "hidden",
        borderRadius: radius,
        background: "rgba(128,128,128,0.2)",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvePublicAssetUrl(src)}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}

function logoBox(block: MenuHeaderBlock): { width: number; height: number; radius: string } {
  const height = Math.max(24, Math.min(160, block.logoHeight || block.logoSize || 40));
  const width = Math.max(24, Math.min(280, block.logoWidth || (() => {
    const shape: MenuLogoShape = block.logoShape || "round";
    if (shape === "wide") {
      const ratio = Math.max(1.6, Math.min(4, block.logoWideRatio || 2.4));
      return Math.round(height * ratio);
    }
    return height;
  })()));
  const shape: MenuLogoShape = block.logoShape || "round";
  const radius =
    shape === "round" ? "999px" : shape === "square" ? "10px" : "0px";
  return { width, height, radius };
}

function BrandLogo({
  src,
  block,
}: {
  src: string;
  block: MenuHeaderBlock;
}) {
  const box = logoBox(block);
  return (
    <div
      style={{
        width: box.width,
        height: box.height,
        borderRadius: box.radius,
        overflow: "hidden",
        flexShrink: 0,
        background: "transparent",
        position: "relative",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvePublicAssetUrl(src)}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}

/** Varyasyon adı: dile göre çeviri varsa onu, yoksa ana adı kullan. */
function variantLabel(v: MenuVariant, lang: MenuLang): string {
  return v.translations?.[lang]?.name?.trim() || v.name;
}

/** Seçenekler ve ekstralar — premium kartlar. Fiyat etkisi (+₺) ayrı rozetle gösterilir. */
function VariantsSection({
  variants,
  lang,
  theme,
  showOptions,
  showExtras,
}: {
  variants: MenuVariant[];
  lang: MenuLang;
  theme: MenuDocument["theme"];
  showOptions: boolean;
  showExtras: boolean;
}) {
  const options = showOptions ? variants.filter((v) => v.kind !== "extra") : [];
  const extras = showExtras ? variants.filter((v) => v.kind === "extra") : [];
  if (!options.length && !extras.length) return null;
  const line = `${theme.textColor}12`;
  return (
    <div className="mb-6 space-y-5">
      {options.length ? (
        <section>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.mutedColor }}>
            {t(lang, "variants")}
          </p>
          <ul className="overflow-hidden rounded-2xl" style={{ background: `${theme.textColor}06`, boxShadow: `inset 0 0 0 1px ${line}` }}>
            {options.map((v, i) => (
              <li
                key={`${v.name}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 text-[15px]"
                style={{ color: theme.textColor, borderTop: i ? `1px solid ${line}` : undefined }}
              >
                <span>{variantLabel(v, lang)}</span>
                <span className="font-semibold tabular-nums">₺{Number(v.price).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {extras.length ? (
        <section>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.mutedColor }}>
            {t(lang, "extras")}
          </p>
          <ul className="grid gap-2">
            {extras.map((v, i) => (
              <li
                key={`${v.name}-${i}`}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: theme.surfaceColor, boxShadow: `inset 0 0 0 1px ${line}` }}
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ background: `${theme.accentColor}18`, color: theme.accentColor }}
                >
                  +
                </span>
                <span className="min-w-0 flex-1 text-[15px]" style={{ color: theme.textColor }}>
                  {variantLabel(v, lang)}
                </span>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums"
                  style={{ background: theme.accentColor, color: theme.backgroundColor }}
                >
                  +₺{Number(v.price).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProductDetailView({
  item,
  theme,
  fonts,
  lang,
  uiLabels,
  pagePadding,
  detail,
  onBack,
  onAddToCart,
  hideBack,
}: {
  item: MenuItemData;
  theme: MenuDocument["theme"];
  fonts: { display: string; body: string };
  lang: MenuLang;
  uiLabels?: MenuUiLabels;
  pagePadding: number;
  detail: MenuProductDetail;
  onBack: () => void;
  onAddToCart?: () => void;
  hideBack?: boolean;
}) {
  const name = localizedName(lang, item.name, item.nameTr, item.nameEn, item.translations);
  const description = pickContentDescription(lang, item.description, item.translations);
  const btnLabel = detail.addToCartLabel.trim() || t(lang, "addToCart", uiLabels);
  const muted = theme.mutedColor;
  const line = `${theme.textColor}12`;
  const extrasTotal = (item.variants ?? [])
    .filter((v) => v.kind === "extra")
    .reduce((s, v) => s + (Number(v.price) || 0), 0);
  const tiles: { label: string; value: string }[] = [];
  if (detail.showCalories && item.calories != null) tiles.push({ label: t(lang, "kcal"), value: String(item.calories) });
  if (detail.showPrepTime && item.prepTimeMin != null) tiles.push({ label: t(lang, "minutes"), value: String(item.prepTimeMin) });
  if (detail.showAllergens && item.allergens?.length) tiles.push({ label: t(lang, "allergens"), value: String(item.allergens.length) });

  return (
    <div className="flex min-h-full flex-col">
      {hideBack ? null : (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex min-h-10 items-center gap-1.5 self-start rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: muted, background: `${theme.textColor}08` }}
        >
          ← {t(lang, "back", uiLabels)}
        </button>
      )}

      {detail.showImage && item.imageUrl ? (
        <div
          className="relative -mx-1 mb-4 overflow-hidden"
          style={{
            margin: detail.imageBleed ? `0 -${pagePadding}px 20px` : "0 0 20px",
            borderRadius: detail.imageBleed ? 0 : detail.imageRadius + 6,
          }}
        >
          <FitImage src={item.imageUrl} alt={name} aspect={productAspectCss(detail.imageAspect)} radius={0} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }}
          />
          {detail.showPrice ? (
            <div
              className="absolute bottom-3 right-3 flex items-baseline gap-1 rounded-2xl px-4 py-2 shadow-lg"
              style={{ background: theme.accentColor, color: theme.backgroundColor }}
            >
              <span className="text-[22px] font-bold leading-none tabular-nums">₺{Number(item.price).toFixed(0)}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {detail.showName ? (
        <h1
          className="text-[30px] leading-[1.08] tracking-[-0.02em]"
          style={{ fontFamily: fonts.display, fontWeight: 600, color: theme.textColor }}
        >
          {name}
        </h1>
      ) : (
        <p className="mb-1 text-sm font-medium" style={{ color: muted }}>{name}</p>
      )}

      {(!detail.showPrice || !detail.showImage || !item.imageUrl) && detail.showPrice ? (
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums" style={{ color: theme.accentColor }}>
            ₺{Number(item.price).toFixed(0)}
          </span>
        </div>
      ) : null}
      {detail.showPrice && extrasTotal > 0 ? (
        <p className="mt-1 text-xs" style={{ color: muted }}>
          Ekstralarla toplam ₺{(Number(item.price) + extrasTotal).toFixed(0)}
        </p>
      ) : null}

      {detail.showBadges && item.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 8).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: `${theme.accentColor}12`, color: theme.accentColor }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: theme.accentColor }} />
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {tiles.length ? (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl px-3 py-3 text-center" style={{ background: theme.surfaceColor, boxShadow: `inset 0 0 0 1px ${line}` }}>
              <p className="text-base font-semibold tabular-nums" style={{ color: theme.textColor }}>{tile.value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em]" style={{ color: muted }}>{tile.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {detail.showDescription && description ? (
        <p className="mt-5 text-[15px] leading-[1.7]" style={{ color: muted }}>{description}</p>
      ) : null}

      <div className="mt-6">
        {item.variants?.length ? (
          <VariantsSection variants={item.variants} lang={lang} theme={theme} showOptions={detail.showOptions} showExtras={detail.showExtras} />
        ) : null}

        {detail.showAllergens && item.allergens?.length ? (
          <section className="mb-6">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>{t(lang, "allergens")}</p>
            <div className="flex flex-wrap gap-1.5">
              {item.allergens.map((a) => (
                <span key={a} className="rounded-full px-2.5 py-1 text-[12px]" style={{ color: theme.textColor, boxShadow: `inset 0 0 0 1px ${line}` }}>
                  {a}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {detail.showAddToCart && onAddToCart ? (
        <div
          className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-3 px-4 pb-1 pt-3"
          style={{ background: `linear-gradient(to top, ${theme.surfaceColor} 70%, ${theme.surfaceColor}00)` }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: muted }}>Toplam</p>
            <p className="text-lg font-semibold tabular-nums" style={{ color: theme.textColor }}>
              ₺{Number(item.price).toFixed(0)}
            </p>
          </div>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-full px-5 text-[15px] font-semibold transition active:scale-[0.99]"
            style={{ background: theme.accentColor, color: theme.backgroundColor, boxShadow: `0 12px 28px -12px ${theme.accentColor}` }}
            onClick={onAddToCart}
          >
            {btnLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function styleToCss(s: MenuBlockStyleBase): CSSProperties {
  return {
    paddingTop: s.paddingTop != null ? `${s.paddingTop}px` : undefined,
    paddingBottom: s.paddingBottom != null ? `${s.paddingBottom}px` : undefined,
    paddingLeft: s.paddingX != null ? `${s.paddingX}px` : undefined,
    paddingRight: s.paddingX != null ? `${s.paddingX}px` : undefined,
    background: s.background,
    color: s.color,
    textAlign: s.textAlign,
    fontSize: s.fontSize != null ? `${s.fontSize}px` : undefined,
    fontWeight: s.fontWeight,
    borderRadius: s.borderRadius != null ? `${s.borderRadius}px` : undefined,
  };
}

/** Ürün etiketlerini seçili dile çevirir (katalogda çeviri yoksa etiketin kendisi kalır). */
function localizeTags(menu: PublicMenuPayload, lang: MenuLang): PublicMenuPayload {
  const map = menu.tagLabels;
  if (!map) return menu;
  return {
    ...menu,
    categories: menu.categories.map((c) => ({
      ...c,
      items: c.items.map((i) => ({
        ...i,
        tags: (i.tags ?? []).map((tag) => map[tag]?.[lang] ?? tag),
      })),
    })),
  };
}

export function MenuThemeCanvas({
  menu,
  selectedBranch = "",
  onBranchChange,
  hideBranchSelect,
  compact,
  selectedBlockId,
  onSelectBlock,
  previewWidth,
  previewDevice,
  interactive = true,
  searchQuery,
  onSearchQueryChange,
  previewProductDetail = false,
  previewExplore = false,
}: MenuThemeCanvasProps) {
  const document = useMemo(() => {
    const raw =
      menu.theme.document &&
      typeof menu.theme.document === "object" &&
      Array.isArray((menu.theme.document as { blocks?: unknown }).blocks)
        ? menu.theme.document
        : (menu.theme.config ?? menu.theme.document);
    return (
      normalizeMenuDocument(raw, menu.theme.preset, menu.tenant.primaryColor) ??
      createDefaultMenuDocument(menu.theme.preset, menu.tenant.primaryColor)
    );
  }, [menu.theme, menu.tenant.primaryColor]);

  const [autoDevice, setAutoDevice] = useState<MenuDeviceId>("mobile");
  useEffect(() => {
    if (previewDevice) return;
    const apply = () => setAutoDevice(detectDevice());
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [previewDevice]);

  const device: MenuDeviceId = previewDevice ?? autoDevice;
  // Public menüde tek tasarım dili; cihaz çerçeveleri yalnızca builder önizlemesi için
  const theme = previewDevice
    ? resolveThemeForDevice(document.theme, previewDevice)
    : {
        ...document.theme,
        frame: document.theme.devices?.[device] ?? {
          width: typeof window !== "undefined" ? window.innerWidth : 390,
          height: 800,
          maxWidth: document.theme.maxWidth,
          pagePadding: document.theme.pagePadding,
        },
      };

  const headerBlock = document.blocks.find((b): b is MenuHeaderBlock => b.type === "header");
  const itemsBlock = document.blocks.find((b): b is MenuItemsBlock => b.type === "items");
  const bottomNavBlock = document.blocks.find(
    (b): b is MenuBottomNavBlock => b.type === "bottomNav",
  );

  const interactions = useMenuInteractions({
    languages: headerBlock?.languages ?? ["tr"],
    defaultLanguage: headerBlock?.defaultLanguage ?? "tr",
    productClick: itemsBlock?.productClick ?? "detail",
    allowAddToCart: itemsBlock?.allowAddToCart ?? true,
  });

  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [openProduct, setOpenProduct] = useState<MenuItemData | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const q = (searchQuery ?? localSearch).trim().toLowerCase();
  const setQ = onSearchQueryChange ?? setLocalSearch;
  const fonts = fontsOf(theme.fontPair);
  const lang = interactions.lang;
  const menuView = useMemo(() => localizeTags(menu, lang), [menu, lang]);
  const uiLabels = headerBlock?.uiLabels as MenuUiLabels | undefined;
  const tt = (key: Parameters<typeof t>[1]) => t(lang, key, uiLabels);
  const locName = (
    row: Pick<MenuItemData | MenuCategoryData, "name" | "nameTr" | "nameEn" | "translations">,
  ) => localizedName(lang, row.name, row.nameTr, row.nameEn, row.translations);
  const contained = Boolean(previewWidth || compact);
  const selectedCat = menuView.categories.find((c) => c.id === openCategoryId) ?? null;
  const categoriesBlock = document.blocks.find((b) => b.type === "categories");
  const categoryOpenOnClick =
    categoriesBlock?.type === "categories" && categoriesBlock.openOnClick;
  /** Grid + tıklayınca ürün: ana sayfada ürün listesi gösterme */
  const drilldown =
    document.navigation === "drilldown" || categoryOpenOnClick;
  const showItemsHome = !drilldown || !!q;
  const hasBottomNav = Boolean(bottomNavBlock?.items.some((i) => i.enabled));
  const stickyHeader = Boolean(headerBlock?.sticky);
  const headerBarH = headerBlock
    ? Math.max(56, logoBox(headerBlock).height + 24)
    : 64;

  const filteredCategories = useMemo(() => {
    if (!q) return menuView.categories;
    return menuView.categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => {
          const n = localizedName(lang, i.name, i.nameTr, i.nameEn, i.translations).toLowerCase();
          return n.includes(q) || (i.description ?? "").toLowerCase().includes(q);
        }),
      }))
      .filter((c) => {
        const n = localizedName(lang, c.name, c.nameTr, c.nameEn, c.translations).toLowerCase();
        return n.includes(q) || c.items.length > 0;
      });
  }, [menuView.categories, q, lang]);

  useEffect(() => {
    if (!previewProductDetail) return;
    const sample =
      menuView.categories.flatMap((c) => c.items).find((i) => i.imageUrl) ??
      menuView.categories.flatMap((c) => c.items)[0] ??
      null;
    setOpenProduct(sample);
    return () => setOpenProduct(null);
  }, [previewProductDetail, menuView.categories]);

  useEffect(() => {
    if (!previewExplore) return;
    interactions.setSheet({ type: "explore" });
    return () => interactions.setSheet({ type: "none" });
    // setSheet is stable enough for builder preview toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when preview flag flips
  }, [previewExplore]);

  function handleProductClick(item: MenuItemData) {
    const mode = itemsBlock?.productClick ?? "detail";
    if (mode === "none") return;
    if (mode === "cart" && (itemsBlock?.allowAddToCart ?? true)) {
      interactions.addToCart(item);
      return;
    }
    setOpenProduct(item);
  }

  const padBottom = hasBottomNav ? 72 : theme.pagePadding;
  const frameWidth = previewWidth ?? (contained ? theme.frame.width : undefined);

  useEffect(() => {
    const href = FONT_HREF[theme.fontPair];
    const doc = globalThis.document;
    if (!href || !doc) return;
    const id = "ngl-menu-theme-font";
    let link = doc.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = doc.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      doc.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  }, [theme.fontPair]);

  return (
    <div
      className="menu-doc"
      style={{
        position: "relative",
        overflow: contained ? "hidden" : undefined,
        background: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: fonts.body,
        minHeight: contained ? "100%" : "100vh",
        height: contained ? "100%" : undefined,
        width: frameWidth ? `${frameWidth}px` : "100%",
        maxWidth: frameWidth ? `${frameWidth}px` : "100%",
        margin: frameWidth ? "0 auto" : undefined,
      }}
      onClick={() => onSelectBlock?.(null)}
    >
      {stickyHeader && headerBlock ? (
        <StickyHeader
          block={headerBlock}
          tenant={menu.tenant}
          table={menu.table}
          lang={lang}
          onLang={interactions.setLang}
          fonts={fonts}
          theme={theme}
          contained={contained}
          selected={selectedBlockId === headerBlock.id}
          onSelect={() => onSelectBlock?.(headerBlock.id)}
        />
      ) : null}

      <div
        style={{
          containerType: "inline-size",
          maxWidth: previewDevice ? theme.maxWidth : Math.min(theme.maxWidth, 920),
          margin: "0 auto",
          padding: `${theme.pagePadding}px`,
          paddingTop:
            stickyHeader && contained
              ? theme.pagePadding + headerBarH
              : theme.pagePadding,
          paddingBottom: padBottom,
          height: contained ? "100%" : undefined,
          overflowY: contained ? "auto" : undefined,
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        {drilldown && selectedCat ? (
          <CategoryDetail
            category={selectedCat}
            theme={theme}
            fonts={fonts}
            lang={lang}
            uiLabels={uiLabels}
            onBack={() => setOpenCategoryId(null)}
            onProductClick={interactive ? handleProductClick : undefined}
            itemsBlock={itemsBlock}
            previewLocked={Boolean(previewDevice)}
            device={device}
            selected={Boolean(itemsBlock && selectedBlockId === itemsBlock.id)}
            onSelectItems={
              itemsBlock && onSelectBlock
                ? () => onSelectBlock(itemsBlock.id)
                : undefined
            }
            accent={theme.accentColor}
          />
        ) : (
          document.blocks.map((block) => {
            if (block.type === "bottomNav") return null;
            if (block.type === "header" && stickyHeader) return null;
            if (block.type === "items" && !showItemsHome) return null;
            if (block.type === "branchPicker" && hideBranchSelect) return null;
            const selected = selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                role="presentation"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBlock?.(block.id);
                }}
                style={{
                  outline: selected ? `2px solid ${theme.accentColor}` : undefined,
                  outlineOffset: 2,
                  borderRadius: 8,
                }}
              >
                <RenderBlock
                  block={block}
                  document={document}
                  device={device}
                  previewLocked={Boolean(previewDevice)}
                  theme={theme}
                  tenant={menu.tenant}
                  table={menu.table}
                  categories={filteredCategories}
                  branches={menu.branches}
                  selectedBranch={selectedBranch}
                  onBranchChange={onBranchChange}
                  hideBranchSelect={hideBranchSelect}
                  fonts={fonts}
                  interactive={interactive}
                  search={q}
                  onSearch={setQ}
                  lang={lang}
                  uiLabels={uiLabels}
                  onProductClick={interactive ? handleProductClick : undefined}
                  onOpenCategory={(id) => {
                    if (drilldown && categoryOpenOnClick) {
                      setOpenCategoryId(id);
                    }
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {bottomNavBlock ? (
        <div
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onSelectBlock?.(bottomNavBlock.id);
          }}
          style={{
            outline:
              selectedBlockId === bottomNavBlock.id
                ? `2px solid ${theme.accentColor}`
                : undefined,
          }}
        >
          <MenuBottomNav
            items={bottomNavBlock.items}
            lang={lang}
            uiLabels={uiLabels}
            cartCount={interactions.cartCount}
            onOpen={interactions.openNav}
            accent={theme.accentColor}
            barBg={theme.backgroundColor}
            muted={theme.mutedColor}
            contained={contained}
          />
        </div>
      ) : null}

      <Sheets
        interactions={interactions}
        theme={theme}
        fonts={fonts}
        lang={lang}
        uiLabels={uiLabels}
        slug={menu.tenant.slug}
        bottomNavBlock={bottomNavBlock}
        table={menu.table}
        contained={contained}
      />

      <MenuSheet
        open={Boolean(openProduct)}
        title={
          openProduct
            ? localizedName(lang, openProduct.name, openProduct.nameTr, openProduct.nameEn, openProduct.translations)
            : ""
        }
        variant="drawer"
        showTitle={false}
        ink={theme.textColor}
        panel={theme.surfaceColor}
        muted={theme.mutedColor}
        contained={contained}
        closeLabel={tt("close")}
        onClose={() => setOpenProduct(null)}
      >
        {openProduct ? (
          <ProductDetailView
            item={openProduct}
            theme={theme}
            fonts={fonts}
            lang={lang}
            uiLabels={uiLabels}
            pagePadding={16}
            detail={{
              ...defaultProductDetail(),
              ...itemsBlock?.detail,
            }}
            hideBack
            onBack={() => setOpenProduct(null)}
            onAddToCart={() => {
              interactions.addToCart(openProduct);
              setOpenProduct(null);
            }}
          />
        ) : previewProductDetail ? (
          <p className="text-sm" style={{ color: theme.mutedColor }}>
            Detay önizlemesi için menüye ürün ekleyin.
          </p>
        ) : null}
      </MenuSheet>

      {interactions.toast ? (
        <div
          className="z-[70] rounded-full px-3 py-1.5 text-xs font-medium shadow"
          style={{
            position: contained ? "absolute" : "fixed",
            left: "50%",
            bottom: contained ? 80 : 96,
            transform: "translateX(-50%)",
            background: theme.accentColor,
            color: theme.backgroundColor,
          }}
        >
          {interactions.toast}
        </div>
      ) : null}
    </div>
  );
}

function LanguageSwitcher({
  languages,
  lang,
  onLang,
  ink,
  muted,
  bg,
}: {
  languages: MenuLang[];
  lang: MenuLang;
  onLang: (l: MenuLang) => void;
  ink: string;
  muted: string;
  bg: string;
}) {
  const [open, setOpen] = useState(false);
  const current = getMenuLangMeta(lang);

  if (languages.length <= 3) {
    return (
      <div
        className="flex shrink-0 overflow-hidden rounded-full border text-[10px] uppercase tracking-[0.12em]"
        style={{ borderColor: `${ink}22` }}
      >
        {languages.map((l) => {
          const meta = getMenuLangMeta(l);
          return (
            <button
              key={l}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLang(l);
              }}
              className="px-2.5 py-1.5"
              style={
                lang === l ? { background: ink, color: bg } : { color: muted }
              }
              title={meta.native}
            >
              {meta.flag} {l.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px]"
        style={{ borderColor: `${ink}22`, color: ink }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span aria-hidden>{current.flag}</span>
        <span className="max-w-[7rem] truncate">{current.native}</span>
        <span style={{ color: muted }} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[40]"
            aria-label="Kapat"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-[41] mt-1 max-h-64 min-w-[11rem] overflow-auto rounded-xl border py-1 shadow-lg"
            style={{ background: bg, borderColor: `${ink}18`, color: ink }}
          >
            {languages.map((l) => {
              const meta = getMenuLangMeta(l);
              return (
                <li key={l}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={lang === l}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                    style={{
                      background: lang === l ? `${ink}10` : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLang(l);
                      setOpen(false);
                    }}
                  >
                    <span aria-hidden>{meta.flag}</span>
                    <span className="min-w-0 flex-1 truncate">{meta.native}</span>
                    <span className="text-[10px] uppercase" style={{ color: muted }}>
                      {l}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function StickyHeader({
  block,
  tenant,
  table,
  lang,
  onLang,
  fonts,
  theme,
  contained,
  selected,
  onSelect,
}: {
  block: MenuHeaderBlock;
  tenant: MenuThemeCanvasProps["menu"]["tenant"];
  table?: { id: string; label: string };
  lang: MenuLang;
  onLang: (l: MenuLang) => void;
  fonts: { display: string; body: string };
  theme: MenuDocument["theme"];
  contained: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <header
      role="presentation"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="z-30 border-b backdrop-blur-xl"
      style={{
        position: contained ? "absolute" : "sticky",
        top: 0,
        left: 0,
        right: 0,
        borderColor: `${theme.textColor}14`,
        background: `${theme.backgroundColor}ee`,
        outline: selected ? `2px solid ${theme.accentColor}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {block.showLogo && (block.logoUrl || tenant.logoUrl) ? (
            <BrandLogo
              src={block.logoUrl || tenant.logoUrl || ""}
              block={block}
            />
          ) : null}
          <div className="min-w-0">
            {block.showName ? (
              <p
                className="truncate text-xl italic leading-none"
                style={{ fontFamily: fonts.display, color: theme.headingColor }}
              >
                {block.title.trim() || tenant.name}
              </p>
            ) : null}
            {block.showTable && table ? (
              <p
                className="mt-1 text-[10px] uppercase tracking-[0.2em]"
                style={{ color: theme.mutedColor }}
              >
                {table.label}
              </p>
            ) : null}
          </div>
        </div>
        {block.showLanguages && block.languages.length > 0 ? (
          <LanguageSwitcher
            languages={block.languages}
            lang={lang}
            onLang={onLang}
            ink={theme.textColor}
            muted={theme.mutedColor}
            bg={theme.backgroundColor}
          />
        ) : null}
      </div>
    </header>
  );
}

function Sheets({
  interactions,
  theme,
  fonts,
  lang,
  uiLabels,
  slug,
  bottomNavBlock,
  table,
  contained,
}: {
  interactions: ReturnType<typeof useMenuInteractions>;
  theme: MenuDocument["theme"];
  fonts: { display: string; body: string };
  lang: MenuLang;
  uiLabels?: MenuUiLabels;
  slug?: string;
  bottomNavBlock?: MenuBottomNavBlock;
  table?: { id: string; label: string };
  contained: boolean;
}) {
  const sheet = interactions.sheet;
  const tt = (key: Parameters<typeof t>[1]) => t(lang, key, uiLabels);
  const navItems = bottomNavBlock?.items;
  const sheetTitle = (
    id: "cart" | "suggest" | "complaint" | "wifi" | "explore" | "waiter",
    key: Parameters<typeof t>[1],
  ) => navItemLabel(navItems?.find((n) => n.id === id), lang, tt(key));
  const common = {
    ink: theme.textColor,
    panel: theme.surfaceColor,
    muted: theme.mutedColor,
    contained,
    onClose: () => interactions.setSheet({ type: "none" }),
    variant: "drawer" as const,
    closeLabel: tt("close"),
  };

  return (
    <>
      <MenuSheet
        open={sheet.type === "explore"}
        title={sheetTitle("explore", "explore")}
        showTitle={false}
        {...common}
      >
        <ExplorePage
          page={bottomNavBlock?.explore ?? defaultExplorePage()}
          lang={lang}
          displayFont={fonts.display}
          textColor={theme.textColor}
          mutedColor={theme.mutedColor}
          surfaceColor={theme.backgroundColor}
          radius={radiusCss(theme.radius)}
        />
      </MenuSheet>

      <MenuSheet open={sheet.type === "cart"} title={sheetTitle("cart", "cart")} {...common}>
        {interactions.cart.length === 0 ? (
          <p style={{ color: theme.mutedColor }}>{tt("emptyCart")}</p>
        ) : (
          <div className="space-y-2">
            {interactions.cart.map((line) => (
              <div key={line.key} className="flex justify-between text-sm">
                <span>
                  {localizedName(
                    lang,
                    line.item.name,
                    line.item.nameTr,
                    line.item.nameEn,
                    line.item.translations,
                  )}{" "}
                  ×{line.qty}
                </span>
                <span style={{ color: theme.accentColor }}>
                  ₺{(line.unitPrice * line.qty).toFixed(0)}
                </span>
              </div>
            ))}
            <button
              type="button"
              className="text-xs"
              style={{ color: theme.mutedColor }}
              onClick={() => interactions.setCart([])}
            >
              {tt("clearCart")}
            </button>
          </div>
        )}
      </MenuSheet>

      <MenuSheet
        open={sheet.type === "suggest" || sheet.type === "complaint"}
        title={
          sheet.type === "suggest"
            ? sheetTitle("suggest", "suggest")
            : sheetTitle("complaint", "complaint")
        }
        {...common}
      >
        <FeedbackForm
          lang={lang}
          uiLabels={uiLabels}
          accent={theme.accentColor}
          ink={theme.textColor}
          muted={theme.mutedColor}
          slug={slug}
          kind={sheet.type === "complaint" ? "complaint" : "suggest"}
          tableLabel={table?.label}
          form={
            sheet.type === "complaint"
              ? bottomNavBlock?.complaintForm
              : bottomNavBlock?.suggestForm
          }
          onDone={() => interactions.setSheet({ type: "none" })}
        />
      </MenuSheet>

      <MenuSheet open={sheet.type === "wifi"} title={sheetTitle("wifi", "wifi")} {...common}>
        <WifiCredentials
          ssid={bottomNavBlock?.wifiSsid || ""}
          password={bottomNavBlock?.wifiPassword || ""}
          lang={lang}
          uiLabels={uiLabels}
          ink={theme.textColor}
          muted={theme.mutedColor}
          accent={theme.accentColor}
        />
      </MenuSheet>

      <MenuSheet open={sheet.type === "waiter"} title={sheetTitle("waiter", "callWaiter")} {...common}>
        <p className="mb-3 text-sm" style={{ color: theme.mutedColor }}>
          {tt("callWaiterHint")}
          {table ? ` (${table.label})` : ""}
        </p>
        <button
          type="button"
          className="w-full rounded-full py-2.5 text-sm font-semibold"
          style={{ background: theme.accentColor, color: theme.backgroundColor }}
          onClick={() => {
            interactions.setToast(tt("thanks"));
            interactions.setSheet({ type: "none" });
          }}
        >
          {tt("callWaiter")}
        </button>
      </MenuSheet>
    </>
  );
}

function CategoryDetail({
  category,
  theme,
  fonts,
  lang,
  uiLabels,
  onBack,
  onProductClick,
  itemsBlock,
  previewLocked,
  device,
  selected,
  onSelectItems,
  accent,
}: {
  category: MenuCategoryData;
  theme: MenuDocument["theme"];
  fonts: { display: string; body: string };
  lang: MenuLang;
  uiLabels?: MenuUiLabels;
  onBack: () => void;
  onProductClick?: (item: MenuItemData) => void;
  itemsBlock?: MenuItemsBlock;
  previewLocked: boolean;
  device: MenuDeviceId;
  selected?: boolean;
  onSelectItems?: () => void;
  accent?: string;
}) {
  const block =
    itemsBlock ??
    ({
      id: "tmp",
      type: "items",
      title: "",
      layout: "split",
      columns: 2,
      showImages: true,
      showPrice: true,
      showDescription: true,
      showBadges: true,
      showCalories: false,
      showPrepTime: false,
      scope: "selected",
      productClick: "detail",
      allowAddToCart: true,
      detail: defaultProductDetail(),
    } as MenuItemsBlock);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-[10px] uppercase tracking-[0.16em]"
        style={{ color: theme.mutedColor }}
      >
        ← {t(lang, "back", uiLabels)}
      </button>
      <div
        role={onSelectItems ? "presentation" : undefined}
        onClick={(e) => {
          if (!onSelectItems) return;
          e.stopPropagation();
          onSelectItems();
        }}
        style={{
          outline: selected && accent ? `2px solid ${accent}` : undefined,
          outlineOffset: 4,
          borderRadius: 12,
        }}
      >
      <ItemsList
        block={block}
        items={category.items}
        theme={theme}
        fonts={fonts}
        lang={lang}
        onProductClick={onProductClick}
        previewLocked={previewLocked}
        device={device}
      />
      </div>
    </div>
  );
}

function RenderBlock({
  block,
  document,
  device,
  previewLocked,
  theme,
  tenant,
  table,
  categories,
  branches,
  selectedBranch,
  onBranchChange,
  hideBranchSelect,
  fonts,
  interactive,
  search,
  onSearch,
  lang,
  uiLabels,
  onOpenCategory,
  onProductClick,
}: {
  block: MenuBlock;
  document: MenuDocument;
  device: MenuDeviceId;
  previewLocked: boolean;
  theme: ReturnType<typeof resolveThemeForDevice>;
  tenant: MenuThemeCanvasProps["menu"]["tenant"];
  table?: { id: string; label: string };
  categories: MenuCategoryData[];
  branches: { id: string; name: string }[];
  selectedBranch: string;
  onBranchChange?: (id: string) => void;
  hideBranchSelect?: boolean;
  fonts: { display: string; body: string };
  interactive: boolean;
  search: string;
  onSearch: (q: string) => void;
  lang: MenuLang;
  uiLabels?: MenuUiLabels;
  onOpenCategory: (id: string) => void;
  onProductClick?: (item: MenuItemData) => void;
}) {
  const radius = radiusCss(theme.radius);
  const st = styleToCss(resolveBlockStyle(block.style, device));
  const tt = (key: Parameters<typeof t>[1]) => t(lang, key, uiLabels);

  switch (block.type) {
    case "cover": {
      const height = resolveDeviceNumber(block.height, block.heightByDevice, device);
      return (
        <div
          style={{
            height,
            margin: `0 -${theme.pagePadding}px ${theme.pagePadding}px`,
            overflow: "hidden",
            position: "relative",
            background: block.imageUrl
              ? undefined
              : `linear-gradient(135deg, ${theme.accentColor}, ${theme.headingColor})`,
            ...st,
          }}
        >
          {block.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvePublicAssetUrl(block.imageUrl)}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `rgba(0,0,0,${block.overlay / 100})`,
                }}
              />
            </>
          ) : null}
        </div>
      );
    }
    case "header": {
      const logo = block.logoUrl || tenant.logoUrl;
      return (
        <header style={{ textAlign: block.align, padding: "8px 0 16px", ...st }}>
          {block.showLogo && logo ? (
            <BrandLogo src={logo} block={block} />
          ) : null}
          {block.showName ? (
            <h1
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                margin: "8px 0 0",
                color: theme.headingColor,
              }}
            >
              {block.title.trim() || tenant.name}
            </h1>
          ) : null}
          {block.showTable && table ? (
            <p style={{ color: theme.accentColor, fontSize: 13 }}>{table.label}</p>
          ) : null}
        </header>
      );
    }
    case "welcome":
      return (
        <div
          className="mb-6 rounded-3xl border p-5 sm:p-6"
          style={{
            borderColor: `${theme.textColor}14`,
            background: `${theme.surfaceColor}99`,
            ...st,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.24em]"
            style={{ color: theme.mutedColor }}
          >
            {block.eyebrow}
          </p>
          <h2
            className="mt-2 text-[clamp(1.5rem,4vw,2.4rem)] italic leading-[0.95]"
            style={{ fontFamily: fonts.display, color: theme.headingColor }}
          >
            {block.title}
          </h2>
          {(block.locationLabel || block.subtitle) && (
            <p className="mt-3 text-sm" style={{ color: theme.mutedColor }}>
              {[block.locationLabel, block.subtitle].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      );
    case "search":
      return (
        <div style={{ marginBottom: 14, ...st }}>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={block.placeholder || tt("search")}
            disabled={!interactive}
            style={{
              width: "100%",
              border: `1px solid ${theme.mutedColor}33`,
              background: theme.surfaceColor,
              borderRadius: radius,
              padding: "11px 12px",
              color: theme.textColor,
            }}
          />
        </div>
      );
    case "categories": {
      const resolvedCols = block.gridCols ?? legacyGridCols(block.columns || 2, block.columnsByDevice?.tablet, block.columnsByDevice?.desktop ?? block.columnsDesktop, 6);
      const gridId = `cat-grid-${block.id}`;
      const aspect = aspectCss(block.imageAspect);
      return (
        <section style={{ marginBottom: 18, ...st }}>
          <p
            className="mb-3 text-[10px] uppercase tracking-[0.22em]"
            style={{ color: theme.mutedColor }}
          >
            {pickMenuLocale(
              typeof block.title === "string" ? { tr: block.title } : block.title,
              lang,
              tt("selectCategory"),
            )}
          </p>
          {block.mode === "chips" ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenCategory(c.id)}
                  className="rounded-full border px-3 py-1.5 text-sm"
                  style={{ borderColor: `${theme.textColor}18`, background: theme.surfaceColor }}
                >
                  {localizedName(lang, c.name, c.nameTr, c.nameEn, c.translations)}
                </button>
              ))}
            </div>
          ) : block.mode === "list" ? (
            <div className="space-y-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenCategory(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left"
                  style={{ borderColor: `${theme.textColor}14`, background: theme.surfaceColor }}
                >
                  {block.showImages ? (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: `${theme.accentColor}33`,
                        position: "relative",
                      }}
                    >
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvePublicAssetUrl(c.imageUrl)}
                          alt=""
                          loading="lazy"
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <span className="min-w-0 flex-1" style={{ fontFamily: fonts.display }}>
                    {localizedName(lang, c.name, c.nameTr, c.nameEn, c.translations)}
                  </span>
                  {block.showCount ? (
                    <span className="text-xs" style={{ color: theme.mutedColor }}>
                      {c.items.length}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <>
              <style>{gridColsCss(gridId, resolvedCols, "0.75rem")}</style>
              <div className={gridId}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenCategory(c.id)}
                    className="overflow-hidden rounded-2xl border text-left"
                    style={{
                      borderColor: `${theme.textColor}14`,
                      background: `${theme.surfaceColor}`,
                      color: theme.textColor,
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    {block.showImages ? (
                      c.imageUrl ? (
                        <FitImage src={c.imageUrl} aspect={aspect} />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            paddingTop:
                              aspect === "1 / 1"
                                ? "100%"
                                : aspect === "3 / 4"
                                  ? "133.333%"
                                  : "75%",
                            background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.headingColor})`,
                          }}
                        />
                      )
                    ) : null}
                    <div className="p-3">
                      <p className="italic leading-tight" style={{ fontFamily: fonts.display }}>
                        {localizedName(lang, c.name, c.nameTr, c.nameEn, c.translations)}
                      </p>
                      {block.showCount ? (
                        <p
                          className="mt-1 text-[9px] uppercase tracking-[0.16em]"
                          style={{ color: theme.mutedColor }}
                        >
                          {c.items.length} {tt("products")}
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      );
    }
    case "items":
      return (
        <section style={st}>
          {categories.map((c) => (
            <div key={c.id} id={`cat-${c.id}`} className="mb-6">
              {block.scope === "all" ? (
                <h3 className="mb-2 text-lg italic" style={{ fontFamily: fonts.display }}>
                  {localizedName(lang, c.name, c.nameTr, c.nameEn, c.translations)}
                </h3>
              ) : null}
              <ItemsList
                block={block}
                items={c.items}
                theme={theme}
                fonts={fonts}
                lang={lang}
                onProductClick={onProductClick}
                previewLocked={previewLocked}
                device={device}
              />
            </div>
          ))}
        </section>
      );
    case "text":
      return block.as === "h2" ? (
        <h2 style={{ fontFamily: fonts.display, fontSize: 22, margin: "8px 0 14px", ...st }}>
          {block.text}
        </h2>
      ) : (
        <p style={{ color: theme.mutedColor, marginBottom: 14, ...st }}>{block.text}</p>
      );
    case "image":
      return block.url ? (
        <div style={{ marginBottom: 14, ...st }}>
          <FitImage
            src={block.url}
            alt={block.alt}
            aspect="16 / 9"
            radius={radius}
          />
        </div>
      ) : null;
    case "divider":
      return (
        <hr
          style={{
            border: "none",
            borderTop: `${block.thickness}px solid ${block.color}`,
            margin: "14px 0",
            ...st,
          }}
        />
      );
    case "spacer":
      return (
        <div
          style={{
            height: resolveDeviceNumber(block.size, block.sizeByDevice, device),
            ...st,
          }}
        />
      );
    case "footer":
      return (
        <footer
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${theme.mutedColor}22`,
            color: theme.mutedColor,
            fontSize: 12,
            ...st,
          }}
        >
          {block.text ? <p>{block.text}</p> : null}
          {block.showBranding ? <p className="mt-1">newGenLoyalty</p> : null}
        </footer>
      );
    case "branchPicker":
      if (hideBranchSelect || branches.length < 2) return null;
      return (
        <div style={{ marginBottom: 14, ...st }}>
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange?.(e.target.value)}
            style={{
              width: "100%",
              borderRadius: radius,
              border: `1px solid ${theme.mutedColor}33`,
              background: theme.surfaceColor,
              padding: "10px 12px",
              color: theme.textColor,
            }}
          >
            <option value="">Tümü</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      );
    case "bottomNav":
      return null;
    default:
      return null;
  }
}

/** Genişliğe duyarlı grid CSS'i; @container kullanır — hem halka açık menüde hem önizlemede çalışır. */
export const GRID_BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

export function gridColsCss(
  gridId: string,
  cols: { base: number; sm?: number; md?: number; lg?: number; xl?: number; '2xl'?: number },
  gap: string,
): string {
  const clamp = (n: number | undefined) => (n == null ? undefined : Math.max(1, Math.min(6, Math.round(n))));
  const base = clamp(cols.base) ?? 1;
  let css = `.${gridId}{display:grid;gap:${gap};grid-template-columns:repeat(${base},minmax(0,1fr))}`;
  let last = base;
  (Object.keys(GRID_BREAKPOINTS) as (keyof typeof GRID_BREAKPOINTS)[]).forEach((bp) => {
    const n = clamp(cols[bp]);
    if (n == null) return;
    css += `@container (min-width:${GRID_BREAKPOINTS[bp]}px){.${gridId}{grid-template-columns:repeat(${n},minmax(0,1fr))}}`;
    last = n;
  });
  void last;
  return css;
}

/** Eski columns / columnsByDevice alanlarından gridCols türetir (geriye uyum). */
function legacyGridCols(
  base: number,
  tablet?: number,
  desktop?: number,
  max = 6,
): { base: number; md: number; lg: number } {
  const b = Math.max(1, Math.min(max, base || 1));
  const md = Math.max(b, Math.min(max, tablet ?? Math.min(3, b + 1)));
  const lg = Math.max(md, Math.min(max, desktop ?? Math.min(4, md + 1)));
  return { base: b, md, lg };
}

function ItemsList({
  block,
  items,
  theme,
  fonts,
  lang,
  onProductClick,
  previewLocked,
  device,
}: {
  block: MenuItemsBlock;
  items: MenuItemData[];
  theme: MenuDocument["theme"];
  fonts: { display: string; body: string };
  lang: MenuLang;
  onProductClick?: (item: MenuItemData) => void;
  previewLocked: boolean;
  device: MenuDeviceId;
}) {
  const radius = radiusCss(theme.radius);
  if (!items.length) {
    return <p style={{ color: theme.mutedColor, fontSize: 13 }}>{t(lang, "noItems")}</p>;
  }
  const thumb = block.layout === "compact" ? 56 : 72;
  const gridId = `item-grid-${block.id}`;
  const stacked = block.layout === "imageFirst" || block.layout === "card";

  return (
    <>
      <style>{gridColsCss(gridId, block.gridCols ?? legacyGridCols(block.columns || 1, block.columnsByDevice?.tablet, block.columnsByDevice?.desktop, 4), "0.7rem")}</style>
      <div className={gridId}>
      {items.map((item) => (
        <article
          key={item.id}
          role={onProductClick ? "button" : undefined}
          tabIndex={onProductClick ? 0 : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onProductClick?.(item);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onProductClick?.(item);
          }}
          style={{
            background: theme.surfaceColor,
            borderRadius: radius,
            padding: stacked ? 0 : 10,
            display: "flex",
            flexDirection: stacked ? "column" : "row",
            gap: stacked ? 0 : 10,
            cursor: onProductClick ? "pointer" : undefined,
            border: `1px solid ${theme.textColor}10`,
            overflow: "hidden",
            minWidth: 0,
            alignItems: stacked ? "stretch" : "center",
            height: "100%",
          }}
        >
          {block.showImages && item.imageUrl && stacked ? (
            <FitImage src={item.imageUrl} aspect={block.layout === "card" ? "1 / 1" : "16 / 10"} />
          ) : null}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: stacked ? "10px 12px 12px" : 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 600,
                  lineHeight: 1.25,
                }}
              >
                {localizedName(lang, item.name, item.nameTr, item.nameEn, item.translations)}
              </strong>
              {block.showPrice ? (
                <span
                  style={{
                    color: theme.accentColor,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  ₺{Number(item.price).toFixed(0)}
                </span>
              ) : null}
            </div>
            {block.showVariants !== false && item.variants?.some((v) => v.kind === "extra") ? (
              <p className="mt-1 text-[11px]" style={{ color: theme.mutedColor }}>
                + {item.variants.filter((v) => v.kind === "extra").length} {t(lang, "extras")}
              </p>
            ) : null}
            {block.showDescription && pickContentDescription(lang, item.description, item.translations) && (block.gridCols?.base ?? block.columns ?? 1) < 3 ? (
              <p
                style={{
                  margin: "4px 0 0",
                  color: theme.mutedColor,
                  fontSize: 12,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: stacked ? 2 : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {pickContentDescription(lang, item.description, item.translations)}
              </p>
            ) : null}
            {block.showBadges && item.tags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    style={{
                      background: `${theme.accentColor}18`,
                      color: theme.accentColor,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {block.showImages && item.imageUrl && !stacked ? (
            <div
              style={{
                width: thumb,
                height: thumb,
                borderRadius: radius,
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
                background: "rgba(128,128,128,0.2)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvePublicAssetUrl(item.imageUrl)}
                alt=""
                loading="lazy"
                decoding="async"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
            </div>
          ) : null}
        </article>
      ))}
      </div>
    </>
  );
}
