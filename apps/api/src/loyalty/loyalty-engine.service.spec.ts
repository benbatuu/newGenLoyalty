import { BadRequestException } from '@nestjs/common';
import { ProgramType, StampSource } from '@prisma/client';
import { LoyaltyEngineService } from './loyalty-engine.service';

describe('LoyaltyEngineService', () => {
  const programs = {
    ensurePrimaryProgram: jest.fn(),
    ensureCustomerProgram: jest.fn(),
    syncFromRewardRule: jest.fn(),
  };
  const multiStamp = {
    isLanesMode: jest.fn(),
    resolveStampDelta: jest.fn(),
  };
  let service: LoyaltyEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LoyaltyEngineService(
      programs as never,
      multiStamp as never,
    );
  });

  it('assertCashierSource allows cashier source', () => {
    expect(() =>
      service.assertCashierSource(StampSource.cashier),
    ).not.toThrow();
  });

  it('maxThreshold uses tier max or fallback', () => {
    expect(
      service.maxThreshold({ tiers: [{ threshold: 5 }, { threshold: 12 }] }, 10),
    ).toBe(12);
    expect(service.maxThreshold({ tiers: [] }, 10)).toBe(10);
  });

  it('isMultiStamp detects program type', () => {
    expect(
      service.isMultiStamp({ type: ProgramType.MULTI_STAMP }),
    ).toBe(true);
    expect(service.isMultiStamp({ type: ProgramType.POINT_CARD })).toBe(false);
  });
});
