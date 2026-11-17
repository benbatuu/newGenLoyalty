/** Marketing site — public tier order (shared paket ile senkron) */
export { PLAN_CODES as PUBLIC_PLAN_CODES } from '@ngl/shared';

import { PLAN_CODES } from '@ngl/shared';

export type PublicPlanCode =
  (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

export type PublicPlan = {
  code: string;
  labelTr: string;
  labelEn: string | null;
  priceTry: number;
  maxPrograms: number;
  maxBranches: number;
  features: string[];
  badgeTr: string | null;
  badgeEn: string | null;
  noteTr: string | null;
  noteEn: string | null;
  includesTr: string[];
  includesEn: string[];
};

export type DisplayPlan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  badge: string;
  note: string;
  includes: string[];
  cta: string;
  featured: boolean;
};

type StaticPlanFallback = {
  id: string;
  name: string;
  price: string;
  period: string;
  badge: string;
  note: string;
  includes: string[];
  cta?: string;
};

function apiBase(): string {
  const raw =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  return raw.replace(/\/$/, "");
}

export async function fetchPublicPlans(): Promise<PublicPlan[] | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/public/plans`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicPlan[];
  } catch {
    return null;
  }
}

export function formatPlanPrice(priceTry: number, locale: string): string {
  if (priceTry <= 0) {
    return locale === "tr" ? "Özel fiyat" : "Custom";
  }
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(priceTry);
}

/** Yearly = 10 months (2 months free) */
export function yearlyFromMonthly(monthlyTry: number): number {
  if (monthlyTry <= 0) return 0;
  return monthlyTry * 10;
}

function parseStaticPrice(price: string): number {
  const digits = price.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function orderPublicPlans(plans: PublicPlan[]): PublicPlan[] {
  const byCode = new Map(plans.map((p) => [p.code, p]));
  const codes = Object.values(PLAN_CODES).filter(
    (c) => c !== PLAN_CODES.ENTERPRISE,
  );
  return codes.map((code) => byCode.get(code)).filter(
    (p): p is PublicPlan => Boolean(p),
  );
}

export function resolveDisplayPlans(
  locale: string,
  dbPlans: PublicPlan[] | null,
  staticPlans: StaticPlanFallback[],
  ctaLabel: string,
): DisplayPlan[] {
  const featuredCode = PLAN_CODES.GROWTH;

  const orderedStatic = Object.values(PLAN_CODES)
    .filter((c) => c !== PLAN_CODES.ENTERPRISE)
    .map((code) => staticPlans.find((p) => p.id === code))
    .filter((p): p is StaticPlanFallback => Boolean(p));

  const sourcePlans = dbPlans?.length
    ? orderPublicPlans(dbPlans)
    : orderedStatic.length
      ? orderedStatic
      : staticPlans.filter(
          (p) =>
            (Object.values(PLAN_CODES) as string[]).includes(p.id) &&
            p.id !== PLAN_CODES.ENTERPRISE,
        );

  if (dbPlans?.length) {
    const ordered = orderPublicPlans(dbPlans);
    if (ordered.length) {
      return ordered.map((p) => ({
        id: p.code,
        name: locale === "tr" ? p.labelTr : p.labelEn || p.labelTr,
        priceMonthly: p.priceTry,
        priceYearly: yearlyFromMonthly(p.priceTry),
        badge:
          (locale === "tr" ? p.badgeTr : p.badgeEn || p.badgeTr) ||
          (locale === "tr" ? "Paket" : "Plan"),
        note:
          (locale === "tr" ? p.noteTr : p.noteEn || p.noteTr) ||
          (locale === "tr"
            ? `${p.maxPrograms} sadakat kartına kadar`
            : `Up to ${p.maxPrograms} loyalty cards`),
        includes:
          locale === "tr"
            ? p.includesTr
            : p.includesEn.length
              ? p.includesEn
              : p.includesTr,
        cta: ctaLabel,
        featured: p.code === featuredCode,
      }));
    }
  }

  return sourcePlans.map((plan) => {
    const staticPlan = plan as StaticPlanFallback;
    const monthly = parseStaticPrice(staticPlan.price);
    return {
      id: staticPlan.id,
      name: staticPlan.name,
      priceMonthly: monthly,
      priceYearly: yearlyFromMonthly(monthly),
      badge: staticPlan.badge,
      note: staticPlan.note,
      includes: staticPlan.includes,
      cta: staticPlan.cta || ctaLabel,
      featured: staticPlan.id === featuredCode,
    };
  });
}
