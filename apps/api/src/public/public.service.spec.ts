jest.mock('../stamps/stamps.service', () => ({
  StampsService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../wallet/wallet.service', () => ({
  WalletService: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { TenantsService } from '../tenants/tenants.service';
import { StampsService } from '../stamps/stamps.service';
import { WalletService } from '../wallet/wallet.service';
import { PiiService } from '../pii/pii.service';

describe('PublicService portalStatus', () => {
  let service: PublicService;
  const prisma = {
    tenant: { findUnique: jest.fn() },
    customer: { findFirst: jest.fn() },
    stampLedger: { findMany: jest.fn() },
  };
  const pii = {
    phoneLookupFilter: jest.fn((tenantId: string) => ({
      tenantId,
      phoneHash: 'mock-hash',
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantsService, useValue: {} },
        { provide: PlansService, useValue: { listPublic: jest.fn() } },
        { provide: StampsService, useValue: {} },
        { provide: WalletService, useValue: {} },
        { provide: PiiService, useValue: pii },
      ],
    }).compile();
    service = module.get(PublicService);
    jest.clearAllMocks();
  });

  it('returns programs and history for registered customer', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Demo Kafe',
      slug: 'demo',
      isActive: true,
      rewardRule: { stampsRequired: 10, rewardLabel: 'Kahve' },
    });
    prisma.customer.findFirst.mockResolvedValue({
      id: 'c1',
      stampCount: 3,
      rewardReady: false,
      vipTier: null,
      customerPrograms: [
        {
          programId: 'p1',
          balance: 120,
          balances: null,
          rewardReady: false,
          program: { id: 'p1', name: 'Puan', type: 'POINT_CARD', config: {} },
        },
      ],
    });
    prisma.stampLedger.findMany.mockResolvedValue([
      { type: 'STAMP', amount: 1, note: null, createdAt: new Date() },
    ]);

    const result = await service.portalStatus('demo', '05551234567');
    expect(pii.phoneLookupFilter).toHaveBeenCalledWith('t1', '05551234567');
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].type).toBe('POINT_CARD');
    expect(result.history).toHaveLength(1);
    expect(result.tenantName).toBe('Demo Kafe');
  });
});
