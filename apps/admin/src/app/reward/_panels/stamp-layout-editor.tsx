"use client";

import { useRef, useState } from "react";
import {
  MAX_WALLET_STAMP_SLOTS,
  WALLET_STRIP_H,
  WALLET_STRIP_W,
} from "@ngl/shared";
import { Field } from "../../../components/ui";
import { StampGlyph, type StampTheme } from "../../../components/stamp-glyph";
import { stampLayoutForDraft } from "./wallet-helpers";
import {
  type ProgramWalletDraft,
  type StampManualPos,
} from "./wallet-types";

type Pos = { x: number; y: number };

type Patch = Partial<ProgramWalletDraft>;

/** Hazır düzenler: tek tıkla uygulanır, elle yapılan ayarları sıfırlar */
const RESET: Patch = {
  stampPositions: [],
  stampRowAdjust: [],
  stampIconScale: 1,
  stampStaggerRatio: 0.5,
  stampOffsetX: 0,
  stampOffsetY: 0,
  stampGapX: null,
  stampGapY: null,
};
type Preset = { id: string; label: string; hint: string; patch: Patch };
type Pt = { cx: number; cy: number; size: number; z?: number };

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Merkez noktalarından elle konum listesi üretir (750×246 uzayı) */
function manualFrom(pts: Pt[]): StampManualPos[] {
  return pts.map((p, i) => ({
    x: Math.round(p.cx - p.size / 2),
    y: Math.round(p.cy - p.size / 2),
    size: Math.round(p.size),
    z: p.z ?? i,
  }));
}

/** Damga sayısına göre kurulan hazır düzenler; sayı için anlamsız olanlar listelenmez */
function buildPresets(n: number): Preset[] {
  const W = WALLET_STRIP_W;
  const H = WALLET_STRIP_H;
  const list: Preset[] = [];
  const add = (id: string, label: string, hint: string, patch: Patch) => list.push({ id, label, hint, patch });

  if (n <= 10) add("one", "Tek sıra", "Hepsi tek satırda", { ...RESET, stampRows: 1, stampLayout: "GRID" });
  if (n >= 2) add("two", "İki sıra", "Alt alta iki düzgün satır", { ...RESET, stampRows: 2, stampLayout: "GRID" });
  if (n >= 6) add("three", "Üç sıra", "Üç düzgün satır", { ...RESET, stampRows: 3, stampLayout: "GRID" });
  if (n >= 4) add("stagger", "Dizgi", "Alt satır yarım adım kayar", { ...RESET, stampRows: 2, stampLayout: "STAGGERED" });
  add("tight", "Üst üste", "Damgalar birbirine biner", {
    ...RESET,
    stampRows: n >= 5 ? 2 : 1,
    stampLayout: n >= 5 ? "STAGGERED" : "GRID",
    stampGapX: -20,
    stampGapY: -30,
    stampIconScale: 1.4,
  });
  if (n >= 4)
    add("depth", "Derinlik", "Arka satır küçük, ön satır büyük", {
      ...RESET,
      stampRows: 2,
      stampLayout: "STAGGERED",
      stampGapX: -10,
      stampGapY: -30,
      stampIconScale: 1.3,
      stampRowAdjust: [
        { offsetX: 0, offsetY: -6, scale: 0.8 },
        { offsetX: 0, offsetY: 0, scale: 1.1 },
      ],
    });

  const span = W - 160;
  const size = clampN((span / n) * 1.05, 30, 110);
  if (n >= 3) {
    add("wave", "Dalga", "Yukarı aşağı dalgalanır", {
      ...RESET,
      stampPositions: manualFrom(
        Array.from({ length: n }, (_, i) => ({
          cx: 80 + (span * (i + 0.5)) / n,
          cy: H / 2 + Math.sin((i / Math.max(n - 1, 1)) * Math.PI * 2) * 40,
          size,
        })),
      ),
    });
    add("diagonal", "Çapraz", "Soldan sağa yükselir", {
      ...RESET,
      stampPositions: manualFrom(
        Array.from({ length: n }, (_, i) => ({
          cx: 80 + (span * (i + 0.5)) / n,
          cy: H - 55 - ((H - 110) * i) / Math.max(n - 1, 1),
          size,
        })),
      ),
    });
  }
  if (n >= 4) {
    add("arch", "Kemer", "Ortası yukarıda bir yay", {
      ...RESET,
      stampPositions: manualFrom(
        Array.from({ length: n }, (_, i) => ({
          cx: 80 + (span * (i + 0.5)) / n,
          cy: H - 60 - Math.sin(((i + 0.5) / n) * Math.PI) * 80,
          size,
        })),
      ),
    });
  }
  if (n >= 5) {
    const ring = clampN(Math.min(110, (2 * Math.PI * 85) / n) * 1.1, 30, 90);
    add("ring", "Halka", "Oval bir halka", {
      ...RESET,
      stampPositions: manualFrom(
        Array.from({ length: n }, (_, i) => {
          const t = (i / n) * Math.PI * 2 - Math.PI / 2;
          return { cx: W / 2 + Math.cos(t) * 250, cy: H / 2 + Math.sin(t) * 72, size: ring };
        }),
      ),
    });
  }
  return list;
}

