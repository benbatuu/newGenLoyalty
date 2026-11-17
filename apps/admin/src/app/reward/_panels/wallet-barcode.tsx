"use client";

import type { ReactElement } from "react";
import type { BarcodeFormat } from "./wallet-types";

/**
 * Wallet barkod önizlemesi. Gerçek telefonda görünen biçimi taklit eder:
 * - QR: 21×21 modül, köşe bulucu kareler + sabit veri deseni
 * - AZTEC: merkezde bullseye, dışında veri halkaları (köşe kareleri yok)
 * - PDF417: yatay istiflenmiş çok satırlı kod
 * - CODE128: tek satır çizgi
 * Desenler deterministik: aynı format her zaman aynı görünür.
 */

/** Tek seed'li basit PRNG — yeniden render'da desen değişmesin */
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1000) / 1000;
  };
}

function QrGlyph({ size, fg, bg }: { size: number; fg: string; bg: string }) {
  const n = 21;
  const r = rng(77);
  const cells: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  // Veri modülleri
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) cells[y]![x] = r() > 0.5;
  // Üç köşe bulucu (7×7 + beyaz çerçeve 1 modül)
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x, gy = oy + y;
        if (gx < 0 || gy < 0 || gx >= n || gy >= n) continue;
        const inOuter = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const ring = inOuter && (x === 0 || x === 6 || y === 0 || y === 6);
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[gy]![gx] = inOuter ? ring || core : false;
      }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  const cs = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={size} height={size} fill={bg} />
      {cells.flatMap((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x * cs} y={y * cs} width={cs + 0.3} height={cs + 0.3} fill={fg} /> : null,
        ),
      )}
    </svg>
  );
}

function AztecGlyph({ size, fg, bg }: { size: number; fg: string; bg: string }) {
  const c = size / 2;
  const r = rng(99);
  const rings = [6, 9, 12, 15, 18];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <rect width={size} height={size} fill={bg} />
      {/* bullseye */}
      <circle cx={c} cy={c} r={size * 0.09} fill={fg} />
      <circle cx={c} cy={c} r={size * 0.14} fill="none" stroke={fg} strokeWidth={size * 0.035} />
      <circle cx={c} cy={c} r={size * 0.19} fill="none" stroke={fg} strokeWidth={size * 0.035} />
      {rings.map((rad, i) => {
        const seg = 24;
        const scale = size / 48;
        return Array.from({ length: seg }).map((_, s) => {
          if (r() < 0.45) return null;
          const a0 = (s / seg) * Math.PI * 2;
          const a1 = ((s + 0.7) / seg) * Math.PI * 2;
          const R = rad * scale * 0.92;
          const x0 = c + R * Math.cos(a0), y0 = c + R * Math.sin(a0);
          const x1 = c + R * Math.cos(a1), y1 = c + R * Math.sin(a1);
          return (
            <path
              key={`${i}-${s}`}
              d={`M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`}
              fill="none"
              stroke={fg}
              strokeWidth={scale * 2.2}
              strokeLinecap="butt"
            />
          );
        });
      })}
    </svg>
  );
}

function Pdf417Glyph({ width, fg, bg }: { width: number; fg: string; bg: string }) {
  const rows = 12;
  const h = width * 0.34;
  const r = rng(123);
  const rowH = h / rows;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={width} height={h} fill={bg} />
      {Array.from({ length: rows }).map((_, y) => {
        let x = 4;
        const bars: ReactElement[] = [];
        while (x < width - 4) {
          const w = 1 + Math.floor(r() * 3);
          if (r() > 0.45) bars.push(<rect key={`${y}-${x}`} x={x} y={y * rowH} width={w} height={rowH * 0.92} fill={fg} />);
          x += w + 1;
        }
        return <g key={y}>{bars}</g>;
      })}
    </svg>
  );
}

function Code128Glyph({ width, fg, bg }: { width: number; fg: string; bg: string }) {
  const h = width * 0.22;
  const r = rng(555);
  const bars: ReactElement[] = [];
  let x = 6;
  while (x < width - 6) {
    const w = 1 + Math.floor(r() * 3);
    if (r() > 0.42) bars.push(<rect key={x} x={x} y={3} width={w} height={h - 12} fill={fg} />);
    x += w;
  }
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={width} height={h} fill={bg} />
      {bars}
    </svg>
  );
}

/**
 * Barkod alanı. `width` ön yüzdeki kutu genişliğine göre; QR/Aztec kare,
 * PDF417/Code128 yatay kullanılır.
 */
export function WalletBarcode({
  format,
  width,
  fg = "#000000",
  bg = "#FFFFFF",
}: {
  format: BarcodeFormat;
  width: number;
  fg?: string;
  bg?: string;
}) {
  if (format === "PDF417") return <Pdf417Glyph width={width} fg={fg} bg={bg} />;
  if (format === "CODE128") return <Code128Glyph width={width} fg={fg} bg={bg} />;
  if (format === "AZTEC") return <AztecGlyph size={Math.min(width, 120)} fg={fg} bg={bg} />;
  return <QrGlyph size={Math.min(width, 120)} fg={fg} bg={bg} />;
}
