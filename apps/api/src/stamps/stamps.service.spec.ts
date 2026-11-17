jest.mock('../wallet/wallet.service', () => ({
  WalletService: jest.fn().mockImplementation(() => ({})),
}));

import { ProgramType } from '@prisma/client';
import { LoyaltyEngineService } from '../loyalty/loyalty-engine.service';

describe('StampsService reward meta (via loyalty engine)', () => {
  it('maxThreshold aligns with stamp tier selection', () => {
    const engine = new LoyaltyEngineService({} as never, {} as never);
    expect(
      engine.maxThreshold({ tiers: [{ threshold: 8 }, { threshold: 10 }] }, 6),
    ).toBe(10);
  });

  it('detects multi-stamp programs', () => {
    const engine = new LoyaltyEngineService({} as never, {} as never);
    expect(engine.isMultiStamp({ type: ProgramType.MULTI_STAMP })).toBe(true);
  });
});
