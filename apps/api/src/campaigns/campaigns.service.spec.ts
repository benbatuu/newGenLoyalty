import { CampaignType } from '@prisma/client';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
}));

describe('Campaign segment multiplier gate', () => {
  const tenantId = 'tenant-1';
  const customerIn = 'cust-in';
  const customerOut = 'cust-out';

  function buildService(segmentIds: Set<string>) {
    const { CampaignsService } = require('./campaigns.service') as {
      CampaignsService: new () => import('./campaigns.service').CampaignsService;
    };
    const prisma = {
      campaign: {
        findFirst: jest.fn().mockResolvedValue({
          config: { segmentId: 'seg-1', multiplier: 2 },
        }),
      },
    };
    const crm = {
      listSegmentCustomerIds: jest.fn().mockResolvedValue(segmentIds),
    };
    const service = Object.create(CampaignsService.prototype);
    Object.assign(service, {
      prisma,
      crm,
      getActiveBadges: jest.fn().mockResolvedValue([
        {
          id: 'camp-1',
          type: CampaignType.MULTIPLIER,
          multiplier: 2,
          label: '2x',
        },
      ]),
    });
    return service;
  }

  it('applies multiplier when customer is in segment', async () => {
    const service = buildService(new Set([customerIn]));
    const result = await service.resolveStampMultiplier(tenantId, customerIn);
    expect(result.multiplier).toBe(2);
  });

  it('skips multiplier when customer is outside segment', async () => {
    const service = buildService(new Set([customerIn]));
    const result = await service.resolveStampMultiplier(tenantId, customerOut);
    expect(result.multiplier).toBe(1);
  });
});
