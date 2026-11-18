import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, StampLedgerType, SubscriptionStatus } from '@prisma/client';
import { sanitizeInviteLayout } from '../wallet/invite-page';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { BranchPolicyService } from '../branches/branch-policy.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { LoyaltyEngineService } from '../loyalty/loyalty-engine.service';
import { OwnerPushService } from '../owner-push/owner-push.service';
import { WalletService } from '../wallet/wallet.service';
import { CrmService } from '../crm/crm.service';
import { stripBroadcastStamps } from '../wallet/broadcast-message.util';
import { AssetsService, type AssetSlot } from './assets.service';
import {
  CreateTenantDto,
  InviteCashierDto,
  OwnerFeedbackDto,
  UpdateRewardRuleDto,
  UpdateTenantAdminDto,
  UpdateTenantProfileDto,
} from './dto/tenants.dto';

function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

/** Bu alanlar Wallet .pkpass tasarımını etkilemez — sync atlanabilir */
const INVITE_ONLY_KEYS = new Set([
  'collectCustomerName',
  'collectCustomerBirthday',
  'birthdayGiftEnabled',
  'birthdayMessage',
  'inviteHeadline',
  'inviteLayout',
  'inviteSubtitle',
  'inviteCtaHint',
  'inviteBgColor',
  'inviteCardColor',
  'inviteStatusText',
  'inviteAppleBtnLabel',
  'inviteGoogleBtnLabel',
  'inviteFormTitle',
  'inviteLegalText',
  'invitePolicies',
]);

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly assets: AssetsService,
    private readonly auth: AuthService,
    private readonly ownerPush: OwnerPushService,
    private readonly loyaltyEngine: LoyaltyEngineService,
    private readonly branchPolicy: BranchPolicyService,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
    private readonly crm: CrmService,
  ) {}

  list() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { customers: true, users: true } },
        rewardRule: true,
      },
    });
  }

  async platformOverview() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [
      tenants,
      stampsToday,
      redeemsToday,
      applePassCount,
    ] = await Promise.all([
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { customers: true, users: true, passes: true } },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          type: StampLedgerType.STAMP,
          createdAt: { gte: start },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          type: StampLedgerType.REDEEM,
          createdAt: { gte: start },
        },
      }),
      this.prisma.pass.count({ where: { platform: 'APPLE' } }),
    ]);

    const since14 = new Date(start);
    since14.setDate(since14.getDate() - 13);
    const [stampRows, redeemRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ d: Date; n: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS d, count(*)::bigint AS n
        FROM "StampLedger"
        WHERE type = 'STAMP' AND "createdAt" >= ${since14}
        GROUP BY d ORDER BY d`,
      this.prisma.$queryRaw<Array<{ d: Date; n: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS d, count(*)::bigint AS n
        FROM "StampLedger"
        WHERE type = 'REDEEM' AND "createdAt" >= ${since14}
        GROUP BY d ORDER BY d`,
    ]);
    const dayKey = (d: Date) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };
    const stampMap = new Map(stampRows.map((r) => [dayKey(r.d), Number(r.n)]));
    const redeemMap = new Map(redeemRows.map((r) => [dayKey(r.d), Number(r.n)]));
    const signupMap = new Map<string, number>();
    const series: Array<{ date: string; stamps: number; redeems: number; signups: number }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since14);
      d.setDate(since14.getDate() + i);
      const k = dayKey(d);
      series.push({ date: k, stamps: stampMap.get(k) ?? 0, redeems: redeemMap.get(k) ?? 0, signups: 0 });
    }

    const byStatus = {
      TRIAL: 0,
      ACTIVE: 0,
      CANCELLED: 0,
      SUSPENDED: 0,
    };
    let activeTenants = 0;
    let frozenTenants = 0;
    let totalCustomers = 0;
    let totalUsers = 0;
    let estimatedMrr = 0;

    const byPlanMap = new Map<string, { plan: string; tenants: number; activeTenants: number; mrr: number }>();
    const trialEnding: Array<{ id: string; name: string; slug: string; daysLeft: number; customers: number }> = [];
    const nowMs = Date.now();
    const DAY = 86_400_000;
    for (const t of tenants) {
      const pk = t.planCode;
      const row = byPlanMap.get(pk) ?? { plan: pk, tenants: 0, activeTenants: 0, mrr: 0 };
      row.tenants += 1;
      if (t.isActive) row.activeTenants += 1;
      if (t.subscriptionStatus === SubscriptionStatus.ACTIVE) row.mrr += t.planPriceTry;
      byPlanMap.set(pk, row);
      const sk = dayKey(t.createdAt);
      signupMap.set(sk, (signupMap.get(sk) ?? 0) + 1);
      if (t.subscriptionStatus === SubscriptionStatus.TRIAL) {
        const endsAt = new Date(t.createdAt).getTime() + 14 * DAY;
        const daysLeft = Math.ceil((endsAt - nowMs) / DAY);
        if (daysLeft >= 0 && daysLeft <= 7) {
          trialEnding.push({ id: t.id, name: t.name, slug: t.slug, daysLeft, customers: t._count.customers });
        }
      }
      byStatus[t.subscriptionStatus] += 1;
      if (t.isActive) activeTenants += 1;
      else frozenTenants += 1;
      totalCustomers += t._count.customers;
      totalUsers += t._count.users;
      if (t.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        estimatedMrr += t.planPriceTry;
      }
    }

    const recentTenants = tenants.slice(0, 6).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      subscriptionStatus: t.subscriptionStatus,
      isActive: t.isActive,
      customers: t._count.customers,
      createdAt: t.createdAt,
    }));

    const needsAttention = tenants
      .filter(
        (t) =>
          !t.isActive ||
          t.subscriptionStatus === SubscriptionStatus.SUSPENDED ||
          t.subscriptionStatus === SubscriptionStatus.CANCELLED ||
          (t.subscriptionStatus === SubscriptionStatus.TRIAL &&
            t._count.customers === 0),
      )
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        subscriptionStatus: t.subscriptionStatus,
        isActive: t.isActive,
        customers: t._count.customers,
        reason: !t.isActive
          ? 'Dondurulmuş'
          : t.subscriptionStatus === SubscriptionStatus.SUSPENDED
            ? 'Askıda'
            : t.subscriptionStatus === SubscriptionStatus.CANCELLED
              ? 'İptal'
              : 'Deneme · müşteri yok',
      }));

    for (const s of series) s.signups = signupMap.get(s.date) ?? 0;

    const topTenants = [...tenants]
      .sort((a, b) => b._count.customers - a._count.customers)
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug, customers: t._count.customers, plan: t.planCode }));

    const paidShare = tenants.length ? Math.round((byStatus.ACTIVE / tenants.length) * 100) : 0;
    const churnShare = tenants.length ? Math.round((byStatus.CANCELLED / tenants.length) * 100) : 0;

    return {
      reports: {
        series,
        byPlan: [...byPlanMap.values()].sort((a, b) => b.tenants - a.tenants),
        topTenants,
        trialEnding: trialEnding.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8),
        paidSharePercent: paidShare,
        churnSharePercent: churnShare,
      },
      totals: {
        tenants: tenants.length,
        activeTenants,
        frozenTenants,
        totalCustomers,
        totalUsers,
        applePassCount,
        stampsToday,
        redeemsToday,
        estimatedMrr,
      },
      byStatus,
      recentTenants,
      needsAttention,
    };
  }

  /** Silme talebi: 14 gün sonra kalıcı silinir; bu süre içinde iptal edilebilir. */
  async requestDeletion(tenantId: string, reason: string, note?: string) {
    const allowed = ['NO_LONGER_USING', 'PRICE', 'MISSING_FEATURES', 'TECHNICAL', 'SWITCHED', 'OTHER'];
    if (!allowed.includes(reason)) throw new BadRequestException('Geçersiz neden');
    const now = new Date();
    const scheduled = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletionRequestedAt: now,
        deletionScheduledAt: scheduled,
        deletionReason: reason,
        deletionNote: note?.trim().slice(0, 1000) || null,
      },
      select: { id: true, deletionScheduledAt: true },
    });
  }

  async cancelDeletion(tenantId: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { deletionRequestedAt: null, deletionScheduledAt: null, deletionReason: null, deletionNote: null },
      select: { id: true, deletionScheduledAt: true },
    });
  }

  async create(dto: CreateTenantDto) {
    const email = dto.ownerEmail.toLowerCase();
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Bu slug zaten kullanılıyor');
    }
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);

    let plan: { code: string; priceTry: number } | null = null;
    if (dto.planCode) {
      plan = await this.prisma.subscriptionPlan.findFirst({
        where: { code: dto.planCode, isActive: true, isPublic: true },
        select: { code: true, priceTry: true },
      });
      if (!plan) {
        throw new BadRequestException('Seçilen paket bulunamadı');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          primaryColor: dto.primaryColor ?? '#1B4332',
          subscriptionStatus: SubscriptionStatus.TRIAL,
          ...(plan
            ? { planCode: plan.code, planPriceTry: plan.priceTry }
            : {}),
        },
      });

      await tx.rewardRule.create({
        data: {
          tenantId: tenant.id,
          stampsRequired: 10,
          rewardLabel: '1 bedava kahve',
        },
      });

      const owner = await tx.user.create({
        data: {
          email,
          name: dto.ownerName,
          passwordHash,
          role: Role.STORE_OWNER,
          tenantId: tenant.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      return { tenant, owner };
    }).then(async (result) => {
      void this.loyaltyEngine
        .afterTenantCreated(result.tenant.id)
        .catch((err: Error) =>
          this.logger.warn(`Program sync (tenant create): ${err.message}`),
        );
      return result;
    });
  }

  async updateAdmin(id: string, dto: UpdateTenantAdminDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Kafe bulunamadı');
    }

    const nextStatus = dto.subscriptionStatus;
    const activating =
      nextStatus === SubscriptionStatus.ACTIVE &&
      tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE;

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(nextStatus !== undefined ? { subscriptionStatus: nextStatus } : {}),
        ...(activating
          ? {
              subscriptionActivatedAt: new Date(),
              subscriptionPeriodEndsAt:
                this.subscriptionLifecycle.periodEndOnActivation(),
              subscriptionCancelledAt: null,
              subscriptionAccessEndsAt: null,
              subscriptionSuspendedAt: null,
              subscriptionSuspendUntil: null,
              subscriptionFrozenDaysRemaining: null,
            }
          : {}),
      },
    });

    void this.ownerPush
      .notifyTenantAccountChange(
        tenant.id,
        {
          subscriptionStatus: tenant.subscriptionStatus,
          isActive: tenant.isActive,
        },
        {
          subscriptionStatus: updated.subscriptionStatus,
          isActive: updated.isActive,
          name: updated.name,
        },
      )
      .catch((err: Error) =>
        this.logger.warn(`Owner account push başarısız: ${err.message}`),
      );

    return updated;
  }

  /** Süper admin: tek işletmenin tüm özet bilgisi (salt okunur) */
  async tenantOverview(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        rewardRule: true,
        branches: { orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } },
        loyaltyPrograms: {
          select: { id: true, name: true, type: true, isActive: true, isPrimary: true },
          orderBy: { createdAt: 'asc' },
        },
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { customers: true, users: true, passes: true, branches: true } },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Kafe bulunamadı');
    }

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const [stamps30, redeems30, lastStamp] = await Promise.all([
      this.prisma.stampLedger.count({
        where: { tenantId, type: StampLedgerType.STAMP, createdAt: { gte: since30 } },
      }),
      this.prisma.stampLedger.count({
        where: { tenantId, type: StampLedgerType.REDEEM, createdAt: { gte: since30 } },
      }),
      this.prisma.stampLedger.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        planCode: tenant.planCode,
        planPriceTry: tenant.planPriceTry,
        subscriptionStatus: tenant.subscriptionStatus,
        subscriptionActivatedAt: tenant.subscriptionActivatedAt,
        subscriptionPeriodEndsAt: tenant.subscriptionPeriodEndsAt,
        subscriptionCancelledAt: tenant.subscriptionCancelledAt,
        subscriptionAccessEndsAt: tenant.subscriptionAccessEndsAt,
        subscriptionSuspendedAt: tenant.subscriptionSuspendedAt,
        subscriptionSuspendUntil: tenant.subscriptionSuspendUntil,
        deletionRequestedAt: tenant.deletionRequestedAt,
        deletionScheduledAt: tenant.deletionScheduledAt,
        deletionReason: tenant.deletionReason,
        createdAt: tenant.createdAt,
        primaryColor: tenant.primaryColor,
        rewardRule: tenant.rewardRule
          ? { stampsRequired: tenant.rewardRule.stampsRequired, rewardLabel: tenant.rewardRule.rewardLabel }
          : null,
      },
      totals: {
        customers: tenant._count.customers,
        users: tenant._count.users,
        passes: tenant._count.passes,
        branches: tenant._count.branches,
        stamps30,
        redeems30,
        lastActivityAt: lastStamp?.createdAt ?? null,
      },
      branches: tenant.branches,
      programs: tenant.loyaltyPrograms,
      users: tenant.users,
    };
  }

  async getById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { rewardRule: true },
    });
    if (!tenant) {
      throw new NotFoundException('Kafe bulunamadı');
    }
    return {
      ...tenant,
      logoUrl: this.assets.rewriteStoredAssetUrl(tenant.logoUrl),
      notifyIconUrl: this.assets.rewriteStoredAssetUrl(tenant.notifyIconUrl),
      stampIconFilledUrl: this.assets.rewriteStoredAssetUrl(
        tenant.stampIconFilledUrl,
      ),
      stampIconEmptyUrl: this.assets.rewriteStoredAssetUrl(
        tenant.stampIconEmptyUrl,
      ),
    };
  }

  private async pushWalletDesign(tenantId: string) {
    try {
      const result = await this.wallet.syncTenantPasses(tenantId);
      return result;
    } catch (err) {
      this.logger.warn(
        `Wallet design sync başarısız: ${(err as Error).message}`,
      );
      return { synced: 0, devices: 0 };
    }
  }

  async notificationStatus(tenantId: string) {
    const tenant = await this.getById(tenantId);
    const [passCount, deviceCount, history, audiences] = await Promise.all([
      this.prisma.pass.count({
        where: { tenantId, platform: 'APPLE' },
      }),
      this.prisma.appleDeviceRegistration.count({
        where: { pass: { tenantId } },
      }),
      this.prisma.broadcastLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          message: true,
          synced: true,
          devices: true,
          createdAt: true,
          audience: true,
          audienceLabel: true,
          targetCount: true,
        },
      }),
      this.notificationAudiences(tenantId),
    ]);
    return {
      audiences,
      lastMessage: tenant.passBroadcastMessage
        ? stripBroadcastStamps(tenant.passBroadcastMessage)
        : null,
      lastSentAt: tenant.passBroadcastAt,
      applePassCount: passCount,
      registeredDevices: deviceCount,
      notifyIconUrl: this.assets.rewriteStoredAssetUrl(tenant.notifyIconUrl),
      name: tenant.name,
      primaryColor: tenant.primaryColor,
      history: history.map((row) => ({
        ...row,
        message: stripBroadcastStamps(row.message),
      })),
    };
  }

  async broadcastNotification(
    tenantId: string,
    message: string,
    audience?: { type: 'all' | 'segment' | 'vip'; segmentId?: string; vipTierId?: string },
  ) {
    await this.getById(tenantId);
    if (!audience || audience.type === 'all') {
      return this.wallet.broadcastNotification(tenantId, message);
    }

    if (audience.type === 'segment') {
      if (!audience.segmentId) throw new BadRequestException('Grup seçin');
      const seg = await this.prisma.segment.findFirst({
        where: { id: audience.segmentId, tenantId },
        select: { id: true, name: true },
      });
      if (!seg) throw new NotFoundException('Grup bulunamadı');
      const ids = await this.crm.listSegmentCustomerIds(tenantId, seg.id);
      return this.wallet.broadcastToCustomers(tenantId, [...ids], message, {
        type: 'segment',
        label: seg.name,
      });
    }

    // VIP seviyesi
    if (!audience.vipTierId) throw new BadRequestException('Seviye seçin');
    const tier = await this.prisma.vipTier.findFirst({
      where: { id: audience.vipTierId, tenantId },
      select: { id: true, name: true },
    });
    if (!tier) throw new NotFoundException('VIP seviyesi bulunamadı');
    const rows = await this.prisma.customer.findMany({
      where: { tenantId, vipTierId: tier.id },
      select: { id: true },
    });
    return this.wallet.broadcastToCustomers(
      tenantId,
      rows.map((r) => r.id),
      message,
      { type: 'vip', label: tier.name },
    );
  }

  /** Hedef seçici için gruplar ve VIP seviyeleri — tek istekte sayılarla */
  async notificationAudiences(tenantId: string) {
    const [segments, tiers, tierCounts] = await Promise.all([
      this.crm.segmentsOverview(tenantId),
      this.prisma.vipTier.findMany({
        where: { tenantId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.customer.groupBy({
        by: ['vipTierId'],
        where: { tenantId, vipTierId: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const countByTier = new Map(tierCounts.map((t) => [t.vipTierId, t._count._all]));
    return {
      segments: segments
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.id, name: s.name, count: s.count })),
      vipTiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        count: countByTier.get(t.id) ?? 0,
      })),
    };
  }

  /** Upload + DB’ye yaz (icon/logo hemen kalıcı olsun) */
  async saveAndPersistAsset(
    tenantId: string,
    slot: AssetSlot,
    file: Express.Multer.File,
    programId?: string,
  ) {
    const { url } = await this.assets.saveTenantImage(
      tenantId,
      slot,
      file,
      programId,
    );
    if (slot === 'passBackground' || slot === 'passStrip') {
      return { url };
    }
    const field =
      slot === 'icon'
        ? 'notifyIconUrl'
        : slot === 'logo'
          ? 'logoUrl'
          : slot === 'stampFilled'
            ? 'stampIconFilledUrl'
            : 'stampIconEmptyUrl';
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { [field]: url },
    });
    if (slot === 'icon' || slot === 'logo') {
      void this.pushWalletDesign(tenantId).catch((err) =>
        this.logger.warn(`Asset sync: ${(err as Error).message}`),
      );
    }
    return { url };
  }

  async updateProfile(tenantId: string, dto: UpdateTenantProfileDto) {
    await this.getById(tenantId);

    const nullableKeys = [
      'logoUrl',
      'primaryColor',
      'logoText',
      'foregroundColor',
      'labelColor',
      'stampFieldLabel',
      'rewardFieldLabel',
      'statusFieldLabel',
      'broadcastFieldLabel',
      'broadcastEmptyText',
      'rewardReadyText',
      'stampsRemainingTemplate',
      'headerFieldLabel',
      'passDescription',
      'passHowItWorks',
      'passTerms',
      'passLocations',
      'passHours',
      'passWebsiteUrl',
      'passPhone',
      'stampIconFilledUrl',
      'stampIconEmptyUrl',
      'passDescriptionLabel',
      'passHowItWorksLabel',
      'passTermsLabel',
      'passLocationsLabel',
      'passHoursLabel',
      'passWebsiteLabel',
      'passPhoneLabel',
      'passExtra1Label',
      'passExtra1Value',
      'passExtra2Label',
      'passExtra2Value',
      'passExtra3Label',
      'passExtra3Value',
      'notifyIconUrl',
      'stampChangeMessage',
      'rewardChangeMessage',
      'statusChangeMessage',
      'headerChangeMessage',
      'redeemChangeMessage',
      'birthdayMessage',
      'inviteHeadline',
      'inviteLayout',
      'inviteSubtitle',
      'inviteCtaHint',
      'inviteBgColor',
      'inviteCardColor',
      'inviteStatusText',
      'inviteAppleBtnLabel',
      'inviteGoogleBtnLabel',
      'inviteFormTitle',
      'inviteLegalText',
    ] as const;

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 2) {
        throw new BadRequestException('Kafe adı en az 2 karakter olmalı');
      }
      data.name = name;
    }
    if (dto.marketplaceListingEnabled !== undefined) {
      data.marketplaceListingEnabled = dto.marketplaceListingEnabled;
    }
    if (dto.marketplacePlanSlug !== undefined) {
      data.marketplacePlanSlug = emptyToNull(dto.marketplacePlanSlug);
    }
    if (dto.stampTheme !== undefined) {
      data.stampTheme = dto.stampTheme.toUpperCase();
    }
    if (dto.stampInset !== undefined) {
      data.stampInset = dto.stampInset.toUpperCase();
    }
    if (dto.barcodeFormat !== undefined) {
      data.barcodeFormat = dto.barcodeFormat.toUpperCase();
    }
    if (dto.showStampField !== undefined) {
      data.showStampField = dto.showStampField;
    }
    if (dto.showRewardField !== undefined) {
      data.showRewardField = dto.showRewardField;
    }
    if (dto.showStatusField !== undefined) {
      data.showStatusField = dto.showStatusField;
    }
    if (dto.showBroadcastField !== undefined) {
      data.showBroadcastField = dto.showBroadcastField;
    }
    if (dto.collectCustomerName !== undefined) {
      data.collectCustomerName = dto.collectCustomerName;
    }
    if (dto.collectCustomerBirthday !== undefined) {
      data.collectCustomerBirthday = dto.collectCustomerBirthday;
    }
    if (dto.birthdayGiftEnabled !== undefined) {
      data.birthdayGiftEnabled = dto.birthdayGiftEnabled;
    }
    if (dto.invitePolicies !== undefined) {
      if (dto.invitePolicies === null) {
        data.invitePolicies = null;
      } else {
        data.invitePolicies = dto.invitePolicies.map((p) => ({
          title: p.title.trim().slice(0, 80),
          body: p.body.trim().slice(0, 12000),
        }));
      }
    }
    for (const key of nullableKeys) {
      if (key === 'inviteLayout') continue;
      if (dto[key] !== undefined) {
        data[key] = emptyToNull(dto[key]);
      }
    }
    if (dto.inviteLayout !== undefined) {
      const layout = sanitizeInviteLayout(dto.inviteLayout);
      data.inviteLayout = layout ?? Prisma.DbNull;
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
      include: { rewardRule: true },
    });

    // PassMarket flags — raw SQL so pre-migrate / pre-generate stays safe
    let marketplaceListingEnabled =
      (tenant as { marketplaceListingEnabled?: boolean }).marketplaceListingEnabled;
    let marketplacePlanSlug =
      (tenant as { marketplacePlanSlug?: string | null }).marketplacePlanSlug ?? null;
    if (
      dto.marketplaceListingEnabled !== undefined ||
      dto.marketplacePlanSlug !== undefined
    ) {
      try {
        if (dto.marketplaceListingEnabled !== undefined) {
          await this.prisma.$executeRaw`
            UPDATE "Tenant"
            SET "marketplaceListingEnabled" = ${dto.marketplaceListingEnabled}
            WHERE id = ${tenantId}
          `;
          marketplaceListingEnabled = dto.marketplaceListingEnabled;
        }
        if (dto.marketplacePlanSlug !== undefined) {
          const slugVal = emptyToNull(dto.marketplacePlanSlug);
          await this.prisma.$executeRaw`
            UPDATE "Tenant"
            SET "marketplacePlanSlug" = ${slugVal}
            WHERE id = ${tenantId}
          `;
          marketplacePlanSlug = slugVal ?? null;
        }
      } catch (err) {
        this.logger.warn(
          `marketplace flags update skipped (migrate pending?): ${(err as Error).message}`,
        );
      }
    }

    // Davet / KVKK / doğum günü alanları Wallet kart tasarımını etkilemez —
    // gereksiz APNs sync'i atla (önizleme butonu da hızlı kalsın).
    const needsWalletSync = Object.keys(data).some(
      (k) => !INVITE_ONLY_KEYS.has(k),
    );
    const walletSync = needsWalletSync
      ? await this.pushWalletDesign(tenantId)
      : { synced: 0, total: 0, skipped: true as const };
    return {
      ...tenant,
      marketplaceListingEnabled: marketplaceListingEnabled ?? false,
      marketplacePlanSlug: marketplacePlanSlug ?? null,
      walletSync,
    };
  }

  async updateRewardRule(tenantId: string, dto: UpdateRewardRuleDto) {
    await this.getById(tenantId);
    const rule = await this.prisma.rewardRule.upsert({
      where: { tenantId },
      update: {
        ...(dto.stampsRequired !== undefined
          ? { stampsRequired: dto.stampsRequired }
          : {}),
        ...(dto.rewardLabel !== undefined
          ? { rewardLabel: dto.rewardLabel }
          : {}),
      },
      create: {
        tenantId,
        stampsRequired: dto.stampsRequired ?? 10,
        rewardLabel: dto.rewardLabel ?? '1 bedava kahve',
      },
    });
    const walletSync = await this.pushWalletDesign(tenantId);
    void this.loyaltyEngine
      .afterRewardRuleMutation(tenantId)
      .catch((err: Error) =>
        this.logger.warn(`Program sync (reward rule): ${err.message}`),
      );
    return { ...rule, walletSync };
  }

  listStaff(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: [Role.STORE_OWNER, Role.CASHIER] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        branchId: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteCashier(tenantId: string, dto: InviteCashierDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    const branchId = await this.branchPolicy.resolveStaffBranchId(
      tenantId,
      dto.branchId,
    );

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
        role: Role.CASHIER,
        tenantId,
        branchId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        branchId: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async createStaffResetLink(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        role: { in: [Role.CASHIER, Role.STORE_OWNER] },
        isActive: true,
      },
    });
    if (!user) throw new NotFoundException('Personel bulunamadı');
    const reset = await this.auth.createPasswordReset(user.id);
    return {
      userId: user.id,
      email: user.email,
      resetUrl: reset.resetUrl,
      expiresAt: reset.expiresAt,
    };
  }

  async setStaffPassword(
    tenantId: string,
    userId: string,
    password: string,
  ) {
    if (password.trim().length < 8) {
      throw new BadRequestException('Şifre en az 8 karakter olmalı');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        role: Role.CASHIER,
        isActive: true,
      },
    });
    if (!user) throw new NotFoundException('Kasiyer bulunamadı');
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return { ok: true, userId: user.id, email: user.email };
  }

  async metrics(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - 6);

    const [
      totalCustomers,
      stampsToday,
      redeemsToday,
      stampsMonth,
      redeemsMonth,
      rewardReadyCount,
      applePassCount,
      registeredDevices,
      staffCount,
      activeCustomers,
      rewardRule,
      weekLedger,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: start },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.REDEEM,
          createdAt: { gte: start },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.REDEEM,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.customer.count({
        where: { tenantId, rewardReady: true },
      }),
      this.prisma.pass.count({
        where: { tenantId, platform: 'APPLE' },
      }),
      this.prisma.appleDeviceRegistration.count({
        where: { pass: { tenantId } },
      }),
      this.prisma.user.count({
        where: { tenantId, role: 'CASHIER', isActive: true },
      }),
      this.prisma.customer.count({
        where: { tenantId, stampCount: { gt: 0 } },
      }),
      this.prisma.rewardRule.findUnique({ where: { tenantId } }),
      this.prisma.stampLedger.findMany({
        where: {
          tenantId,
          type: { in: [StampLedgerType.STAMP, StampLedgerType.REDEEM] },
          createdAt: { gte: weekStart },
        },
        select: { type: true, createdAt: true },
      }),
    ]);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return {
        date: key,
        label: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
        stamps: 0,
        redeems: 0,
      };
    });
    const byDay = new Map(last7Days.map((x) => [x.date, x]));
    for (const row of weekLedger) {
      const key = row.createdAt.toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      if (!bucket) continue;
      if (row.type === StampLedgerType.STAMP) bucket.stamps += 1;
      else if (row.type === StampLedgerType.REDEEM) bucket.redeems += 1;
    }

    return {
      totalCustomers,
      stampsToday,
      redeemsToday,
      stampsMonth,
      redeemsMonth,
      rewardReadyCount,
      applePassCount,
      registeredDevices,
      staffCount,
      activeCustomers,
      stampsRequired: rewardRule?.stampsRequired ?? 10,
      rewardLabel: rewardRule?.rewardLabel ?? null,
      last7Days,
    };
  }

  async onboardingStatus(tenantId: string) {
    const tenant = await this.getById(tenantId);
    const [cashierCount, customerCount] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, role: Role.CASHIER, isActive: true },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    const steps = [
      {
        id: 'reward',
        label: 'Ödül kuralını ayarla',
        done: !!tenant.rewardRule,
        path: '/reward',
      },
      {
        id: 'cashier',
        label: 'En az bir kasiyer ekle',
        done: cashierCount > 0,
        path: '/settings/staff',
      },
      {
        id: 'design',
        label: 'Wallet kart / davet sayfası',
        done: !!(tenant.primaryColor && tenant.slug),
        path: '/settings/card',
      },
      {
        id: 'table-tent',
        label: 'Masa tenti indir ve masaya koy',
        done: !!(tenant.slug && tenant.primaryColor),
        path: '/settings/business?section=qr',
      },
      {
        id: 'smoke',
        label: 'Test müşterisi ile dene',
        done: customerCount > 0,
        path: '/counter',
      },
      {
        id: 'billing',
        label: 'Abonelik aktif (SuperAdmin)',
        done: tenant.subscriptionStatus === SubscriptionStatus.ACTIVE,
        path: '/settings/billing',
      },
    ];
    const completed = steps.filter((s) => s.done).length;
    return {
      steps,
      progress: Math.round((completed / steps.length) * 100),
      complete: completed === steps.length,
    };
  }

  async submitOwnerFeedback(
    tenantId: string,
    user: AuthUser,
    dto: OwnerFeedbackDto,
  ) {
    const [tenant, dbUser] = await Promise.all([
      this.getById(tenantId),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      }),
    ]);
    const lead = await this.prisma.contactLead.create({
      data: {
        name: dbUser?.name ?? user.email,
        cafe: tenant.name,
        email: user.email,
        message: `[${dto.category?.trim() || 'feedback'}] ${dto.message.trim()}`,
        source: 'owner_feedback',
      },
    });
    return { ok: true, id: lead.id };
  }
}
