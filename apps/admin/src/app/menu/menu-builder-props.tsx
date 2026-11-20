"use client";

import { useEffect, useState } from "react";
import { Field, btnGhost, inputClassName } from "../../components/ui";
import { resolveAdminAssetUrl } from "../../lib/public-urls";
import {
  defaultExplorePage,
  defaultFeedbackForm,
  defaultProductDetail,
  getMenuLangMeta,
  MENU_FEEDBACK_FIELD_TYPES,
  MENU_LANG_CATALOG,
  resolveBlockStyle,
  type MenuBlock,
  type MenuBlockStyleBase,
  type MenuDeviceId,
  type MenuDocument,
  type MenuExploreCard,
  type MenuExploreLinkKind,
  type MenuExplorePage,
  type MenuExploreSection,
  type MenuFeedbackField,
  type MenuFeedbackFieldType,
  type MenuFeedbackForm,
  type MenuLang,
  type MenuLocalized,
  type MenuProductDetail,
} from "@ngl/shared";
import { MENU_UI_LABEL_KEYS } from "../../components/menu-themes/menu-i18n";
import { BREAKPOINT_PREVIEW_WIDTH, usePreviewWidth } from "../../lib/preview-width";
import { QUICK_PALETTES, type QuickPalette } from "./palettes";


function langLabel(code: string): string {
  const m = getMenuLangMeta(code);
  return `${m.flag} ${m.native}`;
}

