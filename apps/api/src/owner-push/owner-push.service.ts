import { Injectable, Logger } from '@nestjs/common';
import {
  OwnerPushKind,
  PushPlatform,
  Role,
  StampLedgerType,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from './fcm.service';

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: 'Deneme',
  ACTIVE: 'Aktif',
  CANCELLED: 'İptal',
  SUSPENDED: 'Askıda',
};

@Injectable()
export class OwnerPushService {
  private readonly logger = new Logger(OwnerPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async getSettings(userId: string) {
    const pref = await this.ensurePref(userId);
    const deviceCount = await this.prisma.ownerPushDevice.count({
      where: { userId },
    });
    return {
      enabled: pref.enabled,
      deviceCount,
      fcmConfigured: this.fcm.isConfigured(),
    };
  }

  async updateSettings(userId: string, enabled: boolean) {
    await this.prisma.ownerPushPref.upsert({
      where: { userId },
      create: { userId, enabled },
      update: { enabled },
    });
    return this.getSettings(userId);
  }

  async registerDevice(
    userId: string,
    fcmToken: string,
    platform: PushPlatform,
  ) {
    await this.ensurePref(userId);
    await this.prisma.ownerPushDevice.upsert({
      where: { fcmToken },
      create: { userId, fcmToken, platform },
      update: { userId, platform },
    });
    return { ok: true };
  }

  async unregisterDevice(userId: string, fcmToken?: string) {
    if (fcmToken) {
      await this.prisma.ownerPushDevice.deleteMany({
        where: { userId, fcmToken },
      });
    } else {
      await this.prisma.ownerPushDevice.deleteMany({ where: { userId } });
    }
    return { ok: true };
  }

  async notifyTenantAccountChange(
    tenantId: string,
    prev: {
      subscriptionStatus: SubscriptionStatus;
      isActive: boolean;
    },
    next: {
      subscriptionStatus: SubscriptionStatus;
      isActive: boolean;
      name: string;
    },
  ) {
    const parts: string[] = [];
    if (prev.subscriptionStatus !== next.subscriptionStatus) {
      parts.push(
        `Abonelik: ${STATUS_LABEL[prev.subscriptionStatus]} → ${STATUS_LABEL[next.subscriptionStatus]}`,
      );
    }
    if (prev.isActive !== next.isActive) {
      parts.push(next.isActive ? 'Hesap tekrar açıldı' : 'Hesap askıya alındı');
    }
    if (parts.length === 0) return { sent: 0 };

    const body = parts.join(' · ');
    return this.notifyTenantOwners(tenantId, {
      kind: OwnerPushKind.ACCOUNT,
      title: `${next.name} — hesap güncellemesi`,
      body,
      dedupeKey: `account:${next.subscriptionStatus}:${next.isActive}:${Date.now()}`,
      skipDedupe: true,
    });
  }

  async runDailySummaries() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const dedupeKey = this.istanbulDateKey(new Date());
    let sentTotal = 0;

    for (const tenant of tenants) {
      const start = this.istanbulDayStart(new Date());
      const [stamps, redeems, newCustomers] = await Promise.all([
        this.prisma.stampLedger.count({
          where: {
            tenantId: tenant.id,
            type: StampLedgerType.STAMP,
            createdAt: { gte: start },
          },
        }),
        this.prisma.stampLedger.count({
          where: {
            tenantId: tenant.id,
            type: StampLedgerType.REDEEM,
            createdAt: { gte: start },
          },
        }),
        this.prisma.customer.count({
          where: { tenantId: tenant.id, createdAt: { gte: start } },
        }),
      ]);

      const body = `Bugün ${stamps} damga, ${redeems} ödül, ${newCustomers} yeni müşteri.`;
      const result = await this.notifyTenantOwners(tenant.id, {
        kind: OwnerPushKind.DAILY_SUMMARY,
        title: `${tenant.name} — günlük özet`,
        body,
        dedupeKey,
      });
      sentTotal += result.sent;
    }

    return { tenants: tenants.length, sent: sentTotal, dedupeKey };
  }

