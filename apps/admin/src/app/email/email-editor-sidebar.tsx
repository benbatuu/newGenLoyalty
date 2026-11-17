"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_EMAIL_THEME,
  EMAIL_MERGE_TAGS,
  type EmailBlock,
  type EmailMergeTagDef,
  type EmailTheme,
} from "@ngl/shared";
import { ApiError, apiUpload } from "../../lib/api";
import { resolveAdminAssetUrl } from "../../lib/public-urls";
import { Field, SectionLabel, Tabs, btnGhost, inputClassName } from "../../components/ui";
import { BLOCK_CATALOG } from "./email-block-utils";

export type EditorSidebarTab = "blocks" | "tags" | "brand";

type EmailEditorSidebarProps = {
  tab: EditorSidebarTab;
  onTabChange: (tab: EditorSidebarTab) => void;
  onAddBlock: (type: EmailBlock["type"]) => void;
  onInsertTag: (token: string) => void;
  theme: Required<
    Pick<
      EmailTheme,
      | "primaryColor"
      | "backgroundColor"
      | "cardBackground"
      | "textColor"
      | "headingColor"
    >
  > & { logoUrl?: string };
  tenantLogoUrl?: string | null;
  onThemeChange: (patch: Partial<EmailTheme>) => void;
  disabled?: boolean;
  className?: string;
};

const TAB_LABELS: { id: EditorSidebarTab; label: string }[] = [
  { id: "blocks", label: "Ekle" },
  { id: "tags", label: "Etiketler" },
  { id: "brand", label: "Marka" },
];

const BLOCK_GROUPS: {
  title: string;
  types: EmailBlock["type"][];
}[] = [
  { title: "Metin", types: ["heading", "paragraph", "list", "columns"] },
  {
    title: "Görsel & aksiyon",
    types: ["image", "button", "highlight", "coupon"],
  },
  {
    title: "Bağlantı & alt bilgi",
    types: ["social", "footer", "divider", "spacer"],
  },
  {
    title: "Zengin içerik",
    types: ["product", "video", "quote", "html"],
  },
];

