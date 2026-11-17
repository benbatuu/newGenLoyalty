export type VipTier = {
  id: string;
  name: string;
  minVisits: number;
  minSpendKurus: number;
  rateMultiplier: number;
  sortOrder: number;
  _count?: { customers: number };
};

export type TierDraft = {
  name: string;
  visits: string;
  spendTry: string;
  useSpend: boolean;
  multiplier: number;
};

/** Kazanç bonusu seçenekleri — teknik "çarpan" yerine yüzde gösterilir */
export const BONUS_OPTIONS = [1, 1.1, 1.25, 1.5, 2];

/** 1.25 → "%25 fazla"; 1 → null */
export function bonusLabel(m: number) {
  if (!m || m <= 1) return null;
  return `%${Math.round((m - 1) * 100)} fazla`;
}

export const NAME_IDEAS = ["Bronz", "Gümüş", "Altın", "Platin"];

/** Tek tıkla başlangıç: yalnızca ziyaret sayısı, her işletmede çalışır */
export const STARTER_TIERS: { name: string; minVisits: number; rateMultiplier: number }[] = [
  { name: "Bronz", minVisits: 5, rateMultiplier: 1 },
  { name: "Gümüş", minVisits: 15, rateMultiplier: 1.1 },
  { name: "Altın", minVisits: 30, rateMultiplier: 1.25 },
];

/** Basamak rengi — sıraya göre bronz → gümüş → altın → platin */
const MEDALS = [
  "bg-[var(--accent-soft)] text-[#f08a96] ring-[var(--accent)]/30",
  "bg-[var(--surface)] text-[var(--ink)] ring-[var(--line-strong)]",
  "bg-[var(--accent)] text-white ring-[var(--accent)]/40",
  "bg-[var(--ink)] text-[var(--background)] ring-[var(--ink)]/30",
];
export const medalClass = (i: number) => MEDALS[Math.min(i, MEDALS.length - 1)];

export const tl = (kurus: number) =>
  `${(kurus / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL`;

/** Sunucuyla aynı sıra: kolaydan zora */
export function sortTiers(list: VipTier[]) {
  return [...list].sort(
    (a, b) => a.minSpendKurus - b.minSpendKurus || a.minVisits - b.minVisits,
  );
}

/** "15 ziyaret ve 1.000 TL harcama" gibi sade cümle */
export function describeGoal(minVisits: number, minSpendKurus: number) {
  const parts: string[] = [];
  if (minVisits > 0) parts.push(`${minVisits} ziyaret`);
  if (minSpendKurus > 0) parts.push(`${tl(minSpendKurus)} harcama`);
  return parts.length ? parts.join(" ve ") : "Herkes (şart yok)";
}

export function draftFrom(t?: VipTier): TierDraft {
  if (!t) return { name: "", visits: "", spendTry: "", useSpend: false, multiplier: 1 };
  return {
    name: t.name,
    visits: t.minVisits ? String(t.minVisits) : "",
    spendTry: t.minSpendKurus ? String(Math.round(t.minSpendKurus / 100)) : "",
    useSpend: t.minSpendKurus > 0,
    multiplier: t.rateMultiplier > 1 ? t.rateMultiplier : 1,
  };
}

export function parseDraft(d: TierDraft) {
  const visits = Math.max(0, Math.floor(Number(d.visits) || 0));
  const spendTry = d.useSpend
    ? Math.max(0, Number(d.spendTry.replace(/\./g, "").replace(",", ".")) || 0)
    : 0;
  return {
    name: d.name.trim(),
    minVisits: visits,
    minSpendKurus: Math.round(spendTry * 100),
    rateMultiplier: Math.min(2, Math.max(1, d.multiplier || 1)),
  };
}

/** Kullanıcıya gösterilecek ilk sorun; yoksa null */
export function validateDraft(
  d: TierDraft,
  others: VipTier[],
): { field: "name" | "goal"; message: string } | null {
  const p = parseDraft(d);
  if (p.name.length < 2) return { field: "name", message: "Seviyeye en az 2 harfli bir ad verin." };
  if (p.name.length > 80) return { field: "name", message: "Ad en fazla 80 karakter olabilir." };
  if (others.some((t) => t.name.toLocaleLowerCase("tr") === p.name.toLocaleLowerCase("tr")))
    return { field: "name", message: `«${p.name}» adında bir seviye zaten var.` };
  if (d.useSpend && p.minSpendKurus === 0)
    return { field: "goal", message: "Harcama hedefini girin ya da harcama şartını kapatın." };
  const same = others.find(
    (t) => t.minVisits === p.minVisits && t.minSpendKurus === p.minSpendKurus,
  );
  if (same)
    return { field: "goal", message: `«${same.name}» seviyesi aynı hedefi kullanıyor. Hedefi değiştirin.` };
  return null;
}
