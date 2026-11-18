/**
 * Apple Wallet damga şeridi (storeCard strip) yerleşim matematiği.
 * Sunucu (pass-art), admin önizleme ve düzenleyici aynı koordinatları kullanır — tek kaynak.
 */

/** Strip piksel uzayı (@2x) — 375×123 pt */
export const WALLET_STRIP_W = 750;
export const WALLET_STRIP_H = 246;

export type WalletStampInset = 'TIGHT' | 'NORMAL' | 'WIDE';

export const WALLET_STAMP_INSET_LAYOUT: Record<
  WalletStampInset,
  { padX: number; padY: number; gapX: number; gapY: number; iconFill: number }
> = {
  TIGHT: { padX: 40, padY: 18, gapX: 10, gapY: 10, iconFill: 0.82 },
  NORMAL: { padX: 72, padY: 26, gapX: 18, gapY: 14, iconFill: 0.7 },
  WIDE: { padX: 108, padY: 30, gapX: 22, gapY: 16, iconFill: 0.6 },
};

/** z: katman sırası — büyük olan üstte çizilir */
export type WalletStampPosition = {
  x: number;
  y: number;
  iconSize: number;
  z: number;
};

/** Kullanıcının sürüklediği tek damga konumu (750×246 uzayında, sol-üst köşe) */
export type WalletStampManualPosition = {
  x: number;
  y: number;
  /** Bu damganın boyutu (750 uzayı); boşsa otomatik */
  size?: number;
  /** Katman sırası; boşsa damga sırası */
  z?: number;
} | null;

/** Satır başına ince ayar: kaydırma ve boyut çarpanı (derinlik hissi için) */
export type WalletStampRowAdjust = {
  offsetX?: number;
  offsetY?: number;
  scale?: number;
} | null;

export type WalletStampLayoutOptions = {
  /** 'GRID' (varsayılan) veya 'STAGGERED' — çift satırlar kayar */
  layout?: 'GRID' | 'STAGGERED' | null;
  /** Yatay boşluk (750 uzayı). Boşsa inset varsayılanı. */
  gapX?: number | null;
  /** Dikey boşluk (246 uzayı). Boşsa inset varsayılanı. */
  gapY?: number | null;
  /** Damga boyutu çarpanı (0.5–1.5), varsayılan 1 */
  iconScale?: number | null;
  /** Dizgi kayma oranı (0–1 hücre adımı), varsayılan 0.5 */
  staggerRatio?: number | null;
  /** Tüm damgaları yatay / dikey kaydır (750 / 246 uzayı) */
  offsetX?: number | null;
  offsetY?: number | null;
  /** Damga başına elle verilmiş konum; null olan indeksler otomatik yerleşir */
  manual?: WalletStampManualPosition[] | null;
  /** Satır başına kaydırma / boyut ayarı (satır indeksine göre) */
  rowAdjust?: WalletStampRowAdjust[] | null;
};

export const WALLET_STAMP_ICON_MIN = 24;
export const WALLET_STAMP_ICON_MAX = 200;

/**
 * Satır sayısı verilirse (1..n) o satır sayısına göre sütun hesaplar.
 * Verilmezse / geçersizse varsayılan ızgara (computeStampGrid) kullanılır.
 */
export function resolveWalletStampGrid(
  total: number,
  defaultGrid: { cols: number; rows: number },
  preferredRows?: number | null,
): { cols: number; rows: number } {
  const n = Math.max(1, Math.floor(total) || 1);
  const r = Math.floor(preferredRows ?? 0);
  if (!Number.isFinite(r) || r < 1) return defaultGrid;
  const rows = Math.min(r, n);
  const cols = Math.ceil(n / rows);
  return { cols, rows: Math.ceil(n / cols) };
}

/** Damga ikonlarının strip içindeki konumları (750×246 uzayında). */
export function computeWalletStampPositions(
  total: number,
  cols: number,
  rows: number,
  inset: WalletStampInset,
  stripW: number = WALLET_STRIP_W,
  stripH: number = WALLET_STRIP_H,
  opts: WalletStampLayoutOptions = {},
): WalletStampPosition[] {
  const base = WALLET_STAMP_INSET_LAYOUT[inset];
  const gapX = opts.gapX ?? base.gapX;
  const gapY = opts.gapY ?? base.gapY;
  const { padX, padY, iconFill } = base;
  const scale = clamp(opts.iconScale ?? 1, 0.3, 3);
  const ratio = clamp(opts.staggerRatio ?? 0.5, 0, 1);
  const staggered = opts.layout === 'STAGGERED' && rows > 1 && cols > 1;
  const usableW = stripW - padX * 2;
  const usableH = stripH - padY * 2;
  // Dizgide çift satırlar kayar → genişlik (cols + ratio) adım tutar
  const widthUnits = staggered ? cols + ratio : cols;
  const cellW = Math.floor((usableW - gapX * Math.max(cols - 1, 0)) / widthUnits);
  const cellH = Math.floor((usableH - gapY * Math.max(rows - 1, 0)) / rows);
  const iconSize = Math.round(
    clamp(
      Math.floor(Math.min(cellW, cellH) * iconFill) * scale,
      WALLET_STAMP_ICON_MIN,
      WALLET_STAMP_ICON_MAX,
    ),
  );
  const pitchX = cellW + gapX;
  const shift = staggered ? Math.floor(pitchX * ratio) : 0;
  const gridW = cols * cellW + Math.max(cols - 1, 0) * gapX + shift;
  const gridH = rows * cellH + Math.max(rows - 1, 0) * gapY;
  const originX = padX + Math.floor((usableW - gridW) / 2) + Math.round(opts.offsetX ?? 0);
  const originY = padY + Math.floor((usableH - gridH) / 2) + Math.round(opts.offsetY ?? 0);

  const clampIcon = (n: number) =>
    Math.round(clamp(n, WALLET_STAMP_ICON_MIN, WALLET_STAMP_ICON_MAX));
  const positions: WalletStampPosition[] = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    const colInRow = i % cols;
    const itemsInRow = Math.min(cols, total - row * cols);
    const startCol = Math.floor((cols - itemsInRow) / 2);
    const col = startCol + colInRow;
    const rowShift = staggered && row % 2 === 1 ? shift : 0;
    const adj = opts.rowAdjust?.[row];
    const size = clampIcon(iconSize * clamp(adj?.scale ?? 1, 0.3, 3));
    const auto = {
      x:
        originX + rowShift + col * pitchX + Math.floor((cellW - size) / 2) +
        Math.round(adj?.offsetX ?? 0),
      y:
        originY + row * (cellH + gapY) + Math.floor((cellH - size) / 2) +
        Math.round(adj?.offsetY ?? 0),
      iconSize: size,
      z: i,
    };
    const m = opts.manual?.[i];
    const final = m
      ? {
          x: Math.round(m.x),
          y: Math.round(m.y),
          iconSize: m.size ? clampIcon(m.size) : iconSize,
          z: m.z ?? i,
        }
      : auto;
    // Şerit dışına taşmasın (sunucu kompoziti ve önizleme aynı sonucu versin)
    final.x = Math.round(clamp(final.x, 0, stripW - final.iconSize));
    final.y = Math.round(clamp(final.y, 0, stripH - final.iconSize));
    positions.push(final);
  }
  return positions;
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}