export function EmailEditorSidebar({
  tab,
  onTabChange,
  onAddBlock,
  onInsertTag,
  theme,
  tenantLogoUrl,
  onThemeChange,
  disabled,
  className = "",
}: EmailEditorSidebarProps) {
  return (
    <aside
      className={`flex min-h-0 flex-col border-[var(--line)] bg-[var(--panel)] ${className}`}
    >
      <div className="shrink-0 border-b border-[var(--line)] p-2">
        <Tabs
          tabs={TAB_LABELS}
          value={tab}
          onChange={(id) => {
            if (!disabled) onTabChange(id as EditorSidebarTab);
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
        {tab === "blocks" ? (
          <BlockGrid disabled={disabled} onAdd={onAddBlock} />
        ) : null}
        {tab === "tags" ? (
          <MergeTagPicker disabled={disabled} onInsert={onInsertTag} />
        ) : null}
        {tab === "brand" ? (
          <BrandingCompact
            theme={theme}
            tenantLogoUrl={tenantLogoUrl}
            disabled={disabled}
            onChange={onThemeChange}
          />
        ) : null}
      </div>
    </aside>
  );
}

function BlockGrid({
  disabled,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: (type: EmailBlock["type"]) => void;
}) {
  const catalogByType = useMemo(
    () => Object.fromEntries(BLOCK_CATALOG.map((b) => [b.type, b])),
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-[0.6875rem] leading-snug text-[var(--muted)]">
        Bloğu ekleyin, ardından ortada düzenleyin.
      </p>
      {BLOCK_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="section-label mb-1.5">
            {group.title}
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {group.types.map((type) => {
              const item = catalogByType[type];
              if (!item) return null;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  title={item.hint}
                  className="flex h-8 items-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 text-left text-[0.8125rem] font-medium text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-50"
                  onClick={() => onAdd(type)}
                >
                  <span className="text-[var(--muted)]">+</span> {item.label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function MergeTagPicker({
  disabled,
  onInsert,
}: {
  disabled?: boolean;
  onInsert: (token: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [group, setGroup] = useState<"all" | "customer" | "business">("all");

  const tags = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return EMAIL_MERGE_TAGS.filter((t) => {
      if (group !== "all" && t.group !== group) return false;
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.token.toLowerCase().includes(q)
      );
    });
  }, [filter, group]);

  function pick(tag: EmailMergeTagDef) {
    onInsert(tag.token);
    setPicked(tag.id);
    window.setTimeout(() => setPicked(null), 1200);
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.6875rem] leading-snug text-[var(--muted)]">
        Seçili bloğa veya konu satırına eklenir. Gönderimde kişiye özel dolar.
      </p>
      <input
        className={inputClassName()}
        placeholder="Etiket ara…"
        value={filter}
        disabled={disabled}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["all", "Tümü"],
            ["customer", "Müşteri"],
            ["business", "İşletme"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
              group === id
                ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                : "bg-[var(--panel)] text-[var(--muted)] ring-1 ring-[var(--line)]"
            }`}
            onClick={() => setGroup(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            title={`${tag.label} — örn. ${tag.example}`}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] transition ${
              picked === tag.id
                ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
                : "border-[var(--line)] bg-[var(--panel)] text-[var(--brand)] hover:border-[var(--brand)]"
            }`}
            onClick={() => pick(tag)}
          >
            {tag.token}
          </button>
        ))}
      </div>
      {tags.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Eşleşen etiket yok.</p>
      ) : null}
      <details className="rounded-md border border-[var(--line)] bg-[var(--panel)] text-[0.75rem]">
        <summary className="cursor-pointer px-3 py-2 font-medium text-[var(--ink)]">
          Etiket sözlüğü
        </summary>
        <ul className="max-h-40 space-y-2 overflow-y-auto border-t border-[var(--line)] px-3 py-2">
          {EMAIL_MERGE_TAGS.map((tag) => (
            <li key={tag.id} className="leading-snug">
              <code className="text-[10px] text-[var(--brand)]">{tag.token}</code>
              <span className="text-[var(--muted)]"> — {tag.label}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function BrandingCompact({
  theme,
  tenantLogoUrl,
  disabled,
  onChange,
}: {
  theme: EmailEditorSidebarProps["theme"];
  tenantLogoUrl?: string | null;
  disabled?: boolean;
  onChange: (patch: Partial<EmailTheme>) => void;
}) {
  const [uploadBusy, setUploadBusy] = useState(false);

  async function uploadLogo(file: File) {
    setUploadBusy(true);
    try {
      const res = await apiUpload<{ url: string }>("/email/media", file);
      onChange({ logoUrl: res.url });
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  const colors: { key: keyof EmailTheme; label: string }[] = [
    { key: "primaryColor", label: "Buton" },
    { key: "backgroundColor", label: "Arka plan" },
    { key: "cardBackground", label: "Kart" },
    { key: "headingColor", label: "Başlık" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[0.6875rem] leading-snug text-[var(--muted)]">
        E-postanın genel renkleri ve üst logosu.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {colors.map(({ key, label }) => {
          const value = (theme[key as keyof typeof theme] as string) ?? "#111111";
          return (
            <label
              key={key}
              className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5"
            >
              <input
                type="color"
                value={value.startsWith("#") ? value : "#111111"}
                disabled={disabled}
                onChange={(e) => onChange({ [key]: e.target.value })}
                className="h-7 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="text-[11px] font-medium text-[var(--ink)]">{label}</span>
            </label>
          );
        })}
      </div>
      <Field label="Üst logo">
        <div className="flex flex-wrap items-center gap-2">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveAdminAssetUrl(theme.logoUrl)}
              alt=""
              className="h-8 max-w-[88px] object-contain"
            />
          ) : (
            <span className="text-[11px] text-[var(--muted)]">Logo yok</span>
          )}
          <label className="cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px] font-medium">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled || uploadBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadLogo(f);
              }}
            />
            {uploadBusy ? "…" : "Yükle"}
          </label>
          {tenantLogoUrl ? (
            <button
              type="button"
              className={btnGhost()}
              disabled={disabled}
              onClick={() => onChange({ logoUrl: tenantLogoUrl })}
            >
              Kart logosu
            </button>
          ) : null}
        </div>
      </Field>
      <button
        type="button"
        className={`${btnGhost()} w-full`}
        disabled={disabled}
        onClick={() =>
          onChange({
            ...DEFAULT_EMAIL_THEME,
            logoUrl: theme.logoUrl,
          })
        }
      >
        Renkleri sıfırla
      </button>
    </div>
  );
}
