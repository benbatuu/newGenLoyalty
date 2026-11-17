"use client";

import {
  FormEvent,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EmptyState,
  ErrorBanner,
  Field,
  ListSkeleton,
  ListRowsSkeleton,
  PageHeader,
  RequireAuth,
  SuccessBanner,
  Tabs,
  inputClassName,
} from "../../components/ui";
import { ApiError, api, apiUpload } from "../../lib/api";
import { getPublicMenuUrl } from "../../lib/public-urls";
import { useApiQuery } from "../../lib/use-api-query";
import { ThemeTab } from "./theme-tab";
import { TagManager, TagPicker, useTagCatalog } from "./tag-picker";
import { FeedbackTab } from "./feedback-tab";
import {
  ContentLocaleFields,
  seedTranslationsFromLegacy,
  useMenuContentLangs,
} from "./menu-content-i18n";
import type { MenuContentI18n } from "@ngl/shared";
import { isTopOverlay, popOverlay, pushOverlay } from "../../lib/overlay-stack";

// ── Types ───────────────────────────────────────────────

type Branch = { id: string; name: string; isActive: boolean };

type MenuCategory = {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  description: string | null;
  translations?: MenuContentI18n | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  _count: { items: number };
};

/** "option": mutlak fiyat · "extra": ürün fiyatının üzerine eklenen ücret */
type VariantKind = "option" | "extra";
type MenuVariant = {
  name: string;
  price: number;
  kind?: VariantKind;
  translations?: Record<string, { name?: string }>;
};

type MenuItem = {
  id: string;
  categoryId: string;
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
  isAvailable: boolean;
  sortOrder: number;
  calories: number | null;
  prepTimeMin: number | null;
};

type MenuTable = {
  id: string;
  branchId: string;
  label: string;
  qrCode: string;
  isActive: boolean;
};

type MenuContext = {
  menuEnabled: boolean;
  maxCategories: number;
  maxItems: number;
  maxTables: number;
  usedCategories: number;
  usedItems: number;
  usedTables: number;
  canAddCategory: boolean;
  canAddItem: boolean;
  canAddTable: boolean;
};

const ALLERGEN_OPTIONS = [
  "gluten",
  "süt",
  "yumurta",
  "fıstık",
  "soya",
  "balık",
  "kabuklu deniz",
  "kereviz",
  "hardal",
  "susam",
  "kükürt",
  "acı biber",
];

// ── Helpers ─────────────────────────────────────────────

const tryFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatTry(value: number | string): string {
  return `₺${tryFormatter.format(Number(value) || 0)}`;
}

function variantsOf(item: MenuItem) {
  const list = item.variants ?? [];
  return {
    options: list.filter((v) => v.kind !== "extra"),
    extras: list.filter((v) => v.kind === "extra"),
  };
}

function toggleArrayItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

/** Seçilen dosya için geçici önizleme URL'i; değişince/unmount'ta serbest bırakılır. */
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

// ── Shared UI bits ──────────────────────────────────────

/** Yuvarlatılmış, hafif gölgeli kart yüzeyi. */
function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_1px_2px_rgba(26,25,22,0.04),0_8px_24px_-16px_rgba(26,25,22,0.12)] ${className}`}
    >
      {children}
    </section>
  );
}

function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "accent" | "warn" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]",
    success: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30",
    accent: "bg-[var(--accent)]/10 text-[var(--accent-deep)] border-[var(--accent)]/20",
    warn: "bg-[var(--accent-soft)] text-[var(--ink)] border-[var(--accent)]/30",
    info: "bg-sky-50 text-sky-800 border-sky-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** iOS tarzı açma/kapama. */
function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--line)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-[var(--panel)] shadow transition ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
  danger,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:opacity-40 ${
        danger ? "hover:text-[var(--danger)]" : "hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Btn({
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-[var(--accent)] text-white hover:opacity-90 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
    secondary:
      "border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-[var(--surface)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
    danger: "text-[var(--danger)] hover:bg-[var(--danger-soft)]",
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[0.8125rem] font-medium transition active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${styles[variant]} ${className}`}
    />
  );
}

/** Ortalanmış modal; Escape ile kapanır. */
function Modal({
  title,
  description,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const id = pushOverlay();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isTopOverlay(id)) closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      popOverlay(id);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a1916]/35 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--ink)]">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          <IconButton label="Kapat" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ItemThumb({ src, alt, size = 44 }: { src: string | null; alt: string; size?: number }) {
  const cls = `shrink-0 rounded-xl border border-[var(--line)] object-cover`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={size} height={size} className={cls} style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]/60"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    </div>
  );
}

