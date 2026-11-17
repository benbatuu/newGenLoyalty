"use client";

import { useState } from "react";
import {
  MENU_BLOCK_CATALOG,
  type MenuBlock,
  type MenuBlockType,
} from "@ngl/shared";

/** Blok tipi için kısa, okunur simge. */
const BLOCK_ICON: Record<MenuBlockType, string> = {
  header: "▭",
  cover: "▬",
  welcome: "✦",
  search: "⌕",
  categories: "▦",
  items: "☰",
  text: "¶",
  image: "▣",
  divider: "—",
  spacer: "↕",
  branchPicker: "⌂",
  footer: "▁",
  bottomNav: "◫",
};

const GROUPS: { title: string; types: MenuBlockType[] }[] = [
  { title: "Yapı", types: ["header", "cover", "welcome", "search", "branchPicker"] },
  { title: "Menü", types: ["categories", "items"] },
  { title: "İçerik", types: ["text", "image", "divider", "spacer", "footer"] },
  { title: "Etkileşim", types: ["bottomNav"] },
];

function blockLabel(type: MenuBlockType): string {
  return MENU_BLOCK_CATALOG.find((b) => b.type === type)?.label ?? type;
}

function blockSummary(block: MenuBlock): string {
  switch (block.type) {
    case "header":
      return block.title || "Marka başlığı";
    case "text":
      return block.text?.slice(0, 40) || "Metin";
    case "items":
      return block.title || "Ürün listesi";
    case "categories":
      return block.mode === "grid" ? "Izgara" : block.mode === "chips" ? "Etiket" : "Liste";
    case "footer":
      return block.text?.slice(0, 40) || "Alt bilgi";
    default:
      return "";
  }
}

export function MenuBlockPanel({
  blocks,
  selectedId,
  disabled,
  onSelect,
  onAdd,
  onMove,
  onRemove,
}: {
  blocks: MenuBlock[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string | null) => void;
  onAdd: (type: MenuBlockType) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  const [tab, setTab] = useState<"layers" | "add">("layers");

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)]">
      <div className="flex gap-1 border-b border-[var(--line)] p-2">
        {(
          [
            { id: "layers", label: `Bloklar · ${blocks.length}` },
            { id: "add", label: "Blok ekle" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`h-8 flex-1 rounded-lg text-xs font-medium transition ${
              tab === t.id
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "layers" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {blocks.length === 0 ? (
            <p className="px-3 py-10 text-center text-xs text-[var(--muted)]">
              Henüz blok yok. &quot;Blok ekle&quot; sekmesinden başlayın.
            </p>
          ) : (
            <ol className="space-y-1">
              {blocks.map((b, i) => {
                const active = b.id === selectedId;
                return (
                  <li key={b.id} className="group">
                    <div
                      className={`flex items-center gap-2 rounded-xl px-2 py-2 transition ${
                        active ? "bg-[var(--accent)]/10 ring-1 ring-inset ring-[var(--accent)]/30" : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(active ? null : b.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-sm text-[var(--ink)]" aria-hidden>
                          {BLOCK_ICON[b.type]}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8125rem] font-medium text-[var(--ink)]">
                            {blockLabel(b.type)}
                          </span>
                          <span className="block truncate text-[11px] text-[var(--muted)]">{blockSummary(b)}</span>
                        </span>
                      </button>
                      <div className="flex shrink-0 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" aria-label="Yukarı taşı" disabled={disabled || i === 0} onClick={() => onMove(b.id, -1)}
                          className="h-7 w-6 rounded text-xs text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)] disabled:opacity-30">↑</button>
                        <button type="button" aria-label="Aşağı taşı" disabled={disabled || i === blocks.length - 1} onClick={() => onMove(b.id, 1)}
                          className="h-7 w-6 rounded text-xs text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)] disabled:opacity-30">↓</button>
                        <button type="button" aria-label="Bloğu sil" disabled={disabled} onClick={() => onRemove(b.id)}
                          className="h-7 w-6 rounded text-xs text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-30">✕</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{g.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {g.types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onAdd(type);
                      setTab("layers");
                    }}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-left transition hover:-translate-y-px hover:border-[var(--ink)]/25 hover:shadow-sm disabled:opacity-40"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-sm text-[var(--ink)]" aria-hidden>
                      {BLOCK_ICON[type]}
                    </span>
                    <span>
                      <span className="block text-[0.8125rem] font-medium text-[var(--ink)]">{blockLabel(type)}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-[var(--muted)]">
                        {MENU_BLOCK_CATALOG.find((b) => b.type === type)?.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
