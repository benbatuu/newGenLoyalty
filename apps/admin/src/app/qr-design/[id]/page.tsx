"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  insertMenuBlock,
  moveMenuBlock,
  normalizeMenuDocument,
  patchMenuBlock,
  removeMenuBlock,
  type MenuBlock,
  type MenuBlockType,
  type MenuDeviceId,
  type MenuDocument,
  type MenuThemePreset,
} from "@ngl/shared";
import { ErrorBanner, RequireAuth, SuccessBanner } from "../../../components/ui";
import type { PublicMenuPayload } from "../../../components/menu-themes/menu-theme-types";
import { ApiError, api, apiUpload } from "../../../lib/api";
import { useApiQuery } from "../../../lib/use-api-query";
import { PreviewWidthContext } from "../../../lib/preview-width";
import { MenuBlockPanel } from "../../menu/menu-block-panel";
import { MenuBuilderProps } from "../../menu/menu-builder-props";
import { QUICK_PALETTES } from "../../menu/palettes";
import type { MenuContentI18n } from "@ngl/shared";

type SavedThemeDetail = {
  id: string;
  name: string;
  preset: MenuThemePreset;
  isActive: boolean;
  document: MenuDocument;
};

type MenuCategoryPreview = {
  id: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  translations?: MenuContentI18n | null;
  description: string | null;
  imageUrl: string | null;
};

type MenuItemPreview = {
  id: string;
  categoryId: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  translations?: MenuContentI18n | null;
  description: string | null;
  price: string;
  imageUrl: string | null;
  allergens: string[];
  tags: string[];
  variants: { name: string; price: number }[] | null;
  calories: number | null;
  prepTimeMin: number | null;
  isAvailable: boolean;
};


/**
 * Düzenlenen ekran: önizleme genişliği ve sağ paneldeki ekrana özel ayarlar buna göre çalışır.
 * Genişlikler menünün cihaz eşikleriyle eşleşir (tablet ≥768, masaüstü ≥1024).
 */
const DEVICES = [
  { id: "mobil", label: "Mobil", width: 390, menu: "mobile" as MenuDeviceId },
  { id: "tablet", label: "Tablet", width: 820, menu: "tablet" as MenuDeviceId },
  { id: "masaustu", label: "Masaüstü", width: 1280, menu: "desktop" as MenuDeviceId },
] as const;

type DeviceId = (typeof DEVICES)[number]["id"];

