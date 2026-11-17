/** Multi-stamp Wallet şeridi — grup × eşik toplamı */

/** Apple Wallet strip'te okunaklı üst sınır (5×4 veya 4×5 ızgara) */
export const MAX_WALLET_STAMP_SLOTS = 20;

/** Kart tasarımını bozmadan izin verilen maksimum grup sayısı */
export const MAX_MULTI_STAMP_GROUPS = 4;

export type MultiStampWalletSegment = {
  laneId: string;
  label: string;
  threshold: number;
  filled: number;
  /** Birleşik şeritteki başlangıç indeksi */
  startIndex: number;
  stampTheme?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
};

export type MultiStampWalletLayout = {
  totalSlots: number;
  totalFilled: number;
  segments: MultiStampWalletSegment[];
  /** Birleşik şerit — true = dolu damga */
  slotFilled: boolean[];
};

export type GroupStampStyle = {
  stampTheme?: string | null;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
};

export type LaneLike = { id: string; label: string } & GroupStampStyle;
export type TierLike = {
  threshold: number;
  laneId?: string | null;
  rewardLabel?: string;
};

/** Admin / pass-art ile aynı ızgara mantığı */
export function computeStampGrid(stampsRequired: number): {
  cols: number;
  rows: number;
} {
  const n = Math.max(
    1,
    Math.min(Math.floor(stampsRequired) || 1, MAX_WALLET_STAMP_SLOTS),
  );
  if (n <= 5) return { cols: n, rows: 1 };

  for (const cols of [5, 4, 6, 3] as const) {
    if (n % cols === 0) {
      const rows = n / cols;
      if (rows <= 5) return { cols, rows };
    }
  }

  if (n <= 8) return { cols: 4, rows: Math.ceil(n / 4) };
  if (n <= 20) return { cols: 5, rows: Math.ceil(n / 5) };
  return { cols: 5, rows: 4 };
}

export function resolveLaneThreshold(
  laneId: string,
  laneIndex: number,
  tiers: TierLike[],
  fallbackThreshold = 10,
): number {
  const tier =
    tiers.find((t) => t.laneId === laneId) ??
    tiers[laneIndex] ??
    tiers[0];
  return Math.max(1, tier?.threshold ?? fallbackThreshold);
}

/** LANES modu — grupların eşikleri toplanır (2×10 → 20 slot) */
export function buildMultiStampWalletLayout(
  lanes: LaneLike[],
  tiers: TierLike[],
  balances: Record<string, number> | null | undefined,
  fallbackThreshold = 10,
): MultiStampWalletLayout {
  const segments: MultiStampWalletSegment[] = [];
  let startIndex = 0;

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i]!;
    const threshold = resolveLaneThreshold(
      lane.id,
      i,
      tiers,
      fallbackThreshold,
    );
    const filled = Math.max(
      0,
      Math.min(balances?.[lane.id] ?? 0, threshold),
    );
    segments.push({
      laneId: lane.id,
      label: lane.label,
      threshold,
      filled,
      startIndex,
      stampTheme: lane.stampTheme,
      stampIconFilledUrl: lane.stampIconFilledUrl,
      stampIconEmptyUrl: lane.stampIconEmptyUrl,
    });
    startIndex += threshold;
  }

  const totalSlots = startIndex;
  const slotFilled = Array.from({ length: totalSlots }, () => false);
  for (const seg of segments) {
    for (let i = 0; i < seg.filled; i++) {
      slotFilled[seg.startIndex + i] = true;
    }
  }

  return {
    totalSlots,
    totalFilled: slotFilled.filter(Boolean).length,
    segments,
    slotFilled,
  };
}

/** Çarpan modunda ürün gruplarını görsel segment olarak birleştirir (2×10 → 20 slot) */
export function buildMultiplierGroupWalletLayout(
  productGroups: ({ id: string; label: string } & GroupStampStyle)[],
  tierThreshold: number,
  balances?: Record<string, number> | null,
  aggregateBalance?: number,
): MultiStampWalletLayout {
  const lanes = productGroups.map((g) => ({
    id: g.id,
    label: g.label,
    stampTheme: g.stampTheme,
    stampIconFilledUrl: g.stampIconFilledUrl,
    stampIconEmptyUrl: g.stampIconEmptyUrl,
  }));
  const tiers = productGroups.map((g) => ({
    threshold: tierThreshold,
    laneId: g.id,
  }));

  const bal: Record<string, number> = {};
  if (balances && Object.keys(balances).length > 0) {
    for (const g of productGroups) {
      bal[g.id] = Math.max(0, Math.min(balances[g.id] ?? 0, tierThreshold));
    }
  } else {
    let remaining = Math.max(0, aggregateBalance ?? 0);
    for (const g of productGroups) {
      const take = Math.min(remaining, tierThreshold);
      bal[g.id] = take;
      remaining -= take;
    }
  }

  return buildMultiStampWalletLayout(lanes, tiers, bal, tierThreshold);
}

