import { DEFAULT_CASHBACK_CARD_CONFIG, DEFAULT_DISCOUNT_CARD_CONFIG, DEFAULT_POINT_CARD_CONFIG } from './loyalty.types';
import { computeProgramQuota, PLAN_DEFINITIONS } from '@ngl/shared';

describe('PointCardConfig', () => {
  it('defaults to 1 TL = 1 puan', () => {
    expect(DEFAULT_POINT_CARD_CONFIG.earnRate.default).toBe(1);
    expect(DEFAULT_POINT_CARD_CONFIG.redeemRules.length).toBeGreaterThan(0);
  });

  it('calculates base points from kuruş', () => {
    const amountKurus = 4750;
    const pts = Math.floor((amountKurus / 100) * DEFAULT_POINT_CARD_CONFIG.earnRate.default);
    expect(pts).toBe(47);
  });
});

describe('DiscountCardConfig', () => {
  it('defaults to percent discount', () => {
    expect(DEFAULT_DISCOUNT_CARD_CONFIG.discountType).toBe('PERCENT');
    expect(DEFAULT_DISCOUNT_CARD_CONFIG.value).toBeGreaterThan(0);
  });

  it('tier trigger supports visits spend vip enum', () => {
    expect(['VISITS', 'SPEND', 'VIP']).toContain(DEFAULT_DISCOUNT_CARD_CONFIG.tierTrigger);
  });
});

describe('Campaign multiplier on points', () => {
  it('multiplies scaled points by campaign factor', () => {
    const base = 47;
    const campMult = 2;
    expect(Math.floor(base * campMult)).toBe(94);
  });
});

describe('CashbackCardConfig', () => {
  it('defaults to percent earn', () => {
    expect(DEFAULT_CASHBACK_CARD_CONFIG.earnPercent).toBe(10);
    expect(DEFAULT_CASHBACK_CARD_CONFIG.minRedeemKurus).toBeGreaterThan(0);
  });

  it('calculates cashback from kuruş spend', () => {
    const amountKurus = 50_000;
    const earn = Math.floor(
      (amountKurus * DEFAULT_CASHBACK_CARD_CONFIG.earnPercent) / 100,
    );
    expect(earn).toBe(5000);
  });
});

describe('Program type catalog', () => {
  it('shows cashback locked on growth plan', () => {
    const quota = computeProgramQuota('growth', [], PLAN_DEFINITIONS.growth);
    const cashback = quota.typeCatalog.find((t) => t.type === 'CASHBACK_CARD');
    expect(cashback).toBeDefined();
    expect(cashback!.locked).toBe(true);
    expect(cashback!.canCreate).toBe(false);
    expect(cashback!.upgradePlanCode).toBe('pro');
  });

  it('allows cashback create on pro plan', () => {
    const quota = computeProgramQuota('pro', [], PLAN_DEFINITIONS.pro);
    const cashback = quota.typeCatalog.find((t) => t.type === 'CASHBACK_CARD');
    expect(cashback!.locked).toBe(false);
    expect(cashback!.canCreate).toBe(true);
  });
});