function QrDesignEditor() {
  const params = useParams<{ id: string }>();
  const themeId = params.id;
  const router = useRouter();

  const { data: theme, loading, setData: setTheme } = useApiQuery<SavedThemeDetail>(
    `menu:theme:${themeId}`,
    `/menu/themes/${themeId}`,
  );
  const { data: tenant } = useApiQuery<{
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string | null;
  }>("tenant:me", "/tenants/me");
  const { data: categories } = useApiQuery<MenuCategoryPreview[]>("menu:categories:", "/menu/categories");
  const { data: items } = useApiQuery<MenuItemPreview[]>("menu:items:all", "/menu/items");
  const { data: tagRows } = useApiQuery<{ label: string; translations: Record<string, { name?: string }> | null }[]>(
    "menu:tags",
    "/menu/tags",
  );

  const [doc, setDoc] = useState<MenuDocument | null>(null);
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<MenuThemePreset>("editorial");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceId>("mobil");
  // Masaüstü önizleme genişliği: farklı ekranlarda nasıl göründüğünü dene
  const [desktopWidth, setDesktopWidth] = useState(1280);
  const screenWidth = device === "masaustu" ? desktopWidth : (DEVICES.find((d) => d.id === device)?.width ?? 390);
  const editDevice: MenuDeviceId = DEVICES.find((d) => d.id === device)?.menu ?? "mobile";
  // Paneller katlanır: önizleme (özellikle masaüstü) ekrana sığsın
  const [showBlocks, setShowBlocks] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  function chooseDevice(id: DeviceId) {
    setDevice(id);
    // Masaüstü geniş: blok listesini kapat, önizlemeye yer aç. Blok seçimi önizlemeden yapılabilir.
    if (id === "masaustu") setShowBlocks(false);
    else setShowBlocks(true);
  }
  const [previewProductDetail, setPreviewProductDetail] = useState(false);
  const [previewExplore, setPreviewExplore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const loadedThemeId = useRef<string | null>(null);
  const docRef = useRef<MenuDocument | null>(null);
  docRef.current = doc;

  useEffect(() => {
    if (!theme?.id) return;
    if (loadedThemeId.current === theme.id) return;
    loadedThemeId.current = theme.id;
    setName(theme.name);
    setPreset(theme.preset);
    setDoc(normalizeMenuDocument(theme.document, theme.preset, tenant?.primaryColor));
    // Menü sekmesindeki palet seçimi: ?palette=Ad ile gelindiğinde paleti uygular (kaydedilene kadar taslak)
    const palName = new URLSearchParams(window.location.search).get("palette");
    const pal = palName ? QUICK_PALETTES.find((p) => p.name === palName) : undefined;
    if (pal) {
      setDoc((prev) =>
        prev
          ? {
              ...prev,
              theme: {
                ...prev.theme,
                backgroundColor: pal.backgroundColor,
                surfaceColor: pal.surfaceColor,
                textColor: pal.textColor,
                mutedColor: pal.mutedColor,
                accentColor: pal.accentColor,
                headingColor: pal.textColor,
              },
            }
          : prev,
      );
    }
  }, [theme, tenant?.primaryColor]);

  const selected = doc?.blocks.find((b) => b.id === selectedId) ?? null;
  const blockCount = doc?.blocks.length ?? 0;

  const previewMenu = useMemo<PublicMenuPayload | null>(() => {
    if (!tenant || !doc) return null;
    const cats = (categories ?? []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      nameTr: cat.nameTr,
      nameEn: cat.nameEn,
      translations: cat.translations ?? null,
      description: cat.description,
      imageUrl: cat.imageUrl,
      items: (items ?? [])
        .filter((it) => it.categoryId === cat.id && it.isAvailable)
        .map((it) => ({
          id: it.id,
          name: it.name,
          nameTr: it.nameTr,
          nameEn: it.nameEn,
          translations: it.translations ?? null,
          description: it.description,
          price: it.price,
          currency: "TRY",
          imageUrl: it.imageUrl,
          allergens: it.allergens ?? [],
          tags: it.tags ?? [],
          variants: it.variants,
          calories: it.calories,
          prepTimeMin: it.prepTimeMin,
        })),
    }));
    return {
      tenant: {
        id: "preview",
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
      },
      theme: {
        preset,
        config: {
          hero: {
            showLogo: true,
            showCover: false,
            showTableLabel: true,
            align: "left",
          },
          categoryNav: {
            mode: "grid",
            showImages: true,
            columnsMobile: 2,
            columnsDesktop: 3,
          },
          productCard: {
            layout: "split",
            showImages: true,
            showBadges: true,
            showCalories: true,
            showPrepTime: false,
            showVariantsCollapsed: true,
          },
          style: {
            primaryColor: tenant.primaryColor ?? "#ef233c",
            accentColor: doc.theme.accentColor,
            surfaceStyle: "paper",
            radius: doc.theme.radius,
            fontPair: doc.theme.fontPair,
            density: "regular",
            shadowLevel: "none",
          },
          page: {
            containerWidth: "medium",
            sectionSpacing: "regular",
            stickyCategoryNav: true,
            showFooterBranding: true,
          },
        },
        document: doc,
      },
      categories: cats.length
        ? cats
        : [
            {
              id: "demo",
              name: "Kahveler",
              nameTr: null,
              nameEn: null,
              description: null,
              imageUrl: null,
              items: [
                {
                  id: "d1",
                  name: "Espresso",
                  nameTr: null,
                  nameEn: null,
                  description: "Yoğun ve kısa",
                  price: "160",
                  currency: "TRY",
                  imageUrl: null,
                  allergens: [],
                  tags: ["popüler"],
                  variants: null,
                  calories: 2,
                  prepTimeMin: 2,
                },
              ],
            },
          ],
      branches: [],
      tagLabels: Object.fromEntries(
        (tagRows ?? []).map((t) => [
          t.label,
          { tr: t.label, ...Object.fromEntries(Object.entries(t.translations ?? {}).map(([k, v]) => [k, v?.name ?? t.label])) },
        ]),
      ),
    };
  }, [categories, doc, items, preset, tenant, tagRows]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Önizleme genişliğe sığacak şekilde küçülür; düzen yine seçilen cihaz genişliğinde hesaplanır.
  // Yükseklik kalan alanı doldurur, böylece masaüstünde de sayfanın büyük kısmı görünür.
  const stageScale = stageSize.w > 0 ? Math.min(1, (stageSize.w - 32) / screenWidth) : 1;
  const frameHeight = stageSize.h > 0 ? Math.max(560, Math.round((stageSize.h - 32) / stageScale)) : 780;

  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const frameReady = useRef(false);
  useEffect(() => {
    function pushPreview() {
      const win = previewFrameRef.current?.contentWindow;
      if (!win || !frameReady.current) return;
      win.postMessage(
        { type: "ngl-preview", menu: previewMenu, selectedId, productDetail: previewProductDetail, explore: previewExplore },
        window.location.origin,
      );
    }
    function onFrame(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; id?: string | null };
      if (d?.type === "ngl-preview-ready") {
        frameReady.current = true;
        pushPreview();
      } else if (d?.type === "ngl-preview-select") {
        setSelectedId(d.id ?? null);
        if (d.id) setShowInspector(true);
      }
    }
    window.addEventListener("message", onFrame);
    pushPreview();
    return () => window.removeEventListener("message", onFrame);
  }, [previewMenu, selectedId, previewProductDetail, previewExplore]);

  async function uploadImage(file: File): Promise<string> {
    setUploading(true);
    setError(null);
    try {
      const res = await apiUpload<{ url: string }>(`/menu/themes/${themeId}/asset`, file);
      return res.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Görsel yüklenemedi");
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function save(publish: boolean) {
    const current = docRef.current;
    if (!current) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const saved = await api<SavedThemeDetail>(`/menu/themes/${themeId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() || "Tema", preset, document: current }),
      });
      if (publish) {
        await api(`/menu/themes/${themeId}/activate`, { method: "POST" });
      }
      setTheme(saved);
      setOk(publish ? "Kaydedildi ve yayınlandı." : "Kaydedildi.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !doc) {
    return <div className="grid min-h-dvh place-items-center text-sm text-[var(--muted)]">Yükleniyor…</div>;
  }
  if (!doc) {
    return <div className="grid min-h-dvh place-items-center text-sm text-[var(--muted)]">Tema bulunamadı.</div>;
  }

  const isDraft = !theme?.isActive;

  return (
    <PreviewWidthContext.Provider
      value={(px: number) => {
        const match = DEVICES.reduce((best, d) => (Math.abs(d.width - px) < Math.abs(best.width - px) ? d : best), DEVICES[0]);
        setDevice(match.id);
      }}
    >
      <div className="flex h-dvh flex-col bg-[var(--background)] text-[var(--ink)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-4">
          <button
            type="button"
            onClick={() => router.push("/menu")}
            className="h-9 rounded-xl px-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            ← Menü
          </button>
          <div className="hidden h-6 w-px bg-[var(--line)] sm:block" aria-hidden />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 min-w-[160px] max-w-[320px] rounded-xl bg-transparent px-2 text-[0.9375rem] font-semibold tracking-tight outline-none focus:bg-[var(--surface)]"
            aria-label="Tema adı"
          />
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              isDraft
                ? "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)]"
                : "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
            }`}
          >
            {isDraft ? "Taslak" : "Yayında"}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-0.5" aria-label="Paneller">
              <button
                type="button"
                aria-pressed={showBlocks}
                onClick={() => setShowBlocks((v) => !v)}
                title={showBlocks ? "Blok listesini gizle" : "Blok listesini göster"}
                className={`h-8 rounded-lg px-2.5 text-xs font-medium transition ${showBlocks ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                Bloklar
              </button>
              <button
                type="button"
                aria-pressed={showInspector}
                onClick={() => setShowInspector((v) => !v)}
                title={showInspector ? "Ayar panelini gizle" : "Ayar panelini göster"}
                className={`h-8 rounded-lg px-2.5 text-xs font-medium transition ${showInspector ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                Ayarlar
              </button>
            </div>
            <span className="hidden text-[11px] font-medium text-[var(--muted)] lg:inline">Düzenlenen ekran</span>
            <div role="radiogroup" aria-label="Düzenlenen ekran" className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-0.5">
              {DEVICES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={device === d.id}
                  onClick={() => chooseDevice(d.id)}
                  title={`${d.label} (${d.width}px) görünümünü ve bu ekrana özel ayarları düzenle`}
                  className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
                    device === d.id ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {device === "masaustu" ? (
              <select
                aria-label="Masaüstü ekran genişliği"
                value={desktopWidth}
                onChange={(e) => setDesktopWidth(Number(e.target.value))}
                className="h-9 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--ink)]"
              >
                <option value={1024}>1024px · küçük dizüstü</option>
                <option value={1280}>1280px · dizüstü</option>
                <option value={1440}>1440px · geniş</option>
                <option value={1920}>1920px · büyük ekran</option>
              </select>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(false)}
              className="h-9 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50"
            >
              Kaydet
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(true)}
              className="h-9 rounded-xl bg-[var(--accent)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet ve yayınla"}
            </button>
          </div>
        </header>

        {error || ok ? (
          <div className="px-4 pt-3">
            <ErrorBanner message={error} />
            <SuccessBanner message={ok} />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
          {showBlocks ? (
          <aside className="flex w-[248px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)] [&>*]:w-full [&>*]:border-r-0">
            <MenuBlockPanel
              blocks={doc.blocks}
              selectedId={selectedId}
              disabled={saving || uploading}
              onSelect={setSelectedId}
              onAdd={(type: MenuBlockType) => {
                setDoc((prev) => {
                  if (!prev) return prev;
                  const existing = new Set(prev.blocks.map((b) => b.id));
                  const next = insertMenuBlock(prev, type, selectedId);
                  const created = next.blocks.find((b) => !existing.has(b.id));
                  setSelectedId(created?.id ?? null);
                  return next;
                });
              }}
              onMove={(id, dir) => setDoc((prev) => (prev ? moveMenuBlock(prev, id, dir) : prev))}
              onRemove={(id) => {
                setDoc((prev) => (prev ? removeMenuBlock(prev, id) : prev));
                setSelectedId((cur) => (cur === id ? null : cur));
              }}
            />
          </aside>
          ) : null}

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Canlı önizleme</p>
              <p className="text-[11px] tabular-nums text-[var(--muted)]">
                {DEVICES.find((d) => d.id === device)?.label} · {screenWidth}px · %{Math.round(stageScale * 100)} · {blockCount} blok
              </p>
            </div>
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 items-start justify-center overflow-hidden p-4"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, var(--line) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            >
              <div style={{ width: screenWidth * stageScale, height: frameHeight * stageScale }} className="relative shrink-0">
                <div style={{ width: screenWidth, height: frameHeight, transform: `scale(${stageScale})`, transformOrigin: "top left" }}>
                  {previewMenu ? (
                    <iframe
                      ref={previewFrameRef}
                      title="Canlı önizleme"
                      src="/qr-design/frame"
                      style={{ width: screenWidth, height: frameHeight }}
                      className="block overflow-hidden rounded-[1.75rem] border border-[var(--line-strong)] bg-[var(--panel)] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)]"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </main>

          {showInspector ? (
          <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
            <MenuBuilderProps
              width={340}
              onDeselect={() => setSelectedId(null)}
              document={doc}
              block={selected}
              device={editDevice}
              uploading={uploading}
              onUploadImage={uploadImage}
              onPreviewProductDetail={setPreviewProductDetail}
              onPreviewExplore={setPreviewExplore}
              onDocumentChange={(patch) =>
                setDoc((prev) => {
                  if (!prev) return prev;
                  if (patch.blocks) return { ...prev, ...patch, blocks: patch.blocks };
                  return { ...prev, ...patch };
                })
              }
              onPatchHeader={(patch) =>
                setDoc((prev) =>
                  prev ? { ...prev, blocks: prev.blocks.map((b) => (b.type === "header" ? { ...b, ...patch } : b)) } : prev,
                )
              }
              onBlockChange={(patch) => {
                if (!selectedId) return;
                setDoc((prev) => (prev ? patchMenuBlock(prev, selectedId, patch as Partial<MenuBlock>) : prev));
              }}
              onMove={(dir) => {
                if (!selectedId) return;
                setDoc((prev) => (prev ? moveMenuBlock(prev, selectedId, dir) : prev));
              }}
              onRemove={() => {
                if (!selectedId) return;
                setDoc((prev) => (prev ? removeMenuBlock(prev, selectedId) : prev));
                setSelectedId(null);
              }}
            />
          </aside>
          ) : null}
        </div>
      </div>
    </PreviewWidthContext.Provider>
  );
}

export default function QrDesignPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <QrDesignEditor />
    </RequireAuth>
  );
}
