import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  CampaignStatus,
  CampaignType,
  Prisma,
  StampLedgerType,
} from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { planHasFeature } from '@ngl/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { QueueService } from '../queue/queue.service';
import { OwnerPushService } from '../owner-push/owner-push.service';
import { SmsService } from '../sms/sms.service';
import { CrmService } from '../crm/crm.service';
import { WalletService } from '../wallet/wallet.service';
import { customerPhonePlain } from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';
import type {
  ActiveCampaignBadge,
  MultiplierCampaignConfig,
  ScheduledBroadcastConfig,
  WinBackCampaignConfig,
} from './campaign.types';
import type { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

const TR_TZ = 'Europe/Istanbul';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly queue: QueueService,
    private readonly ownerPush: OwnerPushService,
    private readonly sms: SmsService,
    private readonly crm: CrmService,
    @Inject(forwardRef(() => WalletService))
    private readonly wallet: WalletService,
    private readonly pii: PiiService,
  ) {}

  private async assertCampaignFeature(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.getTenantPlan(tenant.planCode);
    if (!planHasFeature(plan.planCode, 'campaigns', plan.features)) {
      throw new ForbiddenException(
        'Kampanya özelliği paketinizde yok. Growth veya üstü pakete geçin.',
      );
    }
  }

  private defaultConfig(type: CampaignType): Prisma.InputJsonValue {
    switch (type) {
      case CampaignType.MULTIPLIER:
        return {
          multiplier: 2,
          daysOfWeek: [6],
          label: '2x damga',
        } satisfies MultiplierCampaignConfig;
      case CampaignType.WIN_BACK:
        return {
          inactiveDays: 30,
          message: 'Sizi özledik! Bu hafta gelin, sürpriz sizi bekliyor.',
          channel: 'OWNER_PUSH',
        } satisfies WinBackCampaignConfig;
      case CampaignType.SCHEDULED_BROADCAST:
        return {
          message: '',
          scheduledAt: new Date().toISOString(),
        };
      default:
        return {};
    }
  }

  private serialize(row: {
    id: string;
    tenantId: string;
    name: string;
    type: CampaignType;
    status: CampaignStatus;
    config: unknown;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...row,
      config: row.config as Record<string, unknown>,
    };
  }

  async list(tenantId: string) {
    await this.assertCampaignFeature(tenantId);
    const rows = await this.prisma.campaign.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  /** Sayfa açılışı için tek istek: kampanyalar + müşteri grupları (paket kontrolü bir kez) */
  async overview(tenantId: string) {
    const [campaigns, segments] = await Promise.all([
      this.list(tenantId),
      this.prisma.segment.findMany({
        where: { tenantId },
        select: { id: true, name: true, isActive: true },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    ]);
    return { campaigns, segments };
  }

  async getActiveBadges(tenantId: string): Promise<ActiveCampaignBadge[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { planCode: true },
    });
    if (!tenant) return [];

    const plan = await this.plans.getTenantPlan(tenant.planCode);
    if (!planHasFeature(plan.planCode, 'campaigns', plan.features)) {
      return [];
    }

    const now = new Date();
    const rows = await this.prisma.campaign.findMany({
      where: {
        tenantId,
        status: CampaignStatus.ACTIVE,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
    });

    return rows
      .filter((c) => this.isCampaignApplicableNow(c))
      .map((c) => {
        if (c.type === CampaignType.MULTIPLIER) {
          const cfg = c.config as MultiplierCampaignConfig;
          return {
            id: c.id,
            name: c.name,
            type: c.type,
            label: cfg.label ?? `${cfg.multiplier}x damga`,
            multiplier: cfg.multiplier,
          };
        }
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          label: c.name,
        };
      });
  }

  private isCampaignApplicableNow(campaign: {
    type: CampaignType;
    config: unknown;
    startsAt: Date | null;
    endsAt: Date | null;
  }): boolean {
    const now = new Date();
    if (campaign.startsAt && campaign.startsAt > now) return false;
    if (campaign.endsAt && campaign.endsAt < now) return false;

    if (campaign.type === CampaignType.MULTIPLIER) {
      const cfg = campaign.config as MultiplierCampaignConfig;
      if (cfg.daysOfWeek?.length) {
        const day = this.calendarDayInTz(now);
        if (!cfg.daysOfWeek.includes(day)) return false;
      }
      if (cfg.startTime && cfg.endTime) {
        const hhmm = this.timeInTz(now);
        if (hhmm < cfg.startTime || hhmm >= cfg.endTime) return false;
      }
    }
    return true;
  }

  private timeInTz(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TR_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private calendarDayInTz(date: Date): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TR_TZ,
      weekday: 'short',
    });
    const wd = fmt.format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[wd] ?? date.getDay();
  }

  /** Aktif çarpan kampanyası — damga motoru ile birleşir (yüksek çarpan kazanır) */
  async resolveStampMultiplier(
    tenantId: string,
    customerId?: string,
  ): Promise<{
    multiplier: number;
    campaignId?: string;
    label?: string;
  }> {
    const badges = await this.getActiveBadges(tenantId);
    const mult = badges.find((b) => b.type === CampaignType.MULTIPLIER);
    if (!mult?.multiplier || mult.multiplier < 2) {
      return { multiplier: 1 };
    }

    if (customerId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: mult.id, tenantId },
        select: { config: true },
      });
      const cfg = campaign?.config as MultiplierCampaignConfig | undefined;
      if (cfg?.segmentId) {
        const segmentIds = await this.crm.listSegmentCustomerIds(
          tenantId,
          cfg.segmentId,
        );
        if (!segmentIds.has(customerId)) {
          return { multiplier: 1 };
        }
      }
    }

    return {
      multiplier: mult.multiplier,
      campaignId: mult.id,
      label: mult.label,
    };
  }

  /** Ürün çarpanı ile kampanya çarpanını birleştir */
  applyCampaignToDelta(
    baseDelta: number,
    campaignMultiplier: number,
  ): number {
    if (campaignMultiplier <= 1) return baseDelta;
    return Math.max(baseDelta, campaignMultiplier);
  }

  async create(tenantId: string, dto: CreateCampaignDto) {
    await this.assertCampaignFeature(tenantId);
    const type = dto.type as CampaignType;
    const row = await this.prisma.campaign.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        type,
        status: dto.activate ? CampaignStatus.ACTIVE : CampaignStatus.DRAFT,
        config: (dto.config ?? this.defaultConfig(type)) as Prisma.InputJsonValue,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
    return this.serialize(row);
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    const current = await this.getOwned(tenantId, id);
    if (dto.activate && current.status === CampaignStatus.ENDED) {
      throw new BadRequestException('Bitmiş kampanya tekrar açılamaz');
    }
    const row = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.activate ? { status: CampaignStatus.ACTIVE } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.config !== undefined
          ? { config: dto.config as Prisma.InputJsonValue }
          : {}),
        ...(dto.startsAt !== undefined
          ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }
          : {}),
        ...(dto.endsAt !== undefined
          ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }
          : {}),
      },
    });
    return this.serialize(row);
  }

  async activate(tenantId: string, id: string) {
    const row = await this.getOwned(tenantId, id);
    if (row.status === CampaignStatus.ENDED) {
      throw new BadRequestException('Bitmiş kampanya tekrar açılamaz');
    }
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });
    return this.serialize(updated);
  }

  async pause(tenantId: string, id: string) {
    await this.getOwned(tenantId, id);
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
    return this.serialize(updated);
  }

  async remove(tenantId: string, id: string) {
    await this.getOwned(tenantId, id);
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }

  private async getOwned(tenantId: string, id: string) {
    await this.assertCampaignFeature(tenantId);
    const row = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Kampanya bulunamadı');
    return row;
  }

  /** BullMQ worker entry */
  async processQueuedRun(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId, status: CampaignStatus.ACTIVE },
    });
    if (!campaign) return;

    if (campaign.type === CampaignType.WIN_BACK) {
      await this.runWinBack(campaign.id, tenantId);
    }
    if (campaign.type === CampaignType.SCHEDULED_BROADCAST) {
      await this.runScheduledBroadcast(campaign.id, tenantId);
    }
  }

  /** Her dakika — zamanı gelen Wallet duyuruları */
  @Cron('* * * * *', { timeZone: TR_TZ })
  async cronScheduledBroadcasts() {
    const now = new Date();
    const due = await this.prisma.campaign.findMany({
      where: {
        type: CampaignType.SCHEDULED_BROADCAST,
        status: CampaignStatus.ACTIVE,
      },
    });

    for (const c of due) {
      const cfg = c.config as ScheduledBroadcastConfig;
      const at = cfg.scheduledAt ? new Date(cfg.scheduledAt) : null;
      if (!at || at > now) continue;

      const enqueued = await this.queue.enqueueCampaignRun({
        tenantId: c.tenantId,
        campaignId: c.id,
        triggeredAt: now.toISOString(),
      });
      if (!enqueued) {
        await this.runScheduledBroadcast(c.id, c.tenantId);
      }
    }
  }

  private async runScheduledBroadcast(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    const cfg = campaign.config as ScheduledBroadcastConfig;
    const message = cfg.message?.trim();
    if (!message) return;

    const already = await this.prisma.campaignRun.findFirst({
      where: { campaignId, status: 'COMPLETED' },
    });
    if (already) return;

    try {
      const result = await this.wallet.broadcastNotification(tenantId, message);
      await this.prisma.campaignRun.create({
        data: {
          campaignId,
          status: 'COMPLETED',
          metadata: {
            message,
            synced: result.synced,
            devices: result.devices,
          },
        },
      });
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.ENDED },
      });
      this.logger.log(
        `Scheduled broadcast ${campaignId}: ${result.devices} cihaz (tenant=${tenantId})`,
      );
    } catch (err) {
      await this.prisma.campaignRun.create({
        data: {
          campaignId,
          status: 'FAILED',
          metadata: { error: (err as Error).message },
        },
      });
      this.logger.warn(
        `Scheduled broadcast failed ${campaignId}: ${(err as Error).message}`,
      );
    }
  }

  @Cron('0 9 * * *', { timeZone: TR_TZ })
  async cronWinBackDaily() {
    const campaigns = await this.prisma.campaign.findMany({
      where: { type: CampaignType.WIN_BACK, status: CampaignStatus.ACTIVE },
      select: { id: true, tenantId: true },
    });

    for (const c of campaigns) {
      const enqueued = await this.queue.enqueueCampaignRun({
        tenantId: c.tenantId,
        campaignId: c.id,
        triggeredAt: new Date().toISOString(),
      });
      if (!enqueued) {
        await this.runWinBack(c.id, c.tenantId);
      }
    }
  }

  private async runWinBack(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    const cfg = campaign.config as WinBackCampaignConfig;
    const cutoff = new Date(
      Date.now() - cfg.inactiveDays * 24 * 60 * 60 * 1000,
    );

    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: {
        id: true,
        phone: true,
        phoneEnc: true,
        phoneLast4: true,
        smsOptOut: true,
        stampLedger: {
          where: { type: StampLedgerType.STAMP },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    let inactive = customers.filter((c) => {
      const last = c.stampLedger[0]?.createdAt;
      if (!last) return true;
      return last < cutoff;
    });

    if (cfg.segmentId) {
      const segmentIds = await this.crm.listSegmentCustomerIds(
        tenantId,
        cfg.segmentId,
      );
      inactive = inactive.filter((c) => segmentIds.has(c.id));
    }

    if (inactive.length === 0) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const dateKey = new Date().toLocaleDateString('sv-SE', {
      timeZone: TR_TZ,
    });
    const message =
      cfg.message?.trim() ||
      `Sizi özledik! ${cfg.inactiveDays} gündür görüşemedik.`;

    let ownerPushSent = 0;
    let smsSent = 0;
    let smsSkippedOptOut = 0;
    let smsFailed = 0;
    const channel = cfg.channel ?? 'OWNER_PUSH';

    if (channel === 'OWNER_PUSH' || channel === 'SMS') {
      if (channel === 'OWNER_PUSH') {
        try {
          const push = await this.ownerPush.notifyCampaignAlert(
            tenantId,
            `${tenant?.name ?? 'Kafe'} — win-back`,
            `${inactive.length} uyuyan müşteri (${cfg.inactiveDays}+ gün). ${message}`,
            `winback:${campaignId}:${dateKey}`,
          );
          ownerPushSent = push.sent;
        } catch (err) {
          this.logger.warn(
            `Win-back owner push failed ${campaignId}: ${(err as Error).message}`,
          );
        }
      }

      if (channel === 'SMS') {
        for (const customer of inactive) {
          if (customer.smsOptOut) {
            smsSkippedOptOut += 1;
            continue;
          }
          try {
            const result = await this.sms.send({
              toPhone: customerPhonePlain(this.pii, customer),
              body: message,
              tenantId,
            });
            if (result.ok) smsSent += 1;
            else smsFailed += 1;
          } catch (err) {
            smsFailed += 1;
            this.logger.warn(
              `Win-back SMS failed ${customer.id}: ${(err as Error).message}`,
            );
          }
        }
      }
    }

    await this.prisma.campaignRun.create({
      data: {
        campaignId,
        status: 'COMPLETED',
        metadata: {
          inactiveCount: inactive.length,
          samplePhones: inactive
            .slice(0, 5)
            .map((c) => this.pii.phoneMasked(c)),
          channel,
          message,
          segmentId: cfg.segmentId ?? null,
          ownerPushSent,
          smsSent,
          smsSkippedOptOut,
          smsFailed,
        },
      },
    });

    this.logger.log(
      `Win-back ${campaignId}: ${inactive.length} uyuyan müşteri (tenant=${tenantId}, push=${ownerPushSent}, sms=${smsSent})`,
    );
  }
}
