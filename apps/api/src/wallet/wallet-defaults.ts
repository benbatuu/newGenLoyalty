import { Prisma } from '@prisma/client';
import type { ProgramWalletTemplate } from '../loyalty/wallet-template';

/** Marka düzeyi varsayılan kart alanları (Alanlar + Kilit ekranı). Tenant.walletDefaults JSON'u. */
type HeaderField = { key?: string; label: string; value: string };
type Location = { latitude: number; longitude: number; relevantText?: string | null };

export const BRAND_FIELD_KEYS = [
  'headerFields',
  'locations',
  'relevantDate',
  'expirationDate',
  'suppressStripShine',
  'sharingProhibited',
  'stampRows',
  'stampLayout',
  'stampGapX',
  'stampGapY',
  'stampIconScale',
  'stampStaggerRatio',
  'stampOffsetX',
  'stampOffsetY',
  'stampPositions',
  'stampRowAdjust',
  'stripImageUrl',
] as const;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** Gelen JSON'u güvenli biçime indirger. Header en fazla 2 alan (tasarımı bozmamak için). */
export function sanitizeWalletDefaults(raw: unknown): Prisma.InputJsonValue {
  const src = isObj(raw) ? raw : {};
  const headerFields: HeaderField[] = (Array.isArray(src.headerFields) ? src.headerFields : [])
    .filter(isObj)
    .map((f) => ({
      label: String(f.label ?? '').trim().slice(0, 20),
      value: String(f.value ?? '').trim().slice(0, 30),
    }))
    .filter((f) => f.label && f.value)
    .slice(0, 2);
  const locations: Location[] = (Array.isArray(src.locations) ? src.locations : [])
    .filter(isObj)
    .map((l) => ({
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
      relevantText: typeof l.relevantText === 'string' && l.relevantText.trim() ? l.relevantText.trim().slice(0, 120) : null,
    }))
    .filter(
      (l) =>
        Number.isFinite(l.latitude) &&
        Number.isFinite(l.longitude) &&
        Math.abs(l.latitude) <= 90 &&
        Math.abs(l.longitude) <= 180,
    )
    .slice(0, 10);
  const isoOrNull = (v: unknown) => {
    if (typeof v !== 'string' || !v.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  return {
    headerFields,
    locations,
    relevantDate: isoOrNull(src.relevantDate),
    expirationDate: isoOrNull(src.expirationDate),
    suppressStripShine: src.suppressStripShine === true,
    sharingProhibited: src.sharingProhibited === true,
    stampRows: Math.max(0, Math.min(6, Math.trunc(num(src.stampRows) ?? 0))),
    stampLayout: src.stampLayout === 'STAGGERED' ? 'STAGGERED' : 'GRID',
    stampGapX: num(src.stampGapX),
    stampGapY: num(src.stampGapY),
    stampIconScale: num(src.stampIconScale) ?? 1,
    stampStaggerRatio: num(src.stampStaggerRatio) ?? 0.5,
    stampOffsetX: num(src.stampOffsetX) ?? 0,
    stampOffsetY: num(src.stampOffsetY) ?? 0,
    stampPositions: Array.isArray(src.stampPositions) ? src.stampPositions.slice(0, 64) : [],
    stampRowAdjust: Array.isArray(src.stampRowAdjust) ? src.stampRowAdjust.slice(0, 16) : [],
    stripImageUrl: typeof src.stripImageUrl === 'string' && src.stripImageUrl.trim() ? src.stripImageUrl.trim().slice(0, 500) : null,
  };
}

/**
 * Şablonu olmayan kart (veya inheritBrandFields=true) Alanlar/Kilit ekranı değerlerini tenant'tan alır.
 * Diğerleri kendi değerlerini kullanır.
 */
export function applyBrandFields(
  wt: ProgramWalletTemplate | null,
  defaults: unknown,
): ProgramWalletTemplate {
  // Şablonu hiç olmayan kart devralır; mevcut şablonda bayrak açıkça true değilse kendi değerleri kullanılır
  const inherits = wt === null || wt.inheritBrandFields === true;
  if (!inherits || !isObj(defaults)) return wt ?? {};
  const base = wt ?? {};
  const d = defaults as Record<string, unknown>;
  const pick = <K extends keyof ProgramWalletTemplate>(k: K): ProgramWalletTemplate[K] | undefined =>
    d[k] !== undefined ? (d[k] as ProgramWalletTemplate[K]) : undefined;
  return {
    ...base,
    stampRows: pick('stampRows') ?? base.stampRows,
    stampLayout: pick('stampLayout') ?? base.stampLayout,
    stampGapX: pick('stampGapX') ?? base.stampGapX,
    stampGapY: pick('stampGapY') ?? base.stampGapY,
    stampIconScale: pick('stampIconScale') ?? base.stampIconScale,
    stampStaggerRatio: pick('stampStaggerRatio') ?? base.stampStaggerRatio,
    stampOffsetX: pick('stampOffsetX') ?? base.stampOffsetX,
    stampOffsetY: pick('stampOffsetY') ?? base.stampOffsetY,
    stampPositions: pick('stampPositions') ?? base.stampPositions,
    stampRowAdjust: pick('stampRowAdjust') ?? base.stampRowAdjust,
    stripImageUrl: pick('stripImageUrl') ?? base.stripImageUrl,
    headerFields: (d.headerFields as ProgramWalletTemplate['headerFields']) ?? [],
    locations: (d.locations as ProgramWalletTemplate['locations']) ?? [],
    relevantDate: (d.relevantDate as string | null) ?? null,
    expirationDate: (d.expirationDate as string | null) ?? null,
    suppressStripShine: d.suppressStripShine === true,
    sharingProhibited: d.sharingProhibited === true,
  };
}