/** Hazır düzen küçük önizlemesi: seçilen simgeler ve damga sayısıyla */
function MiniStrip({
  draft,
  positions,
  filledUrl,
  emptyUrl,
}: {
  draft: ProgramWalletDraft;
  positions: { x: number; y: number; iconSize: number; z: number }[];
  filledUrl?: string | null;
  emptyUrl?: string | null;
}) {
  const half = Math.ceil(positions.length / 2);
  return (
    <div
      className="relative w-full overflow-hidden rounded-md"
      style={{ aspectRatio: `${WALLET_STRIP_W} / ${WALLET_STRIP_H}`, background: draft.primaryColor }}
      aria-hidden
    >
      {positions.map((p, i) => (
        <div
          key={i}
          className="absolute [&_img]:!h-full [&_img]:!w-full [&_svg]:!h-full [&_svg]:!w-full"
          style={{
            left: `${(p.x / WALLET_STRIP_W) * 100}%`,
            top: `${(p.y / WALLET_STRIP_H) * 100}%`,
            width: `${(p.iconSize / WALLET_STRIP_W) * 100}%`,
            aspectRatio: "1 / 1",
            zIndex: p.z + 100,
          }}
        >
          <StampGlyph
            theme={draft.stampTheme as StampTheme}
            filled={i < half}
            color={draft.foregroundColor}
            size={p.iconSize}
            filledUrl={draft.stampIconFilledUrl || filledUrl || undefined}
            emptyUrl={draft.stampIconEmptyUrl || emptyUrl || undefined}
          />
        </div>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-sm transition ${active ? "border-[var(--ink)] bg-[var(--surface)] font-medium" : "border-[var(--line)] hover:bg-[var(--surface)]"}`}
    >
      {children}
    </button>
  );
}

/**
 * Damga şeridi düzenleyici. Basit kullanım: hazır düzen seç, damgaları sürükle,
 * üç kaydırıcıyla ince ayar yap. Ayrıntılar "Gelişmiş ayarlar" altında.
 * Konumlar 750×246 uzayında (sunucu ile aynı).
 */
export function StampLayoutEditor({
  draft,
  onChange,
  stampsRequired,
  filledUrl,
  emptyUrl,
}: {
  draft: ProgramWalletDraft;
  onChange: (d: ProgramWalletDraft) => void;
  stampsRequired: number;
  /** Özel simge yedekleri (işletme varsayılanı) */
  filledUrl?: string | null;
  emptyUrl?: string | null;
}) {
  const total = Math.min(Math.max(stampsRequired, 1), MAX_WALLET_STAMP_SLOTS);
  const boxRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [live, setLive] = useState<{ i: number; x: number; y: number } | null>(null);
  const dragRef = useRef<{ i: number; px: number; py: number; x0: number; y0: number } | null>(null);

  const { positions } = stampLayoutForDraft(draft, total);

  const manualList = (): StampManualPos[] =>
    Array.from({ length: total }, (_, k) => draft.stampPositions[k] ?? null);

  /** Seçili damgayı elle moda al (mevcut konumundan) ve alanları güncelle */
  const patchManual = (i: number, patch: Partial<NonNullable<StampManualPos>>) => {
    const next = manualList();
    const base = positions[i];
    if (!base) return;
    const cur = next[i] ?? { x: base.x, y: base.y };
    next[i] = { ...cur, ...patch };
    onChange({ ...draft, stampPositions: next });
  };

  const clearManual = (i: number) => {
    const next = manualList();
    next[i] = null;
    onChange({ ...draft, stampPositions: next });
  };

  const clampPos = (i: number, x: number, y: number): Pos => {
    const size = positions[i]?.iconSize ?? 40;
    return {
      x: Math.round(Math.min(Math.max(x, 0), WALLET_STRIP_W - size)),
      y: Math.round(Math.min(Math.max(y, 0), WALLET_STRIP_H - size)),
    };
  };

  const toUnits = (cx: number, cy: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return { ux: 0, uy: 0 };
    return {
      ux: ((cx - r.left) / r.width) * WALLET_STRIP_W,
      uy: ((cy - r.top) / r.height) * WALLET_STRIP_H,
    };
  };

  const onPointerDown = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(i);
    const p = positions[i];
    if (!p) return;
    const { ux, uy } = toUnits(e.clientX, e.clientY);
    dragRef.current = { i, px: ux, py: uy, x0: p.x, y0: p.y };
    setLive({ i, x: p.x, y: p.y });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const { ux, uy } = toUnits(e.clientX, e.clientY);
    setLive({ i: d.i, ...clampPos(d.i, d.x0 + (ux - d.px), d.y0 + (uy - d.py)) });
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && live && live.i === d.i && (live.x !== d.x0 || live.y !== d.y0)) {
      patchManual(d.i, { x: live.x, y: live.y });
    }
    setLive(null);
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const p = positions[i];
    if (!p) return;
    const delta: Record<string, Pos> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    patchManual(i, clampPos(i, p.x + d.x, p.y + d.y));
  };

  const zs = positions.map((p) => p.z);
  const bringFront = (i: number) => patchManual(i, { z: Math.max(...zs) + 1 });
  const sendBack = (i: number) => patchManual(i, { z: Math.min(...zs) - 1 });

  const resetAll = () =>
    onChange({
      ...draft,
      stampPositions: [],
      stampRowAdjust: [],
      stampIconScale: 1,
      stampStaggerRatio: 0.5,
      stampOffsetX: 0,
      stampOffsetY: 0,
      stampGapX: null,
      stampGapY: null,
    });

  const manualCount = draft.stampPositions.filter(Boolean).length;
  const sel = selected !== null ? positions[selected] : null;
  const selManual = selected !== null ? draft.stampPositions[selected] : null;

  const applyPreset = (patch: Patch) => {
    setSelected(null);
    onChange({ ...draft, ...patch });
  };
  const previewOf = (patch: Patch) => stampLayoutForDraft({ ...draft, ...patch }, total).positions;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Hazır düzenler</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {buildPresets(total).map((pr) => (
            <button
              key={pr.id}
              type="button"
              title={pr.hint}
              onClick={() => applyPreset(pr.patch)}
              className="group rounded-xl border border-[var(--line)] p-2 text-left transition hover:border-[var(--ink)] hover:bg-[var(--surface)]"
            >
              <MiniStrip draft={draft} positions={previewOf(pr.patch)} filledUrl={filledUrl} emptyUrl={emptyUrl} />
              <span className="mt-1.5 block text-[13px] font-medium">{pr.label}</span>
              <span className="block text-[11px] text-[var(--muted)]">{pr.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        ref={boxRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-[var(--line)]"
        style={{ aspectRatio: `${WALLET_STRIP_W} / ${WALLET_STRIP_H}`, background: draft.primaryColor }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={() => setSelected(null)}
      >
        {Array.from({ length: total }).map((_, i) => {
          const base = positions[i];
          if (!base) return null;
          const isLive = live?.i === i;
          const x = isLive ? live.x : base.x;
          const y = isLive ? live.y : base.y;
          const isSel = selected === i;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Damga ${i + 1}. Sürükle veya ok tuşları ile taşı.`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDown(i, e);
              }}
              onKeyDown={(e) => onKey(i, e)}
              onFocus={() => setSelected(i)}
              className={`absolute cursor-grab rounded-md outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-white ${isSel ? "ring-2 ring-white" : ""}`}
              style={{
                left: `${(x / WALLET_STRIP_W) * 100}%`,
                top: `${(y / WALLET_STRIP_H) * 100}%`,
                width: `${(base.iconSize / WALLET_STRIP_W) * 100}%`,
                aspectRatio: "1 / 1",
                zIndex: isSel ? 1000 : base.z + 100,
              }}
            >
              <div className="pointer-events-none h-full w-full [&_img]:!h-full [&_img]:!w-full [&_svg]:!h-full [&_svg]:!w-full">
                <StampGlyph theme={draft.stampTheme as StampTheme} filled={i < Math.ceil(total / 2)} color={draft.foregroundColor} size={base.iconSize} filledUrl={draft.stampIconFilledUrl || filledUrl || undefined} emptyUrl={draft.stampIconEmptyUrl || emptyUrl || undefined} />
              </div>
              {draft.stampPositions[i] && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-white" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {selected !== null && sel ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] p-3">
          <p className="mr-2 text-sm font-medium">Damga {selected + 1}</p>
          <Chip active={false} onClick={() => bringFront(selected)}>Öne getir</Chip>
          <Chip active={false} onClick={() => sendBack(selected)}>Arkaya gönder</Chip>
          {selManual && <Chip active={false} onClick={() => clearManual(selected)}>Otomatiğe döndür</Chip>}
        </div>
      ) : (
        <p className="text-[12px] text-[var(--muted)]">
          Bir damgaya tıklayıp sürükleyerek istediğin yere taşı. Elle taşıdıkların {manualCount}/{total}.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={`Boyut: %${Math.round(draft.stampIconScale * 100)}`}>
          <input type="range" min={30} max={300} step={5} value={Math.round(draft.stampIconScale * 100)} onChange={(e) => onChange({ ...draft, stampIconScale: Number(e.target.value) / 100 })} className="w-full" />
        </Field>
        <Field label={`Yatay aralık: ${draft.stampGapX ?? "otomatik"}`}>
          <input type="range" min={-150} max={200} step={1} value={draft.stampGapX ?? 18} onChange={(e) => onChange({ ...draft, stampGapX: Number(e.target.value) })} className="w-full" />
        </Field>
        <Field label={`Dikey aralık: ${draft.stampGapY ?? "otomatik"}`}>
          <input type="range" min={-150} max={150} step={1} value={draft.stampGapY ?? 14} onChange={(e) => onChange({ ...draft, stampGapY: Number(e.target.value) })} className="w-full" />
        </Field>
      </div>
      <p className="-mt-2 text-[11px] text-[var(--muted)]">Aralığı eksiye çekersen damgalar birbirine biner.</p>

      <button type="button" className="min-h-[36px] rounded-lg border border-[var(--line)] px-3 text-sm hover:bg-[var(--surface)]" onClick={resetAll}>
        Tüm düzeni sıfırla
      </button>
    </div>
  );
}