/** Üst özet şeridi: kota ve sayılar. */
function QuotaStrip({ ctx }: { ctx: MenuContext }) {
  const items = [
    { label: "Kategoriler", used: ctx.usedCategories, max: ctx.maxCategories },
    { label: "Ürünler", used: ctx.usedItems, max: ctx.maxItems },
    { label: "Masalar", used: ctx.usedTables, max: ctx.maxTables },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {items.map((it) => {
        const pct = it.max > 0 ? Math.min(100, Math.round((it.used / it.max) * 100)) : 0;
        const full = it.max > 0 && it.used >= it.max;
        return (
          <div
            key={it.label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--muted)]">{it.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${full ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
                {it.used}
                <span className="font-normal text-[var(--muted)]"> / {it.max}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className={`h-full rounded-full transition-all ${full ? "bg-[var(--accent)]" : "bg-[var(--accent)]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────

export default function MenuPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <MenuPageContent />
      </Suspense>
    </RequireAuth>
  );
}

type Tab = "menu" | "tables" | "design" | "share" | "feedback";

function MenuPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const isTab = (v: string | null): v is Tab =>
    v === "tables" || v === "design" || v === "share" || v === "feedback" || v === "menu";
  const [tab, setTab] = useState<Tab>(isTab(tabParam) ? tabParam : "menu");

  useEffect(() => {
    if (isTab(tabParam)) setTab(tabParam);
  }, [tabParam]);

  function selectTab(next: Tab) {
    setTab(next);
    router.replace(next === "menu" ? "/menu" : `/menu?tab=${next}`);
  }

  const {
    data: ctx,
    loading: ctxLoading,
    reload: reloadCtx,
  } = useApiQuery<MenuContext>("menu:context", "/menu/context");
  // Şubeler sayfada bir kez çekilir; sekmeler bu listeyi kullanır.
  const { data: branches } = useApiQuery<Branch[]>("branches", "/branches");

  if (ctxLoading && !ctx) {
    return <ListSkeleton rows={4} />;
  }

  if (ctx && !ctx.menuEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Kafem"
          title="QR menü"
          subtitle="Dijital menünüzü oluşturun, masalarınızı yönetin ve müşterilerinize paylaşın."
        />
        <Card>
          <EmptyState
            title="QR Menü özelliği paketinizde bulunmuyor"
            description="Growth veya üstü bir pakete yükselterek QR Menü özelliğini aktif edebilirsiniz."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kafem"
        title="QR menü"
        subtitle="Kategori, ürün ve ekstraları yönetin; menünüzü müşterilerinize paylaşın."
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          tabs={[
            { id: "menu", label: "Menü", hint: "Ürün ve kategoriler" },
            { id: "tables", label: "Masalar", hint: "Masa ve QR kodları" },
            { id: "design", label: "Görünüm", hint: "Renk ve tema" },
            { id: "feedback", label: "Geri bildirim", hint: "Müşteri mesajları" },
            { id: "share", label: "Paylaş", hint: "Önizleme ve link" },
          ]}
          value={tab}
          onChange={(id) => selectTab(id as Tab)}
        />
      </div>

      {ctx && tab !== "design" && tab !== "feedback" && <QuotaStrip ctx={ctx} />}

      {tab === "menu" && (
        <MenuTab ctx={ctx} branches={branches} onQuotaChange={() => void reloadCtx(true)} />
      )}
      {tab === "tables" && (
        <TablesTab ctx={ctx} branches={branches} onQuotaChange={() => void reloadCtx(true)} />
      )}
      {tab === "design" && <ThemeTab />}
      {tab === "feedback" && <FeedbackTab />}
      {tab === "share" && <ShareTab branches={branches} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 1 — Menü yönetimi
// ═══════════════════════════════════════════════════════

function MenuTab({
  ctx,
  branches,
  onQuotaChange,
}: {
  ctx: MenuContext | null;
  branches: Branch[] | null;
  onQuotaChange: () => void;
}) {
  const [branchFilter, setBranchFilter] = useState<string>("");
  const {
    data: categories,
    loading: catLoading,
    reload: reloadCats,
  } = useApiQuery<MenuCategory[]>(
    `menu:categories:${branchFilter}`,
    `/menu/categories${branchFilter ? `?branchId=${branchFilter}` : ""}`,
  );
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);

  const selectedCat = useMemo(
    () => categories?.find((c) => c.id === selectedCatId) ?? null,
    [categories, selectedCatId],
  );

  useEffect(() => {
    if (categories?.length && !selectedCatId) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  const totalItems = categories?.reduce((sum, c) => sum + c._count.items, 0) ?? 0;
  const [tagsOpen, setTagsOpen] = useState(false);
  const catLimitReached = ctx != null && !ctx.canAddCategory;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {branches && branches.length > 1 ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--muted)]">Şube</span>
            <select
              className={`${inputClassName()} h-9 max-w-xs rounded-xl`}
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setSelectedCatId(null);
              }}
            >
              <option value="">Tüm şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span />
        )}
        <Btn variant="secondary" className="h-9" onClick={() => setTagsOpen(true)}>
          Etiketleri yönet
        </Btn>
      </div>

      {tagsOpen && (
        <Modal title="Etiket kataloğu" description="Ürünlerde kullanılan etiketler. Türkçe ve İngilizce adlarını buradan düzenleyin." onClose={() => setTagsOpen(false)} maxWidth="max-w-2xl">
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <TagManager onChanged={onQuotaChange} />
          </div>
        </Modal>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* Kategoriler */}
        <Card className="lg:sticky lg:top-5 lg:col-span-1">
          <CardHeader
            title="Kategoriler"
            description={categories ? `${categories.length} kategori · ${totalItems} ürün` : undefined}
            action={
              <Btn
                variant="primary"
                className="h-8 px-3"
                disabled={catLimitReached}
                title={catLimitReached ? `Kategori limiti doldu (${ctx?.usedCategories}/${ctx?.maxCategories})` : undefined}
                onClick={() => {
                  setEditingCat(null);
                  setShowCatForm(true);
                }}
              >
                + Ekle
              </Btn>
            }
          />
          {catLoading && !categories ? (
            <div className="p-2"><ListRowsSkeleton rows={4} /></div>
          ) : !categories?.length ? (
            <div className="p-5">
              <EmptyState title="Kategori yok" description="Bir kategori ekleyerek başlayın." />
            </div>
          ) : (
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
              {categories.map((cat) => {
                const active = selectedCatId === cat.id;
                return (
                  <li key={cat.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedCatId(cat.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-[var(--accent)] text-white shadow-sm"
                          : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <ItemThumb src={cat.imageUrl} alt="" size={36} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[0.8125rem] font-medium ${active ? "text-white" : "text-[var(--ink)]"}`}>
                          {cat.name}
                        </p>
                        <p className={`text-[11px] ${active ? "text-white/70" : "text-[var(--muted)]"}`}>
                          {cat._count.items} ürün
                          {cat.parentId ? " · alt kategori" : ""}
                        </p>
                      </div>
                      {!cat.isActive && (
                        <Pill tone="warn">Pasif</Pill>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`${cat.name} kategorisini düzenle`}
                      onClick={() => {
                        setEditingCat(cat);
                        setShowCatForm(true);
                      }}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                        active ? "text-white/80 hover:bg-white/10" : "text-[var(--muted)] hover:bg-[var(--panel)]"
                      } ${cat.isActive ? "" : "right-16"}`}
                    >
                      <PencilIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Ürünler */}
        <div className="min-w-0 lg:col-span-2">
          {selectedCat ? (
            <ItemsPanel
              key={selectedCat.id}
              category={selectedCat}
              ctx={ctx}
              onCategoryDeleted={() => {
                setSelectedCatId(null);
                void reloadCats(true);
                onQuotaChange();
              }}
              onQuotaChange={onQuotaChange}
            />
          ) : (
            <Card>
              <EmptyState
                title="Kategori seçin"
                description="Soldan bir kategori seçin veya yeni kategori ekleyin."
              />
            </Card>
          )}
        </div>
      </div>

      {showCatForm && (
        <CategoryFormModal
          editing={editingCat}
          branchId={branchFilter || null}
          branches={branches ?? []}
          categories={categories ?? []}
          onClose={() => setShowCatForm(false)}
          onSaved={() => {
            setShowCatForm(false);
            void reloadCats(true);
            onQuotaChange();
          }}
        />
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// ── Category Form Modal ─────────────────────────────────

function CategoryFormModal({
  editing,
  branchId,
  branches,
  categories,
  onClose,
  onSaved,
}: {
  editing: MenuCategory | null;
  branchId: string | null;
  branches: Branch[];
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const langs = useMenuContentLangs();
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [translations, setTranslations] = useState<MenuContentI18n>(() =>
    seedTranslationsFromLegacy({
      nameTr: editing?.nameTr,
      nameEn: editing?.nameEn,
      translations: editing?.translations,
    }),
  );
  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [catBranchId, setCatBranchId] = useState(editing?.branchId ?? branchId ?? "");
  const [parentId, setParentId] = useState<string>(editing?.parentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useObjectUrl(imageFile) ?? (imageUrl || null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        nameTr: translations.tr?.name?.trim() || name.trim() || undefined,
        nameEn: translations.en?.name?.trim() || undefined,
        description: description.trim() || undefined,
        translations,
        imageUrl: imageFile ? undefined : imageUrl.trim() || undefined,
        branchId: catBranchId || null,
        parentId: parentId || null,
      };
      let categoryId = editing?.id;
      if (editing) {
        await api(`/menu/categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        const created = await api<{ id: string }>("/menu/categories", {
          method: "POST",
          body: JSON.stringify(body),
        });
        categoryId = created.id;
      }
      if (imageFile && categoryId) {
        await apiUpload(`/menu/categories/${categoryId}/image`, imageFile);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "Kategoriyi düzenle" : "Yeni kategori"}
      description="Müşterilerinizin göreceği menü bölümü."
      onClose={onClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
          <ErrorBanner message={error} />
          <ContentLocaleFields
            langs={langs}
            primaryName={name}
            onPrimaryName={setName}
            description={description}
            onDescription={setDescription}
            translations={translations}
            onTranslations={setTranslations}
            nameRequired
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Üst kategori">
              <select
                className={inputClassName()}
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">Ana kategori</option>
                {categories
                  .filter((c) => c.id !== editing?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            {branches.length > 1 && (
              <Field label="Şube">
                <select
                  className={inputClassName()}
                  value={catBranchId}
                  onChange={(e) => setCatBranchId(e.target.value)}
                >
                  <option value="">Tüm şubeler</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <Field label="Kategori görseli">
            <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-3 transition hover:border-[var(--ink)]/30">
              <ItemThumb src={previewUrl} alt="" size={56} />
              <span className="text-xs text-[var(--muted)]">
                {imageFile ? imageFile.name : "Görsel seçmek için tıklayın"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface)]/60 px-6 py-4">
          <Btn variant="ghost" onClick={onClose}>
            İptal
          </Btn>
          <Btn type="submit" variant="primary" disabled={saving || !name.trim()}>
            {saving ? "Kaydediliyor…" : editing ? "Değişiklikleri kaydet" : "Kategori ekle"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Items Panel ─────────────────────────────────────────

function ItemsPanel({
  category,
  ctx,
  onCategoryDeleted,
  onQuotaChange,
}: {
  category: MenuCategory;
  ctx: MenuContext | null;
  onCategoryDeleted: () => void;
  onQuotaChange: () => void;
}) {
  const {
    data: items,
    loading,
    reload,
  } = useApiQuery<MenuItem[]>(
    `menu:items:${category.id}`,
    `/menu/items?categoryId=${category.id}`,
  );
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const detailItem = useMemo(
    () => items?.find((i) => i.id === detailId) ?? null,
    [items, detailId],
  );

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items ?? [];
    return (items ?? []).filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const itemLimitReached = ctx != null && !ctx.canAddItem;

  async function deleteCategory() {
    if (!confirm("Kategori ve tüm ürünleri silinecek. Emin misiniz?")) return;
    setDeleting(true);
    try {
      await api(`/menu/categories/${category.id}`, { method: "DELETE" });
      onCategoryDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleAvailable(item: MenuItem) {
    try {
      await api(`/menu/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncellenemedi");
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`"${item.name}" silinecek. Emin misiniz?`)) return;
    try {
      await api(`/menu/items/${item.id}`, { method: "DELETE" });
      setDetailId(null);
      await reload(true);
      onQuotaChange();
      setOk("Ürün silindi");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    }
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setShowForm(true);
  }

  return (
    <Card>
      <CardHeader
        title={category.name}
        description={`${items?.length ?? 0} ürün · ${items?.filter((i) => i.isAvailable).length ?? 0} menüde`}
        action={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" className="h-8 px-2.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]" onClick={() => void deleteCategory()} disabled={deleting}>
              Kategoriyi sil
            </Btn>
            <Btn
              variant="primary"
              className="h-8 px-3"
              disabled={itemLimitReached}
              title={itemLimitReached ? `Ürün limiti doldu (${ctx?.usedItems}/${ctx?.maxItems})` : undefined}
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
            >
              + Ürün ekle
            </Btn>
          </div>
        }
      />

      <div className="space-y-3 px-5 pt-4">
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        {(items?.length ?? 0) > 5 && (
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün ara…"
              className={`${inputClassName()} h-9 rounded-xl pl-9`}
            />
          </label>
        )}
      </div>

      {loading && !items ? (
        <div className="p-2"><ListRowsSkeleton rows={4} /></div>
      ) : !items?.length ? (
        <div className="p-5">
          <EmptyState title="Ürün yok" description="Bu kategoriye ilk ürününüzü ekleyin." />
        </div>
      ) : !visibleItems.length ? (
        <div className="p-5">
          <EmptyState title="Sonuç bulunamadı" description={`"${query}" ile eşleşen ürün yok.`} />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)] p-2">
          {visibleItems.map((item) => {
            const { options, extras } = variantsOf(item);
            return (
              <li key={item.id}>
                <div
                  className={`group flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-[var(--surface)] ${
                    item.isAvailable ? "" : "opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setDetailId(item.id)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    <ItemThumb src={item.imageUrl} alt={item.name} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.875rem] font-medium text-[var(--ink)]">{item.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-[var(--ink)]">
                          {formatTry(item.price)}
                        </span>
                        {extras.length > 0 && (
                          <Pill tone="accent">+ {extras.length} ekstra</Pill>
                        )}
                        {options.length > 0 && (
                          <Pill tone="info">{options.length} seçenek</Pill>
                        )}
                        {item.allergens.length > 0 && (
                          <Pill tone="warn">{item.allergens.length} alerjen</Pill>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-[11px] text-[var(--muted)] sm:inline">
                      {item.isAvailable ? "Menüde" : "Gizli"}
                    </span>
                    <Switch
                      checked={item.isAvailable}
                      label={item.isAvailable ? "Menüden gizle" : "Menüde göster"}
                      onChange={() => void toggleAvailable(item)}
                    />
                    <IconButton label="Düzenle" onClick={() => openEdit(item)}>
                      <PencilIcon />
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {detailItem && (
        <ItemDetailDrawer
          item={detailItem}
          categoryName={category.name}
          onClose={() => setDetailId(null)}
          onEdit={() => openEdit(detailItem)}
          onToggle={() => void toggleAvailable(detailItem)}
          onDelete={() => void deleteItem(detailItem)}
        />
      )}

      {showForm && (
        <ItemFormModal
          categoryId={category.id}
          editing={editingItem}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void reload(true);
            onQuotaChange();
          }}
        />
      )}
    </Card>
  );
}

// ── Item Detail Drawer ──────────────────────────────────

function ItemDetailDrawer({
  item,
  categoryName,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: MenuItem;
  categoryName: string;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { options, extras } = variantsOf(item);
  const basePrice = Number(item.price) || 0;
  const extrasTotal = extras.reduce((sum, v) => sum + Number(v.price || 0), 0);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const id = pushOverlay();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isTopOverlay(id)) closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      popOverlay(id);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1a1916]/30 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="flex h-full w-full max-w-md flex-col bg-[var(--panel)] shadow-2xl"
      >
        {/* Görsel */}
        <div className="relative h-52 shrink-0 bg-[var(--surface)]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--muted)]/50">
              <ItemThumb src={null} alt="" size={64} />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-full bg-[var(--panel)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--ink)] backdrop-blur">
              {categoryName}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel)]/90 text-[var(--ink)] backdrop-blur hover:bg-[var(--surface)]"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Başlık & fiyat */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold tracking-tight text-[var(--ink)]">{item.name}</h3>
              <Pill tone={item.isAvailable ? "success" : "neutral"}>
                {item.isAvailable ? "Menüde" : "Gizli"}
              </Pill>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ink)]">
              {formatTry(basePrice)}
            </p>
            {item.description && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <Pill key={t} tone="info">{t}</Pill>
              ))}
            </div>
          </div>

          {/* Ekstralar — fiyat etkisi görsel olarak */}
          {extras.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Ekstralar
                </h4>
                <span className="text-[11px] text-[var(--muted)]">Müşteri seçtikçe fiyata eklenir</span>
              </div>
              <div className="grid gap-2">
                {extras.map((v, i) => (
                  <div
                    key={`${v.name}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-sm font-semibold text-[var(--accent-deep)]">
                        +
                      </span>
                      <span className="text-sm font-medium text-[var(--ink)]">{v.name}</span>
                    </div>
                    <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold tabular-nums text-white">
                      +{formatTry(v.price)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--accent)] px-4 py-3 text-white">
                <span className="text-xs text-white/70">Tüm ekstralar eklenirse</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatTry(basePrice + extrasTotal)}
                </span>
              </div>
            </section>
          )}

          {/* Seçenekler — mutlak fiyatlı varyasyonlar */}
          {options.length > 0 && (
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Seçenekler
              </h4>
              <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
                {options.map((v, i) => (
                  <div key={`${v.name}-${i}`} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[var(--ink)]">{v.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">
                      {formatTry(v.price)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bilgi kartları */}
          <section className="grid grid-cols-3 gap-2">
            <InfoTile label="Kalori" value={item.calories != null ? `${item.calories} kcal` : "—"} />
            <InfoTile label="Hazırlık" value={item.prepTimeMin != null ? `${item.prepTimeMin} dk` : "—"} />
            <InfoTile label="Alerjen" value={item.allergens.length ? String(item.allergens.length) : "0"} />
          </section>

          {item.allergens.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Alerjenler</h4>
              <div className="flex flex-wrap gap-1.5">
                {item.allergens.map((a) => (
                  <Pill key={a} tone="warn">{a}</Pill>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Eylemler */}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--surface)]/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={item.isAvailable}
              label={item.isAvailable ? "Menüden gizle" : "Menüde göster"}
              onChange={onToggle}
            />
            <span className="text-xs text-[var(--muted)]">{item.isAvailable ? "Menüde görünüyor" : "Menüde gizli"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Btn variant="danger" onClick={onDelete}>Sil</Btn>
            <Btn variant="primary" onClick={onEdit}>Düzenle</Btn>
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--ink)]">{value}</p>
    </div>
  );
}

// ── Item Form Modal ─────────────────────────────────────

function ItemFormModal({
  categoryId,
  editing,
  onClose,
  onSaved,
}: {
  categoryId: string;
  editing: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const langs = useMenuContentLangs();
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [translations, setTranslations] = useState<MenuContentI18n>(() =>
    seedTranslationsFromLegacy({
      nameTr: editing?.nameTr,
      nameEn: editing?.nameEn,
      translations: editing?.translations,
    }),
  );
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [allergens, setAllergens] = useState<string[]>(editing?.allergens ?? []);
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [variants, setVariants] = useState<MenuVariant[]>(
    (editing?.variants ?? []).map((v) => ({ ...v, kind: v.kind ?? "option" })),
  );
  const [calories, setCalories] = useState(editing?.calories != null ? String(editing.calories) : "");
  const [prepTimeMin, setPrepTimeMin] = useState(editing?.prepTimeMin != null ? String(editing.prepTimeMin) : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAllergen, setNewAllergen] = useState("");
  const tagCatalog = useTagCatalog();

  const previewUrl = useObjectUrl(imageFile) ?? editing?.imageUrl ?? null;

  // Ana dil dışındaki diller için varyasyon çevirisi alanları
  const otherLangs = langs.slice(1);
  const extrasPreview = variants.filter((v) => v.kind === "extra" && v.name.trim());
  const extrasSum = extrasPreview.reduce((s, v) => s + (Number(v.price) || 0), 0);

  function updateVariant(i: number, patch: Partial<MenuVariant>) {
    setVariants((prev) => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleaned = variants
        .map((v) => {
          const tr: Record<string, { name?: string }> = {};
          for (const [code, val] of Object.entries(v.translations ?? {})) {
            const n = val?.name?.trim();
            if (n) tr[code] = { name: n };
          }
          return {
            name: v.name.trim(),
            price: Number(v.price) || 0,
            kind: v.kind ?? "option",
            ...(Object.keys(tr).length ? { translations: tr } : {}),
          };
        })
        .filter((v) => v.name.length > 0);
      const body: Record<string, unknown> = {
        name: name.trim(),
        nameTr: translations.tr?.name?.trim() || name.trim() || undefined,
        nameEn: translations.en?.name?.trim() || undefined,
        description: description.trim() || undefined,
        translations,
        price: Number(price),
        allergens,
        tags,
        variants: cleaned.length > 0 ? cleaned : null,
        calories: calories ? Number(calories) : null,
        prepTimeMin: prepTimeMin ? Number(prepTimeMin) : null,
      };

      let itemId = editing?.id;
      if (editing) {
        await api(`/menu/items/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        const created = await api<{ id: string }>("/menu/items", {
          method: "POST",
          body: JSON.stringify({ ...body, categoryId }),
        });
        itemId = created.id;
      }

      if (imageFile && itemId) {
        await apiUpload(`/menu/items/${itemId}/image`, imageFile);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "Ürünü düzenle" : "Yeni ürün"}
      description="Fiyat, alerjen ve ekstralarını buradan yönetin."
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
          <ErrorBanner message={error} />

          <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
            <label className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] transition group-hover:border-[var(--ink)]/30">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center text-[11px] text-[var(--muted)]">
                    Fotoğraf ekle
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </label>
            <div className="min-w-0">
              <ContentLocaleFields
                langs={langs}
                primaryName={name}
                onPrimaryName={setName}
                description={description}
                onDescription={setDescription}
                translations={translations}
                onTranslations={setTranslations}
                nameRequired
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Fiyat (₺)">
              <input className={inputClassName()} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </Field>
            <Field label="Kalori">
              <input className={inputClassName()} type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </Field>
            <Field label="Hazırlık (dk)">
              <input className={inputClassName()} type="number" min="0" value={prepTimeMin} onChange={(e) => setPrepTimeMin(e.target.value)} />
            </Field>
          </div>

          {/* Ekstralar & seçenekler */}
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--ink)]">Ekstralar ve seçenekler</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                <span className="font-medium text-[var(--ink)]">Ekstra</span> fiyatın üstüne eklenir.{" "}
                <span className="font-medium text-[var(--ink)]">Seçenek</span> kendi fiyatıyla listelenir.
              </p>
            </div>

            {variants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-xs text-[var(--muted)]">
                Henüz ekstra ya da seçenek yok.
              </div>
            ) : (
              <ul className="space-y-2">
                {variants.map((v, i) => {
                  const isExtra = v.kind === "extra";
                  return (
                    <li key={i} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_7rem_auto] items-center gap-2">
                        <div role="radiogroup" aria-label="Tür" className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5">
                          {(["extra", "option"] as VariantKind[]).map((k) => (
                            <button
                              key={k}
                              type="button"
                              role="radio"
                              aria-checked={v.kind === k}
                              onClick={() => updateVariant(i, { kind: k })}
                              className={`h-7 rounded-md px-2.5 text-xs font-medium transition ${
                                v.kind === k ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                              }`}
                            >
                              {k === "extra" ? "Ekstra" : "Seçenek"}
                            </button>
                          ))}
                        </div>
                        <input
                          className={`${inputClassName()} h-9 min-w-0 rounded-lg`}
                          placeholder={isExtra ? "Örn. Ekstra yumurta" : "Örn. Büyük boy"}
                          aria-label="Ad"
                          value={v.name}
                          onChange={(e) => updateVariant(i, { name: e.target.value })}
                        />
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)]">
                            {isExtra ? "+₺" : "₺"}
                          </span>
                          <input
                            className={`${inputClassName()} h-9 rounded-lg pl-8 tabular-nums`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            aria-label="Fiyat"
                            value={v.price}
                            onChange={(e) => updateVariant(i, { price: Number(e.target.value) })}
                          />
                        </div>
                        <IconButton label="Satırı sil" danger onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
                          <CloseIcon />
                        </IconButton>
                      </div>
                      {otherLangs.map((l) => {
                        const filled = Boolean(v.translations?.[l]?.name);
                        return (
                          <details key={l} className="group rounded-lg bg-[var(--surface)] px-3 py-2">
                            <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-[var(--muted)] [&::-webkit-details-marker]:hidden">
                              <span>
                                {l === "en" ? "İngilizce adı" : `${l.toUpperCase()} adı`}
                                <span className="ml-2 text-[var(--ink)]">{filled ? v.translations?.[l]?.name : "eklenmedi"}</span>
                              </span>
                              <span className="text-[var(--muted)] transition group-open:rotate-180">▾</span>
                            </summary>
                            <input
                              className={`${inputClassName()} mt-2 h-9 w-full rounded-lg`}
                              placeholder={`${(v.name || "Ad").trim()} (${l.toUpperCase()})`}
                              aria-label={`${l.toUpperCase()} adı`}
                              value={v.translations?.[l]?.name ?? ""}
                              onChange={(e) =>
                                updateVariant(i, {
                                  translations: { ...(v.translations ?? {}), [l]: { name: e.target.value } },
                                })
                              }
                            />
                          </details>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" className="h-9" onClick={() => setVariants([...variants, { name: "", price: 0, kind: "extra" }])}>
                + Ekstra ekle
              </Btn>
              <Btn variant="ghost" className="h-9" onClick={() => setVariants([...variants, { name: "", price: 0, kind: "option" }])}>
                + Seçenek ekle
              </Btn>
            </div>

            {extrasPreview.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">
                <span>Örnek: ürün {formatTry(Number(price) || 0)} + tüm ekstralar</span>
                <span className="font-display text-sm font-semibold tabular-nums text-[var(--accent)]">
                  {formatTry((Number(price) || 0) + extrasSum)}
                </span>
              </div>
            )}
          </section>

          {/* Alerjenler */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-[var(--ink)]">Alerjenler</h4>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...ALLERGEN_OPTIONS, ...allergens])).map((a) => (
                <Chip key={a} on={allergens.includes(a)} tone="warn" onClick={() => setAllergens(toggleArrayItem(allergens, a))}>
                  {a}
                </Chip>
              ))}
            </div>
            <CustomChipInput
              placeholder="Yeni alerjen ekle"
              value={newAllergen}
              onChange={setNewAllergen}
              onAdd={(v) => setAllergens(toggleArrayItem(allergens, v))}
            />
          </section>

          {/* Etiketler — katalogdan seç, yoksa oluştur */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-[var(--ink)]">Etiketler</h4>
            <TagPicker
              selected={tags}
              onChange={setTags}
              catalog={tagCatalog.data ?? []}
              onCatalogChanged={() => void tagCatalog.reload(true)}
            />
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface)]/60 px-6 py-4">
          <Btn variant="ghost" onClick={onClose}>İptal</Btn>
          <Btn type="submit" variant="primary" disabled={saving || !name.trim() || !price}>
            {saving ? "Kaydediliyor…" : editing ? "Değişiklikleri kaydet" : "Ürün ekle"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function Chip({
  on,
  tone,
  onClick,
  children,
}: {
  on: boolean;
  tone: "warn" | "info";
  onClick: () => void;
  children: ReactNode;
}) {
  const onCls =
    tone === "warn"
      ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--ink)]"
      : "border-sky-400 bg-sky-50 text-sky-800";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        on ? onCls : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)]/30 hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function CustomChipInput({
  placeholder,
  value,
  onChange,
  onAdd,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: (v: string) => void;
}) {
  function commit() {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    onChange("");
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className={`${inputClassName()} h-8 flex-1 rounded-lg`}
      />
      <Btn variant="ghost" className="h-8" onClick={commit} disabled={!value.trim()}>
        Ekle
      </Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 2 — Masa yönetimi
// ═══════════════════════════════════════════════════════

function TablesTab({
  ctx,
  branches,
  onQuotaChange,
}: {
  ctx: MenuContext | null;
  branches: Branch[] | null;
  onQuotaChange: () => void;
}) {
  const [branchId, setBranchId] = useState("");
  const {
    data: tables,
    loading,
    reload,
  } = useApiQuery<MenuTable[]>(
    branchId ? `menu:tables:${branchId}` : null,
    branchId ? `/menu/tables?branchId=${branchId}` : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [prefix, setPrefix] = useState("Masa");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("20");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [singleLabel, setSingleLabel] = useState("");
  const [singleSaving, setSingleSaving] = useState(false);

  useEffect(() => {
    if (branches?.length && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  const tableLimitReached = ctx != null && !ctx.canAddTable;

  async function bulkCreate(e: FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    setBulkSaving(true);
    setError(null);
    setOk(null);
    try {
      const result = await api<{ created: number }>("/menu/tables/bulk", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          prefix: prefix.trim(),
          from: Number(from),
          to: Number(to),
        }),
      });
      setOk(`${result.created} masa oluşturuldu`);
      await reload(true);
      onQuotaChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Oluşturulamadı");
    } finally {
      setBulkSaving(false);
    }
  }

  async function createSingle(e: FormEvent) {
    e.preventDefault();
    if (!branchId || !singleLabel.trim()) return;
    setSingleSaving(true);
    setError(null);
    try {
      await api("/menu/tables", {
        method: "POST",
        body: JSON.stringify({ branchId, label: singleLabel.trim() }),
      });
      setSingleLabel("");
      await reload(true);
      onQuotaChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Oluşturulamadı");
    } finally {
      setSingleSaving(false);
    }
  }

  async function deleteTable(t: MenuTable) {
    if (!confirm(`"${t.label}" silinecek. Emin misiniz?`)) return;
    try {
      await api(`/menu/tables/${t.id}`, { method: "DELETE" });
      await reload(true);
      onQuotaChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Silinemedi");
    }
  }

  async function toggleTable(t: MenuTable) {
    try {
      await api(`/menu/tables/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncellenemedi");
    }
  }

  return (
    <div className="space-y-5">
      {branches && branches.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--muted)]">Şube</span>
          <select
            className={`${inputClassName()} h-9 max-w-xs rounded-xl`}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="" disabled>Seçin…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <ErrorBanner message={error} />
      <SuccessBanner message={ok} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="Masalar"
            description={branchId ? `${tables?.length ?? 0} masa · ${tables?.filter((t) => t.isActive).length ?? 0} aktif` : "Önce şube seçin"}
          />
          {!branchId ? (
            <div className="p-5"><EmptyState title="Şube seçin" description="Masa yönetimi için önce bir şube seçin." /></div>
          ) : loading && !tables ? (
            <div className="p-5"><ListRowsSkeleton rows={4} /></div>
          ) : !tables?.length ? (
            <div className="p-5"><EmptyState title="Masa yok" description="Sağdaki formlardan masa ekleyin." /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className={`group relative rounded-2xl border p-4 text-center transition ${
                    t.isActive
                      ? "border-[var(--line)] bg-[var(--panel)] hover:shadow-sm"
                      : "border-dashed border-[var(--line)] bg-[var(--surface)] opacity-65"
                  }`}
                >
                  <span className={`mx-auto mb-2 block h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-[var(--accent)]" : "bg-[var(--muted)]/50"}`} />
                  <p className="text-sm font-semibold text-[var(--ink)]">{t.label}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">{t.isActive ? "Aktif" : "Kapalı"}</p>
                  <div className="mt-3 flex justify-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button type="button" onClick={() => void toggleTable(t)} className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]">
                      {t.isActive ? "Kapat" : "Aç"}
                    </button>
                    <button type="button" onClick={() => void deleteTable(t)} className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]">
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Toplu masa oluştur" description="Numaralı masaları tek seferde ekleyin." />
            <form onSubmit={(e) => void bulkCreate(e)} className="space-y-4 p-5">
              <Field label="Önek">
                <input className={inputClassName()} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Masa" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç">
                  <input className={inputClassName()} type="number" min="1" value={from} onChange={(e) => setFrom(e.target.value)} required />
                </Field>
                <Field label="Bitiş">
                  <input className={inputClassName()} type="number" min="1" value={to} onChange={(e) => setTo(e.target.value)} required />
                </Field>
              </div>
              <Btn type="submit" variant="primary" className="w-full" disabled={bulkSaving || !branchId || tableLimitReached}>
                {bulkSaving ? "Oluşturuluyor…" : "Toplu ekle"}
              </Btn>
            </form>
          </Card>

          <Card>
            <CardHeader title="Tek masa ekle" description="Özel isimli masa." />
            <form onSubmit={(e) => void createSingle(e)} className="space-y-4 p-5">
              <Field label="Masa adı">
                <input className={inputClassName()} value={singleLabel} onChange={(e) => setSingleLabel(e.target.value)} placeholder="Bahçe VIP" required />
              </Field>
              <Btn type="submit" variant="primary" className="w-full" disabled={singleSaving || !branchId || !singleLabel.trim() || tableLimitReached}>
                {singleSaving ? "Ekleniyor…" : "Masa ekle"}
              </Btn>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 3 — Önizleme & Paylaşım
// ═══════════════════════════════════════════════════════

function ShareTab({ branches }: { branches: Branch[] | null }) {
  const { data: tenant } = useApiQuery<{ slug: string; name: string }>("tenant:me", "/tenants/me");
  const [branchId, setBranchId] = useState("");
  const { data: tables } = useApiQuery<MenuTable[]>(
    branchId ? `menu:tables:${branchId}` : null,
    branchId ? `/menu/tables?branchId=${branchId}` : null,
  );

  const publicMenuUrl = tenant ? getPublicMenuUrl(tenant.slug) : "";

  const [copied, setCopied] = useState<string | null>(null);
  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  useEffect(() => {
    if (branches?.length && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-[var(--ink)]">Genel menü linki</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Bu linki müşterilerinizle paylaşın; menünüz telefonda anında açılır.</p>
            {tenant && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)]">
                  {publicMenuUrl}
                </code>
                <div className="flex gap-2">
                  <Btn variant="secondary" className="h-10" onClick={() => copyToClipboard(publicMenuUrl, "menu")}>
                    {copied === "menu" ? "Kopyalandı" : "Kopyala"}
                  </Btn>
                  <a
                    href={publicMenuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-3.5 text-[0.8125rem] font-medium text-white transition hover:opacity-90"
                  >
                    Önizle ↗
                  </a>
                </div>
              </div>
            )}
          </div>
          {tenant && (
            <div className="hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3 md:block">
              <QrCanvas value={publicMenuUrl} size={112} />
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Masa QR kodları"
          description="Her masanın özel QR kodu. Yalnızca aktif masalar listelenir."
          action={
            branches && branches.length > 0 ? (
              <select
                className={`${inputClassName()} h-8 w-44 rounded-lg`}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                aria-label="Şube"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : null
          }
        />
        {tables && tables.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {tables
              .filter((t) => t.isActive)
              .map((t) => {
                const tableUrl = tenant ? getPublicMenuUrl(tenant.slug, t.qrCode) : "";
                return (
                  <div key={t.id} className="flex flex-col items-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-center">
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2">
                      <QrCanvas value={tableUrl} size={88} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--ink)]">{t.label}</p>
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-[var(--accent-deep)] hover:underline"
                      onClick={() => copyToClipboard(tableUrl, `table-${t.id}`)}
                    >
                      {copied === `table-${t.id}` ? "Kopyalandı" : "Linki kopyala"}
                    </button>
                  </div>
                );
              })}
          </div>
        ) : branchId ? (
          <div className="p-5">
            <EmptyState title="Bu şubede masa yok" description="Masalar sekmesinden masa ekleyin." />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// ── QR Canvas (simple client-side QR) ───────────────────

function QrCanvas({ value, size = 88 }: { value: string; size?: number }) {
  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !value) return;
      void renderQr(canvas, value, size);
    },
    [value, size],
  );

  return <canvas ref={canvasRef} width={size} height={size} />;
}

async function renderQr(canvas: HTMLCanvasElement, value: string, size: number) {
  try {
    const QRCode = (await import("qrcode")).default;
    await QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: { dark: "#000", light: "#fff" },
    });
  } catch {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#999";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("QR", size / 2, size / 2);
    }
  }
}