  async runWeeklySummaries() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const dedupeKey = this.istanbulWeekKey(new Date());
    const weekStart = this.istanbulWeekStart(new Date());
    let sentTotal = 0;

    for (const tenant of tenants) {
      const [stamps, redeems, newCustomers] = await Promise.all([
        this.prisma.stampLedger.count({
          where: {
            tenantId: tenant.id,
            type: StampLedgerType.STAMP,
            createdAt: { gte: weekStart },
          },
        }),
        this.prisma.stampLedger.count({
          where: {
            tenantId: tenant.id,
            type: StampLedgerType.REDEEM,
            createdAt: { gte: weekStart },
          },
        }),
        this.prisma.customer.count({
          where: { tenantId: tenant.id, createdAt: { gte: weekStart } },
        }),
      ]);

      const body = `Bu hafta ${stamps} damga, ${redeems} ödül, ${newCustomers} yeni müşteri.`;
      const result = await this.notifyTenantOwners(tenant.id, {
        kind: OwnerPushKind.WEEKLY_SUMMARY,
        title: `${tenant.name} — haftalık özet`,
        body,
        dedupeKey,
      });
      sentTotal += result.sent;
    }

    return { tenants: tenants.length, sent: sentTotal, dedupeKey };
  }

  private async notifyTenantOwners(
    tenantId: string,
    payload: {
      kind: OwnerPushKind;
      title: string;
      body: string;
      dedupeKey: string;
      skipDedupe?: boolean;
    },
  ) {
    const owners = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: Role.STORE_OWNER,
        isActive: true,
      },
      select: { id: true },
    });

    let sent = 0;
    for (const owner of owners) {
      const result = await this.sendToOwner(owner.id, payload);
      sent += result.sent;
    }
    return { sent, owners: owners.length };
  }

  private async sendToOwner(
    userId: string,
    payload: {
      kind: OwnerPushKind;
      title: string;
      body: string;
      dedupeKey: string;
      skipDedupe?: boolean;
    },
  ) {
    const pref = await this.ensurePref(userId);
    if (!pref.enabled) {
      return { sent: 0, skipped: 'disabled' as const };
    }

    if (!payload.skipDedupe) {
      const existing = await this.prisma.ownerPushLog.findUnique({
        where: {
          userId_kind_dedupeKey: {
            userId,
            kind: payload.kind,
            dedupeKey: payload.dedupeKey,
          },
        },
      });
      if (existing) return { sent: 0, skipped: 'dedupe' as const };
    }

    const devices = await this.prisma.ownerPushDevice.findMany({
      where: { userId },
      select: { fcmToken: true },
    });
    if (devices.length === 0) {
      return { sent: 0, skipped: 'no_device' as const };
    }

    const tokens = devices.map((d) => d.fcmToken);
    const result = await this.fcm.sendToTokens(tokens, {
      title: payload.title,
      body: payload.body,
      data: {
        kind: payload.kind,
      },
    });

    if (result.invalidTokens.length > 0) {
      await this.prisma.ownerPushDevice.deleteMany({
        where: { fcmToken: { in: result.invalidTokens } },
      });
    }

    if (result.sent > 0 && !payload.skipDedupe) {
      await this.prisma.ownerPushLog.create({
        data: {
          userId,
          kind: payload.kind,
          dedupeKey: payload.dedupeKey,
        },
      });
    }

    return { sent: result.sent };
  }

  private async ensurePref(userId: string) {
    return this.prisma.ownerPushPref.upsert({
      where: { userId },
      create: { userId, enabled: true },
      update: {},
    });
  }

  private istanbulDateKey(date: Date): string {
    return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  }

  private istanbulDayStart(date: Date): Date {
    const key = this.istanbulDateKey(date);
    return new Date(`${key}T00:00:00+03:00`);
  }

  private istanbulWeekKey(date: Date): string {
    const d = new Date(
      date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }),
    );
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return this.istanbulDateKey(d);
  }

  private istanbulWeekStart(date: Date): Date {
    const key = this.istanbulWeekKey(date);
    return new Date(`${key}T00:00:00+03:00`);
  }
}