function LocaleTabs({
  langs,
  value,
  onChange,
}: {
  langs: MenuLang[];
  value: MenuLang;
  onChange: (l: MenuLang) => void;
}) {
  const list = langs.length ? langs : (["tr"] as MenuLang[]);
  return (
    <div
      className="sticky top-0 z-10 flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1 shadow-[0_1px_0_rgba(26,25,22,0.04)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {list.map((l) => {
        const on = value === l;
        const meta = getMenuLangMeta(l);
        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={on}
            title={meta.native}
            className={`flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition ${
              on
                ? "bg-[#171614] text-[#f3efe6] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            }`}
            onClick={() => onChange(l)}
          >
            <span aria-hidden>{meta.flag}</span>
            <span className="uppercase tracking-wide">{l}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Menü dillerini ekle/çıkar — header.languages günceller */
function LanguagesManager({
  langs,
  defaultLanguage,
  onChange,
}: {
  langs: MenuLang[];
  defaultLanguage: MenuLang;
  onChange: (next: { languages: MenuLang[]; defaultLanguage: MenuLang }) => void;
}) {
  const list = langs.length ? langs : (["tr"] as MenuLang[]);
  return (
    <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <div>
        <p className="text-[11px] font-medium text-[var(--muted)]">Menü dilleri</p>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
          Yeni dil burada eklenir; çeviri sekmeleri buna göre açılır.
        </p>
      </div>
      <div className="flex max-w-full items-stretch gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((l) => {
          const meta = getMenuLangMeta(l);
          const isDefault = defaultLanguage === l;
          return (
            <div
              key={l}
              className={`flex min-h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs ${
                isDefault
                  ? "border-[#0f6e56]/40 bg-[#0f6e56]/10 text-[#0c5a46]"
                  : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
              }`}
            >
              <button
                type="button"
                className="font-medium"
                title="Varsayılan yap"
                onClick={() => onChange({ languages: list, defaultLanguage: l })}
              >
                {meta.flag} <span className="uppercase">{l}</span>
              </button>
              {list.length > 1 ? (
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface)]"
                  aria-label={`${meta.native} kaldır`}
                  onClick={() => {
                    const next = list.filter((x) => x !== l);
                    onChange({
                      languages: next.length ? next : ["tr"],
                      defaultLanguage: next.includes(defaultLanguage)
                        ? defaultLanguage
                        : (next[0] ?? "tr"),
                    });
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
        <select
          className="min-h-9 shrink-0 rounded-lg border border-dashed border-[var(--line-strong)] bg-transparent px-2 text-xs text-[var(--muted)]"
          value=""
          aria-label="Dil ekle"
          onChange={(e) => {
            const code = e.target.value;
            if (!code || list.includes(code)) return;
            onChange({ languages: [...list, code], defaultLanguage });
          }}
        >
          <option value="">+ Dil</option>
          {MENU_LANG_CATALOG.filter((l) => !list.includes(l.code)).map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.native}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function LocaleFields({
  label,
  langs,
  value,
  onChange,
  multiline,
  tab,
  onTabChange,
  hideTabs,
}: {
  label: string;
  langs: MenuLang[];
  value: MenuLocalized;
  onChange: (next: MenuLocalized) => void;
  multiline?: boolean;
  /** Paylaşılan dil sekmesi (Keşfet paneli) */
  tab?: MenuLang;
  onTabChange?: (l: MenuLang) => void;
  hideTabs?: boolean;
}) {
  const list = langs.length ? langs : (["tr"] as MenuLang[]);
  const [inner, setInner] = useState<MenuLang>(list[0]!);
  useEffect(() => {
    if (!list.includes(inner)) setInner(list[0]!);
  }, [list, inner]);
  const active = tab ?? (list.includes(inner) ? inner : list[0]!);
  const setActive = onTabChange ?? setInner;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-[var(--muted)]">{label}</p>
      {!hideTabs && list.length > 1 ? (
        <LocaleTabs langs={list} value={active} onChange={setActive} />
      ) : null}
      {multiline ? (
        <textarea
          rows={2}
          className={inputClassName()}
          placeholder={langLabel(active)}
          value={value[active] ?? ""}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
        />
      ) : (
        <input
          className={inputClassName()}
          placeholder={langLabel(active)}
          value={value[active] ?? ""}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
        />
      )}
    </div>
  );
}

function UiLabelsEditor({
  langs,
  value,
  onChange,
}: {
  langs: MenuLang[];
  value: Partial<Record<string, MenuLocalized>>;
  onChange: (next: Partial<Record<string, MenuLocalized>>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MenuLang>(langs[0] ?? "tr");
  useEffect(() => {
    if (!langs.includes(tab)) setTab(langs[0] ?? "tr");
  }, [langs, tab]);

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        Arayüz metinleri (Kategoriler, Geri…)
        <span className="text-[var(--muted)]">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="space-y-3">
          <LocaleTabs langs={langs} value={tab} onChange={setTab} />
          <p className="text-[11px] text-[var(--muted)]">
            Boş bırakılanlar varsayılan çeviriyi kullanır.
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
            {MENU_UI_LABEL_KEYS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <input
                  className={inputClassName()}
                  value={value[key]?.[tab] ?? ""}
                  placeholder={langLabel(tab)}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [key]: { ...(value[key] ?? {}), [tab]: e.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const DEVICE_NAME: Record<MenuDeviceId, string> = {
  mobile: "Mobil",
  tablet: "Tablet",
  desktop: "Masaüstü",
};

/** Ekrana özel değer işareti + temel değere dön düğmesi */
function OverrideBadge({ device, onReset }: { device: MenuDeviceId; onReset: () => void }) {
  return (
    <span className="ml-auto inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-1.5 py-px text-[10px] font-semibold text-[var(--accent)]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        {DEVICE_NAME[device]}
      </span>
      <button
        type="button"
        onClick={onReset}
        className="text-[10px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
        title="Bu ekrandaki özel değeri kaldır, mobil (temel) değeri kullan"
      >
        Sıfırla
      </button>
    </span>
  );
}

/** Seçili ekrana göre sayı alanı: mobil = temel değer, tablet/masaüstü = yalnızca o ekran */
function DeviceRangeField({
  label,
  device,
  base,
  map,
  min,
  max,
  step = 1,
  unit = "px",
  onBase,
  onMap,
}: {
  label: string;
  device: MenuDeviceId;
  base: number;
  map: Partial<Record<MenuDeviceId, number>> | undefined;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onBase: (v: number) => void;
  onMap: (m: Partial<Record<MenuDeviceId, number>> | undefined) => void;
}) {
  const own = device === "mobile" ? undefined : map?.[device];
  const value = own ?? base;
  const overridden = own != null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink)]">
        <span>
          {label} <span className="tabular-nums text-[var(--muted)]">{value}{unit}</span>
        </span>
        {overridden ? (
          <OverrideBadge
            device={device}
            onReset={() => {
              const next = { ...(map ?? {}) };
              delete next[device];
              onMap(Object.keys(next).length ? next : undefined);
            }}
          />
        ) : null}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} (${DEVICE_NAME[device]})`}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (device === "mobile") onBase(v);
          else onMap({ ...(map ?? {}), [device]: v });
        }}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}

/** Panelin üstünde: hangi ekranı düzenlediğinizi tek satırda söyler */
function DeviceScopeNote({ device, overrides }: { device: MenuDeviceId; overrides: number }) {
  if (device === "mobile") {
    return (
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Mobil temel tasarım. Tablet ve masaüstü bunu devralır.
      </p>
    );
  }
  return (
    <p className="mt-2 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] text-[var(--ink)]">
      <strong>{DEVICE_NAME[device]}</strong>: boyut ve boşluk değişiklikleri yalnızca bu ekranda.
      {overrides > 0 ? ` Bu blokta ${overrides} özel ayar.` : ""}
    </p>
  );
}

/** Blok için bu ekranda kaç özel ayar var (stil + boyut haritaları) */
function countOverrides(block: MenuBlock | null, device: MenuDeviceId): number {
  if (!block || device === "mobile") return 0;
  let n = Object.keys(block.style?.byDevice?.[device] ?? {}).length;
  const maps = block as unknown as Record<string, unknown>;
  for (const k of ["heightByDevice", "sizeByDevice", "logoWidthByDevice", "logoHeightByDevice"]) {
    const m = maps[k] as Partial<Record<MenuDeviceId, number>> | undefined;
    if (m?.[device] != null) n += 1;
  }
  return n;
}

function nid() {
  return `mb_${Math.random().toString(36).slice(2, 10)}`;
}

const EXPLORE_KIND_LABEL: Record<MenuExploreLinkKind, string> = {
  url: "Web bağlantısı",
  instagram: "Instagram",
  facebook: "Facebook",
  maps: "Harita / yol tarifi",
  phone: "Telefon",
  email: "E-posta",
  whatsapp: "WhatsApp",
};

function emptyExploreCard(): MenuExploreCard {
  return {
    id: nid(),
    enabled: true,
    kind: "url",
    href: "",
    value: "",
    title: {},
    subtitle: {},
  };
}

function emptyExploreSection(): MenuExploreSection {
  return { id: nid(), heading: {}, cards: [emptyExploreCard()] };
}

export function MenuBuilderProps({
  document,
  block,
  device,
  onDocumentChange,
  onPatchHeader,
  onBlockChange,
  onMove,
  onRemove,
  onUploadImage,
  uploading = false,
  onPreviewProductDetail,
  onPreviewExplore,
  onDeselect,
  width,
}: {
  document: MenuDocument;
  block: MenuBlock | null;
  device: MenuDeviceId;
  onDocumentChange: (patch: Partial<MenuDocument>) => void;
  onPatchHeader?: (patch: {
    languages?: MenuLang[];
    defaultLanguage?: MenuLang;
    uiLabels?: Partial<Record<string, MenuLocalized>>;
  }) => void;
  onBlockChange: (patch: Partial<MenuBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUploadImage?: (file: File) => Promise<string>;
  uploading?: boolean;
  onPreviewProductDetail?: (open: boolean) => void;
  onPreviewExplore?: (open: boolean) => void;
  /** Blok seçimini kaldırıp sayfa ayarlarına dön */
  onDeselect?: () => void;
  width?: number;
}) {
  const t = document.theme;
  const frame = t.devices?.[device] ?? { width: 390, height: 780, maxWidth: t.maxWidth, pagePadding: t.pagePadding };
  function patchFrame(patch: Partial<typeof frame>) {
    const devices = { ...t.devices, [device]: { ...frame, ...patch } };
    onDocumentChange({
      theme: {
        ...t,
        devices,
        // Geriye uyum: mobil değerleri temel alanlara da yazılır
        ...(device === "mobile" && patch.pagePadding != null ? { pagePadding: patch.pagePadding } : {}),
      },
    });
  }
  const [itemsPanel, setItemsPanel] = useState<"list" | "detail">("list");
  const [navPanel, setNavPanel] = useState<"buttons" | "explore" | "forms">("buttons");
  const [formKind, setFormKind] = useState<"suggest" | "complaint">("suggest");
  const header = document.blocks.find(
    (b): b is Extract<MenuBlock, { type: "header" }> => b.type === "header",
  );
  const headerLangs: MenuLang[] =
    header?.languages?.length ? header.languages : ["tr"];

  useEffect(() => {
    if (block?.type !== "items") {
      setItemsPanel("list");
      onPreviewProductDetail?.(false);
    }
  }, [block?.id, block?.type, onPreviewProductDetail]);

  useEffect(() => {
    onPreviewProductDetail?.(block?.type === "items" && itemsPanel === "detail");
  }, [itemsPanel, block?.type, onPreviewProductDetail]);

  useEffect(() => {
    if (block?.type !== "bottomNav") {
      setNavPanel("buttons");
      onPreviewExplore?.(false);
    }
  }, [block?.id, block?.type, onPreviewExplore]);

  useEffect(() => {
    onPreviewExplore?.(block?.type === "bottomNav" && navPanel === "explore");
  }, [navPanel, block?.type, onPreviewExplore]);

  const blockLabel =
    block == null
      ? null
      : (
          {
            header: "Başlık",
            cover: "Kapak",
            welcome: "Karşılama",
            search: "Arama",
            categories: "Kategoriler",
            items: "Ürünler",
            text: "Metin",
            image: "Görsel",
            divider: "Ayırıcı",
            spacer: "Boşluk",
            footer: "Alt bilgi",
            branchPicker: "Şube seçici",
            bottomNav: "Alt menü",
          } as Record<string, string>
        )[block.type] ?? block.type;

  return (
    <aside
      className="qr-builder-inspector flex h-full w-full min-w-0 shrink-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]"
      style={width ? { width } : undefined}
    >
      <div className="shrink-0 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Denetim masası
        </p>
        <p className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--ink)]">
          {blockLabel ? blockLabel : "Genel görünüm"}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
          {block
            ? "Seçili bloğu düzenleyin. Dil alanları üstteki sekmelerden yönetilir."
            : "Renk, yazı ve akışı ayarlayın — veya ortadaki bir bloğa tıklayın."}
        </p>
        <DeviceScopeNote device={device} overrides={countOverrides(block, device)} />
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-4">
        {!block ? (
        <section className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Sayfa
          </p>
          {(["Açık", "Koyu"] as const).map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-[11px] font-medium text-[var(--muted)]">{group} paletler</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_PALETTES.filter((pal) => Boolean(pal.dark) === (group === "Koyu")).map((pal) => {
                  const active =
                    t.backgroundColor.toLowerCase() === pal.backgroundColor &&
                    t.accentColor.toLowerCase() === pal.accentColor;
                  return (
                    <button
                      key={pal.name}
                      type="button"
                      aria-pressed={active}
                      title={pal.name}
                      onClick={() =>
                        onDocumentChange({
                          theme: {
                            ...t,
                            backgroundColor: pal.backgroundColor,
                            surfaceColor: pal.surfaceColor,
                            textColor: pal.textColor,
                            mutedColor: pal.mutedColor,
                            accentColor: pal.accentColor,
                            headingColor: pal.textColor,
                          },
                        })
                      }
                      className={`overflow-hidden rounded-xl border text-left transition ${
                        active
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                          : "border-[var(--line)] hover:border-[var(--ink)]/30"
                      }`}
                    >
                      <span className="flex h-11 items-end gap-1 p-1.5" style={{ background: pal.backgroundColor }}>
                        <span className="h-6 flex-1 rounded-md" style={{ background: pal.surfaceColor }}>
                          <span className="m-1 block h-1 w-2/3 rounded-full" style={{ background: pal.textColor }} />
                          <span className="mx-1 block h-1 w-1/3 rounded-full" style={{ background: pal.mutedColor }} />
                        </span>
                        <span className="h-6 w-4 rounded-md" style={{ background: pal.accentColor }} />
                      </span>
                      <span className="flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-[var(--ink)]">
                        {pal.name}
                        {active ? <span aria-hidden className="text-[var(--accent)]">✓</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Field label="Menü akışı">
            <select
              className={inputClassName()}
              value={document.navigation}
              onChange={(e) =>
                onDocumentChange({
                  navigation: e.target.value as MenuDocument["navigation"],
                })
              }
            >
              <option value="drilldown">Önce kategoriler, tıklayınca ürünler</option>
              <option value="scroll">Tek sayfada kaydır</option>
            </select>
          </Field>
          <details className="group rounded-xl border border-[var(--line)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[12px] font-medium text-[var(--ink)]">
              Renkleri özelleştir
              <span aria-hidden className="text-[var(--muted)] transition group-open:rotate-90">›</span>
            </summary>
          <div className="grid grid-cols-2 gap-3 px-3 pb-3">
            {(
              [
                ["Zemin", "backgroundColor"],
                ["Kart", "surfaceColor"],
                ["Metin", "textColor"],
                ["Vurgu", "accentColor"],
              ] as const
            ).map(([label, key]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5">
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    value={t[key]}
                    onChange={(e) =>
                      onDocumentChange({ theme: { ...t, [key]: e.target.value } })
                    }
                  />
                  <span className="font-mono text-[11px] text-[var(--muted)]">{t[key]}</span>
                </div>
              </Field>
            ))}
          </div>
          </details>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yazı stili">
              <select
                className={inputClassName()}
                value={t.fontPair}
                onChange={(e) =>
                  onDocumentChange({
                    theme: {
                      ...t,
                      fontPair: e.target.value as MenuDocument["theme"]["fontPair"],
                    },
                  })
                }
              >
                <option value="serif">Serif — zarif</option>
                <option value="sans">Sans — modern</option>
                <option value="display">Display — vurgulu</option>
                <option value="grotesk">Grotesk — geometrik</option>
                <option value="mono">Mono — teknik</option>
                <option value="rounded">Rounded — yuvarlak</option>
              </select>
            </Field>
            <Field label="Köşe">
              <select
                className={inputClassName()}
                value={t.radius}
                onChange={(e) =>
                  onDocumentChange({
                    theme: {
                      ...t,
                      radius: e.target.value as MenuDocument["theme"]["radius"],
                    },
                  })
                }
              >
                <option value="sharp">Keskin</option>
                <option value="soft">Yumuşak</option>
                <option value="round">Yuvarlak</option>
              </select>
            </Field>
          </div>
          <div className="space-y-3 rounded-xl border border-[var(--line)] p-3">
            <p className="text-[11px] font-semibold text-[var(--ink)]">
              {DEVICE_NAME[device]} yerleşimi
            </p>
            <Field label={`Sayfa kenar boşluğu · ${frame.pagePadding}px`}>
              <input
                type="range"
                min={0}
                max={64}
                value={frame.pagePadding}
                onChange={(e) => patchFrame({ pagePadding: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </Field>
            {device === "mobile" ? (
              <p className="text-[11px] text-[var(--muted)]">Mobilde içerik ekranın tamamını kullanır.</p>
            ) : (
              <>
                <label className="flex items-center justify-between gap-3 text-[12px] font-medium text-[var(--ink)]">
                  <span>
                    Ekrana yay
                    <span className="block text-[11px] font-normal text-[var(--muted)]">
                      İçerik açıldığı ekranın tamamını kullanır.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={Boolean(frame.fullWidth)}
                    onChange={(e) => patchFrame({ fullWidth: e.target.checked || undefined })}
                    className="h-5 w-9 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />
                </label>
                {frame.fullWidth ? null : (
              <Field label={`İçerik genişliği · ${frame.maxWidth}px`}>
                <input
                  type="range"
                  min={device === "tablet" ? 480 : 640}
                  max={device === "tablet" ? 1000 : 1400}
                  step={10}
                  value={frame.maxWidth}
                  onChange={(e) => patchFrame({ maxWidth: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </Field>
                )}
              </>
            )}
          </div>
          <div className="space-y-2 rounded-xl border border-[var(--line)] p-3">
            <p className="text-[11px] font-semibold text-[var(--ink)]">
              Açılan ekranlar · {DEVICE_NAME[device]}
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              Ürün detayı, Sepet, Öneri, Wi-Fi gibi ekranların açılış şekli.
            </p>
            <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface)] p-1">
              {(
                [
                  { value: "drawer", label: "Alttan çekmece" },
                  { value: "dialog", label: "Ortada pencere" },
                ] as const
              ).map((opt) => {
                const current = t.overlays?.[device] ?? (device === "mobile" ? "drawer" : "dialog");
                const active = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      onDocumentChange({
                        theme: { ...t, overlays: { ...t.overlays, [device]: opt.value } },
                      })
                    }
                    className={`rounded-md px-2 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        ) : null}

        <section className={`space-y-3 ${block ? "" : "border-t border-[var(--line)] pt-5"}`}>
          <div className="flex items-center justify-between gap-2">
            {block && onDeselect ? (
              <button
                type="button"
                onClick={onDeselect}
                className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                ← Sayfa ayarları
              </button>
            ) : (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Seçili blok
              </p>
            )}
            {block ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)]"
                  onClick={() => onMove(-1)}
                >
                  Yukarı
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)]"
                  onClick={() => onMove(1)}
                >
                  Aşağı
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-[#b42318] hover:bg-[#fef3f2]"
                  onClick={onRemove}
                >
                  Sil
                </button>
              </div>
            ) : null}
          </div>
          {!block ? (
            <div className="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--panel)] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">Blok seçilmedi</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                Ortadaki önizlemede bir alana tıklayın veya soldan yeni blok ekleyin.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <BlockFields
                block={block}
                device={device}
                onChange={onBlockChange}
                onDocumentChange={onDocumentChange}
                onUploadImage={onUploadImage}
                uploading={uploading}
                itemsPanel={itemsPanel}
                onItemsPanel={setItemsPanel}
                navPanel={navPanel}
                onNavPanel={setNavPanel}
                formKind={formKind}
                onFormKind={setFormKind}
                languages={headerLangs}
                defaultLanguage={header?.defaultLanguage ?? "tr"}
                uiLabels={header?.uiLabels ?? {}}
                onHeaderChange={(patch) => {
                  if (onPatchHeader) {
                    onPatchHeader(patch);
                    return;
                  }
                  onDocumentChange({
                    blocks: document.blocks.map((b) =>
                      b.type === "header" ? { ...b, ...patch } : b,
                    ),
                  });
                }}
              />
              <StyleFields block={block} device={device} onChange={onBlockChange} />
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function StyleFields({
  block,
  device,
  onChange,
}: {
  block: MenuBlock;
  device: MenuDeviceId;
  onChange: (patch: Partial<MenuBlock>) => void;
}) {
  const style = block.style ?? {};
  const isBase = device === "mobile";
  const own: MenuBlockStyleBase = isBase ? style : (style.byDevice?.[device] ?? {});
  const resolved = resolveBlockStyle(style, device);

  function set<K extends keyof MenuBlockStyleBase>(key: K, value: MenuBlockStyleBase[K] | undefined) {
    if (isBase) {
      const next = { ...style, [key]: value };
      if (value === undefined) delete next[key];
      onChange({ style: next });
      return;
    }
    const dev: MenuBlockStyleBase = { ...(style.byDevice?.[device] ?? {}), [key]: value };
    if (value === undefined) delete dev[key];
    const byDevice = { ...(style.byDevice ?? {}), [device]: dev };
    if (!Object.keys(dev).length) delete byDevice[device];
    onChange({ style: { ...style, byDevice: Object.keys(byDevice).length ? byDevice : undefined } });
  }
  const isOverridden = (key: keyof MenuBlockStyleBase) => !isBase && own[key] !== undefined;
  const badge = (key: keyof MenuBlockStyleBase) =>
    isOverridden(key) ? <OverrideBadge device={device} onReset={() => set(key, undefined)} /> : null;

  const showText = block.type === "text" || block.type === "welcome" || block.type === "footer";
  const hiddenHere = Boolean(resolved.hidden);

  function setHidden(h: boolean) {
    if (isBase) set("hidden", h || undefined);
    else set("hidden", h === Boolean(style.hidden) ? undefined : h);
  }

  function rangeRow(key: "paddingTop" | "paddingBottom" | "paddingX" | "borderRadius" | "fontSize", label: string, min: number, max: number, fallback: number) {
    const value = resolved[key] ?? fallback;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink)]">
          <span>
            {label}{" "}
            <span className="tabular-nums text-[var(--muted)]">
              {resolved[key] == null ? "varsayılan" : `${value}px`}
            </span>
          </span>
          {badge(key)}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={`${label} (${DEVICE_NAME[device]})`}
          onChange={(e) => set(key, Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </div>
    );
  }

  function colorRow(key: "background" | "color", label: string) {
    const value = resolved[key];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink)]">
          <span>{label}</span>
          {badge(key)}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5">
          <input
            type="color"
            className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
            value={value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
            aria-label={`${label} (${DEVICE_NAME[device]})`}
            onChange={(e) => set(key, e.target.value)}
          />
          <span className="flex-1 font-mono text-[11px] text-[var(--muted)]">{value ?? "tema rengi"}</span>
          {value ? (
            <button
              type="button"
              className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() => set(key, isBase ? undefined : "")}
              title="Rengi kaldır"
            >
              Temizle
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-[var(--line)] pt-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Yerleşim · {DEVICE_NAME[device]}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink)]">
            {DEVICE_NAME[device]} ekranında göster {badge("hidden")}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {hiddenHere ? "Bu blok bu ekranda müşterilere görünmez." : "Kapatırsanız yalnızca bu ekranda gizlenir."}
          </p>
        </div>
        <input
          type="checkbox"
          role="switch"
          checked={!hiddenHere}
          aria-label={`${DEVICE_NAME[device]} ekranında göster`}
          onChange={(e) => setHidden(!e.target.checked)}
          className="h-5 w-9 shrink-0 cursor-pointer accent-[var(--accent)]"
        />
      </div>

      <div className="space-y-3">
        {rangeRow("paddingTop", "Üst boşluk", 0, 120, 0)}
        {rangeRow("paddingBottom", "Alt boşluk", 0, 120, 0)}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink)]">
          <span>Hizalama</span>
          {badge("textAlign")}
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5" role="radiogroup" aria-label="Hizalama">
          {(
            [
              ["", "Varsayılan"],
              ["left", "Sol"],
              ["center", "Orta"],
              ["right", "Sağ"],
            ] as const
          ).map(([v, l]) => {
            const active = (resolved.textAlign ?? "") === v;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set("textAlign", (v || undefined) as MenuBlockStyleBase["textAlign"])}
                className={`h-8 rounded-md text-[11px] font-medium transition ${
                  active ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <details className="group rounded-xl border border-[var(--line)]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[12px] font-medium text-[var(--ink)]">
          Daha fazla stil
          <span aria-hidden className="text-[var(--muted)] transition group-open:rotate-90">›</span>
        </summary>
        <div className="space-y-3 px-3 pb-3">
          {rangeRow("paddingX", "Yan boşluk", 0, 80, 0)}
      {showText ? (
            <div className="space-y-3">
              {rangeRow("fontSize", "Yazı boyutu", 10, 48, 16)}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink)]">
                  <span>Yazı kalınlığı</span>
                  {badge("fontWeight")}
                </div>
                <select
                  className={inputClassName()}
                  value={resolved.fontWeight ?? ""}
                  onChange={(e) => set("fontWeight", e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Varsayılan</option>
                  <option value={300}>İnce</option>
                  <option value={400}>Normal</option>
                  <option value={600}>Kalın</option>
                  <option value={800}>Çok kalın</option>
                </select>
              </div>
            </div>
          ) : null}
    
          <div className="grid grid-cols-1 gap-3">
            {colorRow("background", "Arka plan")}
            {colorRow("color", "Yazı rengi")}
            {rangeRow("borderRadius", "Köşe yuvarlaklığı", 0, 48, 0)}
          </div>
        </div>
      </details>
    </div>
  );
}

function emptyFeedbackField(): MenuFeedbackField {
  return {
    id: nid(),
    type: "text",
    role: "custom",
    label: {},
    placeholder: {},
    required: false,
    options: [],
  };
}

const FEEDBACK_TYPE_LABEL: Record<MenuFeedbackFieldType, string> = {
  text: "Kısa metin",
  textarea: "Uzun metin",
  email: "E-posta",
  tel: "Telefon",
  select: "Seçim listesi",
};

function FeedbackFormEditor({
  form,
  langs,
  editLang,
  onEditLang,
  onChange,
}: {
  form: MenuFeedbackForm;
  langs: MenuLang[];
  editLang: MenuLang;
  onEditLang: (l: MenuLang) => void;
  onChange: (next: MenuFeedbackForm) => void;
}) {
  function patchField(id: string, patch: Partial<MenuFeedbackField>) {
    onChange({
      ...form,
      fields: form.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  return (
    <div className="space-y-3">
      {langs.length > 1 ? (
        <LocaleTabs langs={langs} value={editLang} onChange={onEditLang} />
      ) : null}
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Etiket, placeholder, gönder butonu ve teşekkür mesajı seçili dile göre kaydedilir.
      </p>
      <LocaleFields
        label="Gönder butonu"
        langs={langs}
        value={form.submitLabel ?? {}}
        onChange={(submitLabel) => onChange({ ...form, submitLabel })}
        tab={editLang}
        onTabChange={onEditLang}
        hideTabs
      />
      <LocaleFields
        label="Teşekkür mesajı"
        langs={langs}
        value={form.thanksMessage ?? {}}
        onChange={(thanksMessage) => onChange({ ...form, thanksMessage })}
        tab={editLang}
        onTabChange={onEditLang}
        hideTabs
      />
      {form.fields.map((field, idx) => (
        <div
          key={field.id}
          className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase text-[var(--muted)]">
              Alan {idx + 1}
              {field.role !== "custom" ? ` · ${field.role}` : ""}
            </p>
            {field.role !== "message" ? (
              <button
                type="button"
                className="text-[11px] text-[var(--danger)]"
                onClick={() =>
                  onChange({
                    ...form,
                    fields: form.fields.filter((f) => f.id !== field.id),
                  })
                }
              >
                Sil
              </button>
            ) : null}
          </div>
          <Field label="Tür">
            <select
              className={inputClassName()}
              value={field.type}
              disabled={field.role === "message"}
              onChange={(e) =>
                patchField(field.id, {
                  type: e.target.value as MenuFeedbackFieldType,
                })
              }
            >
              {MENU_FEEDBACK_FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FEEDBACK_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <LocaleFields
            label="Etiket"
            langs={langs}
            value={field.label}
            onChange={(label) => patchField(field.id, { label })}
            tab={editLang}
            onTabChange={onEditLang}
            hideTabs
          />
          <LocaleFields
            label="Placeholder"
            langs={langs}
            value={field.placeholder}
            onChange={(placeholder) => patchField(field.id, { placeholder })}
            tab={editLang}
            onTabChange={onEditLang}
            hideTabs
          />
          <Toggle
            label="Zorunlu"
            checked={field.required}
            onChange={(required) =>
              patchField(field.id, {
                required: field.role === "message" ? true : required,
              })
            }
          />
          {field.type === "select" ? (
            <div className="space-y-2 rounded-md bg-[var(--surface)] p-2">
              <p className="text-[11px] font-medium text-[var(--muted)]">Seçenekler</p>
              {field.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    className={inputClassName()}
                    placeholder={langLabel(editLang)}
                    value={opt.label[editLang] ?? ""}
                    onChange={(e) =>
                      patchField(field.id, {
                        options: field.options.map((o) =>
                          o.id === opt.id
                            ? {
                                ...o,
                                label: { ...o.label, [editLang]: e.target.value },
                              }
                            : o,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="text-[11px] text-[var(--danger)]"
                    onClick={() =>
                      patchField(field.id, {
                        options: field.options.filter((o) => o.id !== opt.id),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={`${btnGhost()} w-full`}
                onClick={() =>
                  patchField(field.id, {
                    options: [
                      ...field.options,
                      { id: nid(), label: { [editLang]: "" } },
                    ],
                  })
                }
              >
                Seçenek ekle
              </button>
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className={`${btnGhost()} w-full`}
        onClick={() =>
          onChange({ ...form, fields: [...form.fields, emptyFeedbackField()] })
        }
      >
        Alan ekle
      </button>
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  uploading,
  onUploadImage,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  uploading?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
  onChange: (url: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label}>
      {hint ? <p className="mb-2 text-[11px] text-[var(--muted)]">{hint}</p> : null}
      {value ? (
        <div className="mb-2 overflow-hidden rounded-lg border border-[var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveAdminAssetUrl(value)}
            alt=""
            className="h-28 w-full object-cover object-center"
          />
        </div>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={!onUploadImage || uploading}
        className="block w-full text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--ink)]"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !onUploadImage) return;
          void onUploadImage(file).then((url) => onChange(url));
        }}
      />
      {value ? (
        <button
          type="button"
          className={`${btnGhost()} mt-2 w-full`}
          onClick={() => onChange("")}
        >
          Görseli kaldır
        </button>
      ) : null}
      {uploading ? (
        <p className="mt-1 text-xs text-[var(--muted)]">Yükleniyor…</p>
      ) : null}
    </Field>
  );
}

/** Dil sekmeli metin alanı: her dil için ayrı değer. Boş dil için tr değeri kullanılır. */
function LocalizedTextField({
  label,
  value,
  onChange,
  langs = ["tr", "en", "ru"],
}: {
  label: string;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  langs?: string[];
}) {
  const [tab, setTab] = useState<string>(langs[0] ?? "tr");
  return (
    <Field label={label}>
      <div className="space-y-2">
        <LocaleTabs langs={langs as MenuLang[]} value={tab as MenuLang} onChange={(l) => setTab(l)} />
        <input
          className={inputClassName()}
          value={value[tab] ?? ""}
          placeholder={value.tr ?? ""}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
        />
      </div>
    </Field>
  );
}

function BlockFields({
  block,
  device,
  onChange,
  onDocumentChange,
  onUploadImage,
  uploading,
  itemsPanel,
  onItemsPanel,
  navPanel,
  onNavPanel,
  formKind,
  onFormKind,
  languages,
  defaultLanguage,
  uiLabels,
  onHeaderChange,
}: {
  block: MenuBlock;
  device: MenuDeviceId;
  onChange: (patch: Partial<MenuBlock>) => void;
  onDocumentChange: (patch: Partial<MenuDocument>) => void;
  onUploadImage?: (file: File) => Promise<string>;
  uploading?: boolean;
  itemsPanel: "list" | "detail";
  onItemsPanel: (panel: "list" | "detail") => void;
  navPanel: "buttons" | "explore" | "forms";
  onNavPanel: (panel: "buttons" | "explore" | "forms") => void;
  formKind: "suggest" | "complaint";
  onFormKind: (kind: "suggest" | "complaint") => void;
  languages: MenuLang[];
  defaultLanguage: MenuLang;
  uiLabels: Partial<Record<string, MenuLocalized>>;
  onHeaderChange: (patch: {
    languages?: MenuLang[];
    defaultLanguage?: MenuLang;
    uiLabels?: Partial<Record<string, MenuLocalized>>;
  }) => void;
}) {
  const langs = languages.length ? languages : (["tr"] as MenuLang[]);
  const [editLang, setEditLang] = useState<MenuLang>(langs[0]!);
  useEffect(() => {
    if (!langs.includes(editLang)) setEditLang(langs[0]!);
  }, [langs, editLang]);

  switch (block.type) {
    case "header":
      return (
        <>
          <Toggle label="Logo göster" checked={block.showLogo} onChange={(v) => onChange({ showLogo: v })} />
          {block.showLogo ? (
            <>
              <ImageUploadField
                label="QR menü logosu"
                hint="Boş bırakırsanız işletme logosu kullanılır. Arka plan yok — logo şeffaf kutuda gösterilir."
                value={block.logoUrl ?? ""}
                uploading={uploading}
                onUploadImage={onUploadImage}
                onChange={(logoUrl) => onChange({ logoUrl })}
              />
              <Field label="Köşe">
                <select
                  className={inputClassName()}
                  value={block.logoShape ?? "round"}
                  onChange={(e) =>
                    onChange({
                      logoShape: e.target.value as "round" | "square" | "wide",
                    })
                  }
                >
                  <option value="round">Yuvarlak</option>
                  <option value="square">Hafif yuvarlak</option>
                  <option value="wide">Köşesiz / yatay</option>
                </select>
              </Field>
              <DeviceRangeField
                label="Logo genişliği"
                device={device}
                base={block.logoWidth ?? block.logoSize ?? 40}
                map={block.logoWidthByDevice}
                min={24}
                max={280}
                onBase={(logoWidth) => onChange({ logoWidth, logoSize: block.logoHeight ?? block.logoSize ?? 40 })}
                onMap={(logoWidthByDevice) => onChange({ logoWidthByDevice })}
              />
              <DeviceRangeField
                label="Logo yüksekliği"
                device={device}
                base={block.logoHeight ?? block.logoSize ?? 40}
                map={block.logoHeightByDevice}
                min={24}
                max={160}
                onBase={(logoHeight) => onChange({ logoHeight, logoSize: logoHeight })}
                onMap={(logoHeightByDevice) => onChange({ logoHeightByDevice })}
              />
              <p className="text-[11px] text-[var(--muted)]">
                Genişlik ve yüksekliği ayrı ayarlayın. Logo kırpılmaz; kutuya sığdırılır,
                arka plan eklenmez.
              </p>
            </>
          ) : null}
          <Toggle label="İşletme adı" checked={block.showName} onChange={(v) => onChange({ showName: v })} />
          <Toggle label="Masa etiketi" checked={block.showTable} onChange={(v) => onChange({ showTable: v })} />
          <Toggle label="Üstte sabit kalsın" checked={block.sticky} onChange={(v) => onChange({ sticky: v })} />
          <Toggle
            label="Dil seçici"
            checked={block.showLanguages}
            onChange={(v) => onChange({ showLanguages: v })}
          />
          {block.showLanguages ? (
            <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
              <div>
                <p className="text-[11px] font-medium text-[var(--muted)]">Menü dilleri</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                  Sekmeler yatay kayar; yeni dil alta eklenmez, şeride eklenir.
                </p>
              </div>
              <div className="flex items-stretch gap-1 overflow-x-auto overscroll-x-contain pb-0.5">
                {block.languages.map((l) => {
                  const meta = getMenuLangMeta(l);
                  const isDefault = block.defaultLanguage === l;
                  return (
                    <div
                      key={l}
                      className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs ${
                        isDefault
                          ? "border-[#0f6e56]/40 bg-[#0f6e56]/10 text-[#0c5a46]"
                          : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
                      }`}
                    >
                      <button
                        type="button"
                        className="font-medium"
                        title="Varsayılan yap"
                        onClick={() => onChange({ defaultLanguage: l })}
                      >
                        {meta.flag} {meta.native}
                      </button>
                      {block.languages.length > 1 ? (
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                          aria-label={`${meta.native} dilini kaldır`}
                          onClick={() => {
                            const next = block.languages.filter((x) => x !== l);
                            onChange({
                              languages: next.length ? next : ["tr"],
                              defaultLanguage: next.includes(block.defaultLanguage)
                                ? block.defaultLanguage
                                : (next[0] ?? "tr"),
                            });
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                <select
                  className="min-h-10 shrink-0 rounded-lg border border-dashed border-[var(--line-strong)] bg-transparent px-2 text-xs text-[var(--muted)]"
                  value=""
                  aria-label="Dil ekle"
                  onChange={(e) => {
                    const code = e.target.value;
                    if (!code || block.languages.includes(code)) return;
                    onChange({ languages: [...block.languages, code] });
                  }}
                >
                  <option value="">+ Dil</option>
                  {MENU_LANG_CATALOG.filter((l) => !block.languages.includes(l.code)).map(
                    (l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.native}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {block.languages.length > 1 ? (
                <p className="text-[11px] text-[var(--muted)]">
                  Varsayılan: {getMenuLangMeta(block.defaultLanguage).flag}{" "}
                  {getMenuLangMeta(block.defaultLanguage).native} — sekmesine tıklayarak
                  değiştirin.
                </p>
              ) : null}
              <UiLabelsEditor
                langs={block.languages}
                value={block.uiLabels ?? {}}
                onChange={(uiLabels) => onChange({ uiLabels })}
              />
            </div>
          ) : null}
          <Field label="Üst satır">
            <input
              className={inputClassName()}
              value={block.eyebrow}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
            />
          </Field>
          <Field label="Başlık (boşsa işletme adı)">
            <input
              className={inputClassName()}
              value={block.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Alt yazı">
            <input
              className={inputClassName()}
              value={block.subtitle}
              onChange={(e) => onChange({ subtitle: e.target.value })}
            />
          </Field>
          <Field label="Hizalama">
            <select
              className={inputClassName()}
              value={block.align}
              onChange={(e) => onChange({ align: e.target.value as "left" | "center" })}
            >
              <option value="left">Sol</option>
              <option value="center">Orta</option>
            </select>
          </Field>
        </>
      );
    case "welcome":
      return (
        <>
          <Field label="Üst satır">
            <input
              className={inputClassName()}
              value={block.eyebrow}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
            />
          </Field>
          <Field label="Başlık">
            <textarea
              className={inputClassName()}
              rows={2}
              value={block.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Alt satır">
            <input
              className={inputClassName()}
              value={block.subtitle}
              onChange={(e) => onChange({ subtitle: e.target.value })}
            />
          </Field>
          <Field label="Konum">
            <input
              className={inputClassName()}
              value={block.locationLabel}
              onChange={(e) => onChange({ locationLabel: e.target.value })}
            />
          </Field>
        </>
      );
    case "cover":
      return (
        <>
          <DeviceRangeField
            label="Kapak yüksekliği"
            device={device}
            base={block.height}
            map={block.heightByDevice}
            min={80}
            max={420}
            onBase={(height) => onChange({ height })}
            onMap={(heightByDevice) => onChange({ heightByDevice })}
          />
          <Field label={`Karartma (${block.overlay}%)`}>
            <input
              type="range"
              min={0}
              max={80}
              value={block.overlay}
              onChange={(e) => onChange({ overlay: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <ImageUploadField
            label="Kapak görseli"
            hint="Her boyutta yüklenen görsel otomatik kırpılarak sığdırılır."
            value={block.imageUrl}
            uploading={uploading}
            onUploadImage={onUploadImage}
            onChange={(imageUrl) => onChange({ imageUrl })}
          />
        </>
      );
    case "search":
      return (
        <LocalizedTextField
          label="Arama placeholder"
          langs={languages}
          value={(block.placeholder ?? {}) as Record<string, string>}
          onChange={(next) => onChange({ placeholder: next })}
        />
      );
    case "categories":
      return (
        <>
          <LanguagesManager
            langs={langs}
            defaultLanguage={defaultLanguage}
            onChange={onHeaderChange}
          />
          <LocaleFields
            label="Bölüm başlığı"
            langs={langs}
            value={
              typeof block.title === "string"
                ? { tr: block.title }
                : (block.title ?? {})
            }
            onChange={(title) => onChange({ title })}
            tab={editLang}
            onTabChange={setEditLang}
          />
          <LocaleFields
            label="Geri butonu"
            langs={langs}
            value={uiLabels.back ?? {}}
            onChange={(back) =>
              onHeaderChange({ uiLabels: { ...uiLabels, back } })
            }
            tab={editLang}
            onTabChange={setEditLang}
            hideTabs
          />
          <p className="text-[11px] text-[var(--muted)]">
            Geri metni kategori detayında görünür. Boş bırakırsanız varsayılan çeviri
            kullanılır.
          </p>
          <Field label="Düzen">
            <select
              className={inputClassName()}
              value={block.mode}
              onChange={(e) =>
                onChange({ mode: e.target.value as "grid" | "chips" | "list" })
              }
            >
              <option value="grid">Kart ızgarası</option>
              <option value="chips">Etiketler</option>
              <option value="list">Liste</option>
            </select>
          </Field>
          <Toggle
            label="Görseller"
            checked={block.showImages}
            onChange={(v) => onChange({ showImages: v })}
          />
          <Toggle
            label="Ürün sayısı"
            checked={block.showCount}
            onChange={(v) => onChange({ showCount: v })}
          />
          <Toggle
            label="Tıklayınca ürünlere git"
            checked={block.openOnClick}
            onChange={(v) => {
              onChange({ openOnClick: v });
              if (v) onDocumentChange({ navigation: "drilldown" });
            }}
          />
          {block.openOnClick ? (
            <p className="text-[11px] text-[var(--muted)]">
              Ana sayfada yalnızca kategoriler görünür; ürünler kategoriye tıklanınca açılır.
            </p>
          ) : null}
          {block.mode === "grid" ? (
            <>
              <GridColsEditor
                label="Sütun düzeni (ekran genişliğine göre)"
                value={block.gridCols}
                fallback={{ base: block.columns || 2, md: block.columnsByDevice?.tablet ?? (block.columns || 2) + 1, lg: block.columnsDesktop ?? (block.columns || 2) + 2 }}
                onChange={(gridCols) => onChange({ gridCols, columns: gridCols.base })}
              />
              <Field label="Görsel oranı">
                <select
                  className={inputClassName()}
                  value={block.imageAspect ?? "wide"}
                  onChange={(e) =>
                    onChange({
                      imageAspect: e.target.value as "wide" | "square" | "tall",
                    })
                  }
                >
                  <option value="wide">Yatay (4:3)</option>
                  <option value="square">Kare (1:1)</option>
                  <option value="tall">Dikey (3:4)</option>
                </select>
              </Field>
              <p className="text-[11px] text-[var(--muted)]">
                Yüklediğiniz kategori fotoğrafları seçilen orana otomatik sığdırılır; boyut
                farkı önemli değil.
              </p>
            </>
          ) : null}
        </>
      );
    case "items": {
      const detail: MenuProductDetail = {
        ...defaultProductDetail(),
        ...block.detail,
      };
      const patchDetail = (patch: Partial<MenuProductDetail>) =>
        onChange({ detail: { ...detail, ...patch } });
      const tabClass = (active: boolean) =>
        `flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
          active ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
        }`;
      return (
        <>
          <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-1">
            <button
              type="button"
              className={tabClass(itemsPanel === "list")}
              onClick={() => onItemsPanel("list")}
            >
              Ürün listesi
            </button>
            <button
              type="button"
              className={tabClass(itemsPanel === "detail")}
              onClick={() => onItemsPanel("detail")}
            >
              Detay sayfası
            </button>
          </div>
          {itemsPanel === "list" ? (
            <>
          <Field label="Başlık">
            <input
              className={inputClassName()}
              value={block.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Kart düzeni">
            <select
              className={inputClassName()}
              value={block.layout}
              onChange={(e) =>
                onChange({
                  layout: e.target.value as "split" | "compact" | "card" | "imageFirst",
                })
              }
            >
              <option value="split">Metin + yan görsel</option>
              <option value="compact">Kompakt</option>
              <option value="card">Kart ızgarası</option>
              <option value="imageFirst">Görsel üstte</option>
            </select>
          </Field>
          <GridColsEditor
            label="Ürün sütunları (ekran genişliğine göre)"
            value={block.gridCols}
            fallback={{ base: block.columns || 1, md: block.columnsByDevice?.tablet ?? (block.columns || 1), lg: block.columnsByDevice?.desktop ?? (block.columns || 1) + 1 }}
            max={4}
            onChange={(gridCols) => onChange({ gridCols, columns: gridCols.base })}
          />
          <p className="text-[11px] text-[var(--muted)]">
            Kategoriye tıklanınca açılan ürün listesi bu sütun sayısını kullanır. Tablet ve
            masaüstünde otomatik biraz artar.
          </p>
          <Field label="Kapsam">
            <select
              className={inputClassName()}
              value={block.scope}
              onChange={(e) => onChange({ scope: e.target.value as "all" | "selected" })}
            >
              <option value="selected">Sadece seçili kategori</option>
              <option value="all">Tüm kategoriler</option>
            </select>
          </Field>
          <Toggle label="Görseller" checked={block.showImages} onChange={(v) => onChange({ showImages: v })} />
          <Toggle label="Fiyat" checked={block.showPrice} onChange={(v) => onChange({ showPrice: v })} />
          <Toggle
            label="Açıklama"
            checked={block.showDescription}
            onChange={(v) => onChange({ showDescription: v })}
          />
          <Toggle label="Etiketler" checked={block.showBadges} onChange={(v) => onChange({ showBadges: v })} />
          <Toggle label="Kalori" checked={block.showCalories} onChange={(v) => onChange({ showCalories: v })} />
          <Toggle
            label="Ekstra / seçenek bilgisi (kartta)"
            checked={block.showVariants !== false}
            onChange={(v) => onChange({ showVariants: v })}
          />
          <Toggle
            label="Hazırlık süresi"
            checked={block.showPrepTime}
            onChange={(v) => onChange({ showPrepTime: v })}
          />
          <Field label="Ürün tıklanınca">
            <select
              className={inputClassName()}
              value={block.productClick}
              onChange={(e) =>
                onChange({ productClick: e.target.value as "detail" | "cart" | "none" })
              }
            >
              <option value="detail">Detay sayfası</option>
              <option value="cart">Sepete ekle</option>
              <option value="none">Aksiyon yok</option>
            </select>
          </Field>
          <Toggle
            label="Sepete eklemeye izin ver"
            checked={block.allowAddToCart}
            onChange={(v) => onChange({ allowAddToCart: v })}
          />
            </>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                Ortadaki önizlemede örnek bir ürün açılır. Görsel oranı, metinler ve buton
                canlı menüyle aynıdır.
              </p>
              <Toggle
                label="Görsel göster"
                checked={detail.showImage}
                onChange={(v) => patchDetail({ showImage: v })}
              />
              {detail.showImage ? (
                <>
                  <Field label="Görsel oranı">
                    <select
                      className={inputClassName()}
                      value={detail.imageAspect}
                      onChange={(e) =>
                        patchDetail({
                          imageAspect: e.target.value as MenuProductDetail["imageAspect"],
                        })
                      }
                    >
                      <option value="wide">Yatay (16:10)</option>
                      <option value="square">Kare</option>
                      <option value="tall">Dikey (3:4)</option>
                      <option value="hero">Kapak (4:5)</option>
                    </select>
                  </Field>
                  <Toggle
                    label="Kenarlara yasla"
                    checked={detail.imageBleed}
                    onChange={(v) => patchDetail({ imageBleed: v })}
                  />
                  {!detail.imageBleed ? (
                    <Field label={`Köşe yuvarlaklığı (${detail.imageRadius}px)`}>
                      <input
                        type="range"
                        min={0}
                        max={28}
                        value={detail.imageRadius}
                        onChange={(e) =>
                          patchDetail({ imageRadius: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
              <Toggle
                label="Ürün adı (büyük başlık)"
                checked={detail.showName}
                onChange={(v) => patchDetail({ showName: v })}
              />
              <Toggle
                label="Açıklama"
                checked={detail.showDescription}
                onChange={(v) => patchDetail({ showDescription: v })}
              />
              <Toggle
                label="Fiyat"
                checked={detail.showPrice}
                onChange={(v) => patchDetail({ showPrice: v })}
              />
              <Toggle
                label="Etiketler"
                checked={detail.showBadges}
                onChange={(v) => patchDetail({ showBadges: v })}
              />
              <Toggle
                label="Kalori"
                checked={detail.showCalories}
                onChange={(v) => patchDetail({ showCalories: v })}
              />
              <Toggle
                label="Hazırlık süresi"
                checked={detail.showPrepTime}
                onChange={(v) => patchDetail({ showPrepTime: v })}
              />
              <Toggle
                label="Ekstralar (+₺)"
                checked={detail.showExtras !== false}
                onChange={(v) => patchDetail({ showExtras: v })}
              />
              <Toggle
                label="Seçenekler (fiyatlı varyasyonlar)"
                checked={detail.showOptions !== false}
                onChange={(v) => patchDetail({ showOptions: v })}
              />
              <Toggle
                label="Alerjenler"
                checked={detail.showAllergens}
                onChange={(v) => patchDetail({ showAllergens: v })}
              />
              <Toggle
                label="Sepete ekle butonu"
                checked={detail.showAddToCart}
                onChange={(v) => patchDetail({ showAddToCart: v })}
              />
              {detail.showAddToCart ? (
                <Field label="Buton yazısı">
                  <input
                    className={inputClassName()}
                    placeholder="Sepete ekle"
                    value={detail.addToCartLabel}
                    onChange={(e) => patchDetail({ addToCartLabel: e.target.value })}
                  />
                </Field>
              ) : null}
            </>
          )}
          <div className="space-y-3 rounded-xl border border-[var(--line)] p-3">
            <p className="text-[11px] font-semibold text-[var(--ink)]">Tablet ve masaüstü penceresi</p>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              {device === "mobile"
                ? "Telefonda ürün alttan çekmece olarak açılır. Bu ayarlar tablet ve masaüstü penceresi içindir."
                : `${DEVICE_NAME[device]} ekranında ürün ortada pencere olarak açılır.`}
            </p>
            <Field label="Görsel tarafı">
              <select
                className={inputClassName()}
                value={detail.dialogImageSide}
                onChange={(e) => patchDetail({ dialogImageSide: e.target.value as "left" | "right" })}
              >
                <option value="left">Solda görsel, sağda bilgi</option>
                <option value="right">Sağda görsel, solda bilgi</option>
              </select>
            </Field>
            <Field label={`Görsel genişliği · %${detail.dialogImageShare}`}>
              <input
                type="range"
                min={30}
                max={70}
                step={1}
                value={detail.dialogImageShare}
                onChange={(e) => patchDetail({ dialogImageShare: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </Field>
            {device !== "mobile" ? (
              <Field
                label={`Pencere genişliği · ${
                  detail.dialogWidthByDevice?.[device] ?? (device === "tablet" ? 760 : 960)
                }px`}
              >
                <input
                  type="range"
                  min={480}
                  max={1200}
                  step={10}
                  value={detail.dialogWidthByDevice?.[device] ?? (device === "tablet" ? 760 : 960)}
                  onChange={(e) =>
                    patchDetail({
                      dialogWidthByDevice: {
                        ...detail.dialogWidthByDevice,
                        [device]: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-[var(--accent)]"
                />
              </Field>
            ) : null}
          </div>
        </>
      );
    }
    case "text":
      return (
        <>
          <Field label="Tip">
            <select
              className={inputClassName()}
              value={block.as}
              onChange={(e) => onChange({ as: e.target.value as "h2" | "p" })}
            >
              <option value="h2">Başlık</option>
              <option value="p">Paragraf</option>
            </select>
          </Field>
          <Field label="Metin">
            <textarea
              className={inputClassName()}
              rows={3}
              value={block.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </Field>
        </>
      );
    case "image":
      return (
        <>
          <ImageUploadField
            label="Görsel"
            hint="Her boyutta yüklenen görsel 16:9 orana sığdırılır."
            value={block.url}
            uploading={uploading}
            onUploadImage={onUploadImage}
            onChange={(url) => onChange({ url })}
          />
          <Field label="Alt metin">
            <input
              className={inputClassName()}
              value={block.alt}
              onChange={(e) => onChange({ alt: e.target.value })}
            />
          </Field>
        </>
      );
    case "divider":
      return (
        <>
          <Field label="Renk">
            <input
              type="color"
              className="h-8 w-full rounded border"
              value={block.color}
              onChange={(e) => onChange({ color: e.target.value })}
            />
          </Field>
          <Field label={`Kalınlık (${block.thickness}px)`}>
            <input
              type="range"
              min={1}
              max={8}
              value={block.thickness}
              onChange={(e) => onChange({ thickness: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </>
      );
    case "spacer":
      return (
        <DeviceRangeField
          label="Boşluk"
          device={device}
          base={block.size}
          map={block.sizeByDevice}
          min={4}
          max={160}
          onBase={(size) => onChange({ size })}
          onMap={(sizeByDevice) => onChange({ sizeByDevice })}
        />
      );
    case "footer":
      return (
        <>
          <Field label="Metin">
            <input
              className={inputClassName()}
              value={block.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </Field>
          <Toggle
            label="StampWell satırı"
            checked={block.showBranding}
            onChange={(v) => onChange({ showBranding: v })}
          />
        </>
      );
    case "branchPicker":
      return (
        <Field label="Etiket">
          <input
            className={inputClassName()}
            value={block.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </Field>
      );
    case "bottomNav": {
      const explore: MenuExplorePage = {
        ...defaultExplorePage(),
        ...block.explore,
      };
      const patchExplore = (next: MenuExplorePage) => onChange({ explore: next });
      const tabClass = (active: boolean) =>
        `flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
          active ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
        }`;
      const hrefHint =
        "Instagram: @kullanici veya URL · Telefon: +90… · Harita: adres veya Google Maps linki";
      const labelMap = (item: (typeof block.items)[number]): MenuLocalized =>
        typeof item.label === "string" ? { tr: item.label } : (item.label ?? {});
      return (
        <>
          <LanguagesManager
            langs={langs}
            defaultLanguage={defaultLanguage}
            onChange={onHeaderChange}
          />
          <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-1">
            <button
              type="button"
              className={tabClass(navPanel === "buttons")}
              onClick={() => onNavPanel("buttons")}
            >
              Butonlar
            </button>
            <button
              type="button"
              className={tabClass(navPanel === "explore")}
              onClick={() => onNavPanel("explore")}
            >
              Keşfet
            </button>
            <button
              type="button"
              className={tabClass(navPanel === "forms")}
              onClick={() => onNavPanel("forms")}
            >
              Formlar
            </button>
          </div>
          {navPanel === "buttons" ? (
            <>
          <p className="text-[11px] text-[var(--muted)]">
            Alt menü isimleri açık dillere göre çevrilir.
          </p>
          {langs.length > 1 ? (
            <LocaleTabs langs={langs} value={editLang} onChange={setEditLang} />
          ) : null}
          <div className="space-y-3 rounded-lg border border-[var(--line)] p-2">
            {block.items.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      onChange({
                        items: block.items.map((n) =>
                          n.id === item.id ? { ...n, enabled: e.target.checked } : n,
                        ),
                      })
                    }
                  />
                  <span className="w-20 uppercase text-[var(--muted)]">{item.id}</span>
                </label>
                <input
                  className={inputClassName()}
                  placeholder={langLabel(editLang)}
                  value={labelMap(item)[editLang] ?? ""}
                  onChange={(e) =>
                    onChange({
                      items: block.items.map((n) =>
                        n.id === item.id
                          ? {
                              ...n,
                              label: { ...labelMap(n), [editLang]: e.target.value },
                            }
                          : n,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <Field label="Wi-Fi ağ adı">
            <input
              className={inputClassName()}
              value={block.wifiSsid}
              onChange={(e) => onChange({ wifiSsid: e.target.value })}
            />
          </Field>
          <Field label="Wi-Fi şifre">
            <input
              className={inputClassName()}
              value={block.wifiPassword}
              onChange={(e) => onChange({ wifiPassword: e.target.value })}
            />
          </Field>
            </>
          ) : navPanel === "explore" ? (
            <>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                Tek dil sekmesi tüm alanlara uygulanır. Yeni dil üstteki şeritten eklenir.
                {` ${hrefHint}`}
              </p>
              {langs.length > 1 ? (
                <LocaleTabs langs={langs} value={editLang} onChange={setEditLang} />
              ) : null}
              <LocaleFields
                label="Üst etiket"
                langs={langs}
                value={explore.eyebrow}
                onChange={(eyebrow) => patchExplore({ ...explore, eyebrow })}
                tab={editLang}
                onTabChange={setEditLang}
                hideTabs
              />
              <LocaleFields
                label="Başlık"
                langs={langs}
                value={explore.title}
                onChange={(title) => patchExplore({ ...explore, title })}
                tab={editLang}
                onTabChange={setEditLang}
                hideTabs
              />
              <LocaleFields
                label="Açıklama"
                langs={langs}
                value={explore.description}
                onChange={(description) => patchExplore({ ...explore, description })}
                multiline
                tab={editLang}
                onTabChange={setEditLang}
                hideTabs
              />
              <LocaleFields
                label="Konum"
                langs={langs}
                value={explore.location}
                onChange={(location) => patchExplore({ ...explore, location })}
                tab={editLang}
                onTabChange={setEditLang}
                hideTabs
              />
              <LocaleFields
                label="Saatler"
                langs={langs}
                value={explore.hours}
                onChange={(hours) => patchExplore({ ...explore, hours })}
                tab={editLang}
                onTabChange={setEditLang}
                hideTabs
              />
              {explore.sections.map((section, si) => (
                <div
                  key={section.id}
                  className="space-y-2 rounded-lg border border-[var(--line)] p-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase text-[var(--muted)]">
                      Bölüm {si + 1}
                    </p>
                    <button
                      type="button"
                      className="text-[11px] text-[var(--danger)]"
                      onClick={() =>
                        patchExplore({
                          ...explore,
                          sections: explore.sections.filter((s) => s.id !== section.id),
                        })
                      }
                    >
                      Bölümü sil
                    </button>
                  </div>
                  <LocaleFields
                    label="Bölüm başlığı"
                    langs={langs}
                    value={section.heading}
                    onChange={(heading) =>
                      patchExplore({
                        ...explore,
                        sections: explore.sections.map((s) =>
                          s.id === section.id ? { ...s, heading } : s,
                        ),
                      })
                    }
                    tab={editLang}
                    onTabChange={setEditLang}
                    hideTabs
                  />
                  {section.cards.map((card) => (
                    <div
                      key={card.id}
                      className="space-y-2 rounded-md bg-[var(--surface)] p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Toggle
                          label="Göster"
                          checked={card.enabled}
                          onChange={(enabled) =>
                            patchExplore({
                              ...explore,
                              sections: explore.sections.map((s) =>
                                s.id !== section.id
                                  ? s
                                  : {
                                      ...s,
                                      cards: s.cards.map((c) =>
                                        c.id === card.id ? { ...c, enabled } : c,
                                      ),
                                    },
                              ),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="text-[11px] text-[var(--danger)]"
                          onClick={() =>
                            patchExplore({
                              ...explore,
                              sections: explore.sections.map((s) =>
                                s.id !== section.id
                                  ? s
                                  : {
                                      ...s,
                                      cards: s.cards.filter((c) => c.id !== card.id),
                                    },
                              ),
                            })
                          }
                        >
                          Kartı sil
                        </button>
                      </div>
                      <Field label="Tür">
                        <select
                          className={inputClassName()}
                          value={card.kind}
                          onChange={(e) =>
                            patchExplore({
                              ...explore,
                              sections: explore.sections.map((s) =>
                                s.id !== section.id
                                  ? s
                                  : {
                                      ...s,
                                      cards: s.cards.map((c) =>
                                        c.id === card.id
                                          ? {
                                              ...c,
                                              kind: e.target.value as MenuExploreLinkKind,
                                            }
                                          : c,
                                      ),
                                    },
                              ),
                            })
                          }
                        >
                          {(Object.keys(EXPLORE_KIND_LABEL) as MenuExploreLinkKind[]).map(
                            (k) => (
                              <option key={k} value={k}>
                                {EXPLORE_KIND_LABEL[k]}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>
                      <LocaleFields
                        label="Kart başlığı"
                        langs={langs}
                        value={card.title}
                        onChange={(title) =>
                          patchExplore({
                            ...explore,
                            sections: explore.sections.map((s) =>
                              s.id !== section.id
                                ? s
                                : {
                                    ...s,
                                    cards: s.cards.map((c) =>
                                      c.id === card.id ? { ...c, title } : c,
                                    ),
                                  },
                            ),
                          })
                        }
                        tab={editLang}
                        onTabChange={setEditLang}
                        hideTabs
                      />
                      <LocaleFields
                        label="Alt yazı"
                        langs={langs}
                        value={card.subtitle}
                        onChange={(subtitle) =>
                          patchExplore({
                            ...explore,
                            sections: explore.sections.map((s) =>
                              s.id !== section.id
                                ? s
                                : {
                                    ...s,
                                    cards: s.cards.map((c) =>
                                      c.id === card.id ? { ...c, subtitle } : c,
                                    ),
                                  },
                            ),
                          })
                        }
                        tab={editLang}
                        onTabChange={setEditLang}
                        hideTabs
                      />
                      <Field label="Bağlantı / hesap / numara">
                        <input
                          className={inputClassName()}
                          value={card.href}
                          onChange={(e) =>
                            patchExplore({
                              ...explore,
                              sections: explore.sections.map((s) =>
                                s.id !== section.id
                                  ? s
                                  : {
                                      ...s,
                                      cards: s.cards.map((c) =>
                                        c.id === card.id
                                          ? { ...c, href: e.target.value }
                                          : c,
                                      ),
                                    },
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Sağda görünen değer (isteğe bağlı)">
                        <input
                          className={inputClassName()}
                          placeholder="Telefon veya e-posta"
                          value={card.value}
                          onChange={(e) =>
                            patchExplore({
                              ...explore,
                              sections: explore.sections.map((s) =>
                                s.id !== section.id
                                  ? s
                                  : {
                                      ...s,
                                      cards: s.cards.map((c) =>
                                        c.id === card.id
                                          ? { ...c, value: e.target.value }
                                          : c,
                                      ),
                                    },
                              ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`${btnGhost()} w-full`}
                    onClick={() =>
                      patchExplore({
                        ...explore,
                        sections: explore.sections.map((s) =>
                          s.id === section.id
                            ? { ...s, cards: [...s.cards, emptyExploreCard()] }
                            : s,
                        ),
                      })
                    }
                  >
                    Kart ekle
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={`${btnGhost()} w-full`}
                onClick={() =>
                  patchExplore({
                    ...explore,
                    sections: [...explore.sections, emptyExploreSection()],
                  })
                }
              >
                Bölüm ekle
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-1">
                <button
                  type="button"
                  className={tabClass(formKind === "suggest")}
                  onClick={() => onFormKind("suggest")}
                >
                  Öneri formu
                </button>
                <button
                  type="button"
                  className={tabClass(formKind === "complaint")}
                  onClick={() => onFormKind("complaint")}
                >
                  Şikayet formu
                </button>
              </div>
              <FeedbackFormEditor
                form={
                  formKind === "suggest"
                    ? (block.suggestForm ?? defaultFeedbackForm("suggest"))
                    : (block.complaintForm ?? defaultFeedbackForm("complaint"))
                }
                langs={langs}
                editLang={editLang}
                onEditLang={setEditLang}
                onChange={(next) =>
                  onChange(
                    formKind === "suggest"
                      ? { suggestForm: next }
                      : { complaintForm: next },
                  )
                }
              />
            </>
          )}
        </>
      );
    }
    default:
      return null;
  }
}

const BREAKPOINT_ROWS: { key: "base" | "md" | "xl"; label: string }[] = [
  { key: "base", label: "Mobil" },
  { key: "md", label: "Tablet" },
  { key: "xl", label: "Masaüstü" },
];

/** Tek tasarım; ekran genişliğine göre sütun sayısı. Boş bırakılan kırılım bir öncekini devralır. */
function GridColsEditor({
  label,
  value,
  fallback,
  max = 6,
  onChange,
}: {
  label: string;
  value?: { base: number; sm?: number; md?: number; lg?: number; xl?: number; "2xl"?: number };
  fallback: { base: number; md: number; lg: number };
  max?: number;
  onChange: (v: { base: number; sm?: number; md?: number; lg?: number; xl?: number; "2xl"?: number }) => void;
}) {
  const effective = (key: (typeof BREAKPOINT_ROWS)[number]["key"]): number => {
    if (value && value[key] != null) return value[key] as number;
    if (key === "base") return fallback.base;
    if (key === "md") return Math.max(fallback.base, fallback.md);
    if (key === "xl") return Math.max(fallback.base, fallback.md, fallback.lg);
    const order = BREAKPOINT_ROWS.map((r) => r.key);
    const idx = order.indexOf(key);
    return effective(order[idx - 1] as (typeof BREAKPOINT_ROWS)[number]["key"]);
  };
  const options = Array.from({ length: max }, (_, i) => i + 1);
  const previewWidth = usePreviewWidth();
  const showBreakpoint = (key: string) => {
    const px = BREAKPOINT_PREVIEW_WIDTH[key];
    if (px) previewWidth?.(px);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-[var(--muted)]">{label}</p>
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {BREAKPOINT_ROWS.map((row, i) => {
          const isSet = value?.[row.key] != null;
          return (
            <div key={row.key} className={`flex items-center justify-between gap-3 px-3 py-2 ${i > 0 ? "border-t border-[#f0ece4]" : ""}`}>
              <span className="text-[12px] text-[var(--ink)]">{row.label}</span>
              <div className="flex items-center gap-2">
                <select
                  className="h-8 w-20 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 text-[12px] tabular-nums"
                  value={effective(row.key)}
                  onFocus={() => showBreakpoint(row.key)}
                  onChange={(e) => {
                    showBreakpoint(row.key);
                    const next = { ...(value ?? { base: fallback.base }) } as Record<string, number | undefined>;
                    next[row.key] = Number(e.target.value);
                    if (row.key === "base") next.base = Number(e.target.value);
                    onChange(next as { base: number });
                  }}
                >
                  {options.map((n) => (
                    <option key={n} value={n}>{n} sütun</option>
                  ))}
                </select>
                {row.key !== "base" && isSet ? (
                  <button
                    type="button"
                    className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
                    onClick={() => {
                      const next = { ...(value ?? { base: fallback.base }) } as Record<string, number | undefined>;
                      delete next[row.key];
                      onChange(next as { base: number });
                    }}
                  >
                    sıfırla
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--muted)]">Kırılım boş bırakılırsa bir üstteki değer kullanılır. Tasarım tek; yalnızca ekran genişliğiyle esner.</p>
    </div>
  );
}
