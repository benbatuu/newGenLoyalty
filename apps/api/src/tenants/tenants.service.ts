import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, StampLedgerType, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { AssetsService, type AssetSlot } from './assets.service';
import {
  CreateTenantDto,
  InviteCashierDto,
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

    for (const t of tenants) {
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

    return {
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

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          primaryColor: dto.primaryColor ?? '#1B4332',
          subscriptionStatus: SubscriptionStatus.TRIAL,
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

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(nextStatus !== undefined ? { subscriptionStatus: nextStatus } : {}),
        ...(activating ? { subscriptionActivatedAt: new Date() } : {}),
      },
    });
  }

  async getById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { rewardRule: true },
    });
    if (!tenant) {
      throw new NotFoundException('Kafe bulunamadı');
    }
    return tenant;
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
    const [passCount, deviceCount, history] = await Promise.all([
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
        },
      }),
    ]);
    return {
      lastMessage: tenant.passBroadcastMessage,
      lastSentAt: tenant.passBroadcastAt,
      applePassCount: passCount,
      registeredDevices: deviceCount,
      notifyIconUrl: tenant.notifyIconUrl,
      name: tenant.name,
      primaryColor: tenant.primaryColor,
      history,
    };
  }

  async broadcastNotification(tenantId: string, message: string) {
    await this.getById(tenantId);
    return this.wallet.broadcastNotification(tenantId, message);
  }

  /** Upload + DB’ye yaz (icon/logo hemen kalıcı olsun) */
  async saveAndPersistAsset(
    tenantId: string,
    slot: AssetSlot,
    file: Express.Multer.File,
  ) {
    const { url } = await this.assets.saveTenantImage(tenantId, slot, file);
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
      // İkon değişince pass’leri yenile — cihaz yeni ikonu çeksin
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
      if (dto[key] !== undefined) {
        data[key] = emptyToNull(dto[key]);
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
      include: { rewardRule: true },
    });

    // Davet / KVKK / doğum günü alanları Wallet kart tasarımını etkilemez —
    // gereksiz APNs sync'i atla (önizleme butonu da hızlı kalsın).
    const needsWalletSync = Object.keys(data).some(
      (k) => !INVITE_ONLY_KEYS.has(k),
    );
    const walletSync = needsWalletSync
      ? await this.pushWalletDesign(tenantId)
      : { synced: 0, total: 0, skipped: true as const };
    return { ...tenant, walletSync };
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
        createdAt: true,
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
        role: Role.CASHIER,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
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
}
