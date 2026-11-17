import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionLifecycleService } from '../tenants/subscription-lifecycle.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: { findUnique: jest.fn() },
    refreshToken: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars-long',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_ACCESS_EXPIRES_IN: '15m',
        ADMIN_URL: 'http://localhost:3002',
      };
      return map[key] ?? fallback;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret-min-32-chars-long';
      throw new Error(`missing ${key}`);
    }),
  };
  const subscription = {
    assertCanAuthenticate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      subscription as unknown as SubscriptionLifecycleService,
    );
  });

  it('login rejects unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@test.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rejects wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'x@test.com',
      passwordHash: 'hash',
      isActive: true,
      tenantId: 't1',
      role: Role.STORE_OWNER,
      name: 'Owner',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: 'x@test.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login returns tokens and subscription snapshot', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'owner@test.com',
      passwordHash: 'hash',
      isActive: true,
      tenantId: 't1',
      role: Role.STORE_OWNER,
      name: 'Owner',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    subscription.assertCanAuthenticate.mockResolvedValue({
      status: 'ACTIVE',
      needsReactivation: false,
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'owner@test.com',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toMatch(/^[a-f0-9]{96}$/);
    expect(result.user.email).toBe('owner@test.com');
    expect(subscription.assertCanAuthenticate).toHaveBeenCalledWith(
      't1',
      Role.STORE_OWNER,
    );
    expect(result.subscription?.status).toBe('ACTIVE');
  });

  it('refresh rejects expired token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