/**
 * MULTI_STAMP programı için birleşik Wallet şeridi.
 * LANES: lane eşikleri toplanır.
 * MULTIPLIER + 2+ grup: grup × tier eşiği (görsel; bakiye sırayla dolar).
 */
export function buildMultiStampWalletLayoutForProgram(
  mode: 'LANES' | 'MULTIPLIER',
  config: {
    lanes?: LaneLike[];
    productGroups?: { id: string; label: string }[];
  },
  tiers: TierLike[],
  opts?: {
    balances?: Record<string, number> | null;
    aggregateBalance?: number;
    fallbackThreshold?: number;
  },
): MultiStampWalletLayout | null {
  const fallback = opts?.fallbackThreshold ?? 10;

  if (mode === 'LANES' && config.lanes?.length) {
    return buildMultiStampWalletLayout(
      config.lanes,
      tiers,
      opts?.balances,
      fallback,
    );
  }

  if (
    mode === 'MULTIPLIER' &&
    config.productGroups &&
    config.productGroups.length > 1
  ) {
    const tierThreshold = tiers[0]?.threshold ?? fallback;
    return buildMultiplierGroupWalletLayout(
      config.productGroups,
      tierThreshold,
      opts?.balances,
      opts?.aggregateBalance,
    );
  }

  return null;
}

export function multiStampUsesCombinedStrip(
  mode: 'LANES' | 'MULTIPLIER',
  config: {
    lanes?: LaneLike[];
    productGroups?: ({ id: string; label: string } & GroupStampStyle)[];
  },
): boolean {
  if (mode === 'LANES') return (config.lanes?.length ?? 0) > 0;
  return (config.productGroups?.length ?? 0) > 1;
}

/** Her slot için grup damga stili (Wallet pass / önizleme) */
export function buildSlotStylesFromLayout(
  layout: MultiStampWalletLayout,
  defaults?: GroupStampStyle,
): GroupStampStyle[] {
  const styles: GroupStampStyle[] = [];
  const fallbackTheme =
    defaults?.stampTheme && defaults.stampTheme !== 'CUSTOM'
      ? defaults.stampTheme
      : 'COFFEE';

  for (const seg of layout.segments) {
    const theme = seg.stampTheme ?? fallbackTheme;
    const isCustom = theme === 'CUSTOM';
    const slotStyle: GroupStampStyle = {
      stampTheme: theme,
      stampIconFilledUrl: isCustom
        ? seg.stampIconFilledUrl ?? defaults?.stampIconFilledUrl ?? null
        : null,
      stampIconEmptyUrl: isCustom
        ? seg.stampIconEmptyUrl ?? defaults?.stampIconEmptyUrl ?? null
        : null,
    };
    for (let i = 0; i < seg.threshold; i++) {
      styles.push({ ...slotStyle });
    }
  }
  return styles;
}

export function validateMultiStampWalletCapacity(
  mode: 'LANES' | 'MULTIPLIER',
  groupCount: number,
  tiers: TierLike[],
  lanes?: LaneLike[],
): { ok: true } | { ok: false; message: string } {
  if (groupCount > MAX_MULTI_STAMP_GROUPS) {
    return {
      ok: false,
      message: `En fazla ${MAX_MULTI_STAMP_GROUPS} grup tanımlanabilir (Wallet şeridi sınırı).`,
    };
  }

  if (mode === 'MULTIPLIER') {
    const threshold = tiers.reduce(
      (m, t) => Math.max(m, t.threshold),
      tiers[0]?.threshold ?? 0,
    );
    const total =
      groupCount > 1 ? groupCount * threshold : threshold;
    if (total > MAX_WALLET_STAMP_SLOTS) {
      return {
        ok: false,
        message:
          groupCount > 1
            ? `Toplam Wallet damgası ${total} — en fazla ${MAX_WALLET_STAMP_SLOTS} (${groupCount} grup × ${threshold}).`
            : `Damga hedefi en fazla ${MAX_WALLET_STAMP_SLOTS} olabilir.`,
      };
    }
    return { ok: true };
  }

  if (!lanes?.length) {
    return { ok: false, message: 'En az bir grup (lane) tanımlayın.' };
  }

  const layout = buildMultiStampWalletLayout(lanes, tiers, {});
  if (layout.totalSlots > MAX_WALLET_STAMP_SLOTS) {
    return {
      ok: false,
      message: `Toplam Wallet damgası ${layout.totalSlots} — en fazla ${MAX_WALLET_STAMP_SLOTS} (${lanes.length} grup × eşik toplamı).`,
    };
  }

  return { ok: true };
}

export function maxThresholdPerGroup(groupCount: number): number {
  const groups = Math.max(1, Math.min(groupCount, MAX_MULTI_STAMP_GROUPS));
  return Math.floor(MAX_WALLET_STAMP_SLOTS / groups);
}
