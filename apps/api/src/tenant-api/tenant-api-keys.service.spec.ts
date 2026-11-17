import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { TenantApiKeysService } from './tenant-api-keys.service';

describe('TenantApiKeysService', () => {
  const prisma = {
    tenant: { findUniqueOrThrow: jest.fn() },
    tenantApiKey: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const plans = {
    getTenantPlan: jest.fn(),
  };
  let service: TenantApiKeysService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantApiKeysService(
      prisma as never,
      plans as never,
    );
    prisma.tenant.findUniqueOrThrow.mockResolvedValue({ planCode: 'enterprise' });
    plans.getTenantPlan.mockResolvedValue({
      planCode: 'enterprise',
      features: ['all'],
    });
  });

  it('create returns one-time api key with ngl_ prefix', async () => {
    prisma.tenantApiKey.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'k1',
        label: data.label,
        keyPrefix: data.keyPrefix,
      }),
    );

    const result = await service.create('t1', 'POS webhook');

    expect(result.apiKey).toMatch(/^ngl_[a-f0-9]{48}$/);
    expect(result.keyPrefix).toBe(result.apiKey.slice(0, 12));
    const hash = createHash('sha256').update(result.apiKey).digest('hex');
    expect(prisma.tenantApiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          keyHash: hash,
        }),
      }),
    );
  });

  it('revoke throws when key missing', async () => {
    prisma.tenantApiKey.findFirst.mockResolvedValue(null);
    await expect(service.revoke('t1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('list requires enterprise api feature', async () => {
    plans.getTenantPlan.mockResolvedValue({
      planCode: 'starter',
      features: [],
    });
    await expect(service.list('t1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('validateKey updates lastUsedAt', async () => {
    const raw = 'ngl_' + 'a'.repeat(48);
    const hash = createHash('sha256').update(raw).digest('hex');
    prisma.tenantApiKey.findFirst.mockResolvedValue({
      id: 'k1',
      tenantId: 't1',
    });
    prisma.tenantApiKey.update.mockResolvedValue({});

    const result = await service.validateKey(raw);

    expect(result).toEqual({ tenantId: 't1', keyId: 'k1' });
    expect(prisma.tenantApiKey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyHash: hash, isActive: true } }),
    );
    expect(prisma.tenantApiKey.update).toHaveBeenCalled();
  });
});
