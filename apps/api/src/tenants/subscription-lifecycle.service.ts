import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, SubscriptionStatus, Tenant, Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const MS_DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const BILLING_PERIOD_DAYS = 30;
const SUSPEND_WINDOW_DAYS = 90;

export type SubscriptionSnapshot = {
  status: SubscriptionStatus;
  isActive: boolean;
  daysRemaining: number;
  accessEndsAt: string | null;
  periodEndsAt: string | null;
  cancelledAt: string | null;
  suspendedAt: string | null;
  suspendUntil: string | null;
  frozenDaysRemaining: number | null;
  canCancel: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
  needsReactivation: boolean;
  loginBlocked: boolean;
  loginBlockReason: string | null;
  /** Deneme süresi doldu; giriş açık, işletme ekranları kapalı, yalnız faturalandırma */
  trialExpired: boolean;
  trialEndsAt: string | null;
};

@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Deneme bitişi hatırlatması: 3 gün, 1 gün ve bitiş günü kala owner'a e-posta.
   * Her eşik yalnızca bir kez gönderilir (trialReminderDay ile izlenir).
   */
  async sendTrialReminders(): Promise<number> {
    const now = new Date();
    const tenants = await this.prisma.tenant.findMany({
      where: { subscriptionStatus: SubscriptionStatus.TRIAL },
      select: { id: true, name: true, createdAt: true, trialReminderDay: true },
    });
    let sent = 0;
    for (const t of tenants) {
      const endsAt = new Date(t.createdAt.getTime() + TRIAL_DAYS * MS_DAY);
      const days = this.daysRemainingUntil(endsAt, now);
      const threshold = days === 0 ? 0 : days <= 1 ? 1 : days <= 3 ? 3 : null;
      if (threshold === null) continue;
      if (t.trialReminderDay !== null && t.trialReminderDay <= threshold) continue;

      const owner = await this.prisma.user.findFirst({
        where: { tenantId: t.id, role: Role.STORE_OWNER, isActive: true },
        select: { email: true },
      });
      if (!owner) continue;

      const headline =
        threshold === 0
          ? 'Deneme süreniz bugün sona eriyor'
          : threshold === 1
            ? 'Deneme süreniz yarın sona eriyor'
            : `Deneme süreniz ${threshold} gün sonra sona erecek`;
      const adminUrl = this.mail.adminUrl();
      const body = this.mail.render(
        headline,
        [
          `${t.name} için ücretsiz deneme süreniz ${threshold === 0 ? 'bugün' : `${threshold} gün sonra`} bitiyor.`,
          'Kesintisiz devam etmek için bir paket seçip satın alın.',
        ],
        adminUrl ? { label: 'Paket satın al', url: `${adminUrl}/settings/billing` } : undefined,
      );
      const result = await this.mail.send({ to: owner.email, subject: headline, ...body });
      if (!result.ok) continue;
      await this.prisma.tenant.update({
        where: { id: t.id },
        data: { trialReminderDay: threshold },
      });
      sent += 1;
    }
    return sent;
  }

  /** Gün farkı — yukarı yuvarla, minimum 0 */
  daysRemainingUntil(end: Date, from = new Date()): number {
    return Math.max(0, Math.ceil((end.getTime() - from.getTime()) / MS_DAY));
  }

  addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * MS_DAY);
  }

  resolvePeriodEndsAt(tenant: Tenant): Date | null {
    if (tenant.subscriptionPeriodEndsAt) {
      return tenant.subscriptionPeriodEndsAt;
    }
    if (tenant.subscriptionActivatedAt) {
      return this.addDays(tenant.subscriptionActivatedAt, BILLING_PERIOD_DAYS);
    }
    if (tenant.subscriptionStatus === SubscriptionStatus.TRIAL) {
      return this.addDays(tenant.createdAt, TRIAL_DAYS);
    }
    return null;
  }

  async refreshTenantState(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('İşletme bulunamadı');
    }

    const now = new Date();
    const data: Prisma.TenantUpdateInput = {};

    const periodEnd = this.resolvePeriodEndsAt(tenant);
    if (!tenant.subscriptionPeriodEndsAt && periodEnd) {
      data.subscriptionPeriodEndsAt = periodEnd;
    }

    if (
      tenant.subscriptionStatus === SubscriptionStatus.CANCELLED &&
      tenant.subscriptionAccessEndsAt &&
      now >= tenant.subscriptionAccessEndsAt &&
      tenant.isActive
    ) {
      data.isActive = false;
    }

    if (
      tenant.subscriptionStatus === SubscriptionStatus.SUSPENDED &&
      tenant.subscriptionSuspendUntil &&
      now >= tenant.subscriptionSuspendUntil &&
      tenant.isActive
    ) {
      data.isActive = false;
    }

    if (Object.keys(data).length === 0) {
      return tenant;
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  buildSnapshot(tenant: Tenant): SubscriptionSnapshot {
    const now = new Date();
    const periodEnd = this.resolvePeriodEndsAt(tenant);
    const accessEnd =
      tenant.subscriptionAccessEndsAt ??
      (tenant.subscriptionStatus === SubscriptionStatus.CANCELLED
        ? periodEnd
        : null);

    const daysRemaining = periodEnd
      ? this.daysRemainingUntil(periodEnd, now)
      : 0;

    const withinSuspendWindow =
      tenant.subscriptionStatus === SubscriptionStatus.SUSPENDED &&
      tenant.subscriptionSuspendUntil != null &&
      now < tenant.subscriptionSuspendUntil;

    const cancelGraceActive =
      tenant.subscriptionStatus === SubscriptionStatus.CANCELLED &&
      accessEnd != null &&
      now < accessEnd;

    const loginBlocked =
      !tenant.isActive &&
      !withinSuspendWindow &&
      !cancelGraceActive;

    let loginBlockReason: string | null = null;
    if (tenant.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      if (withinSuspendWindow) {
        loginBlockReason = null;
      } else {
        loginBlockReason =
          'Askı süresi doldu. Hesabı yeniden açmak için destek ile iletişime geçin.';
      }
    } else if (
      tenant.subscriptionStatus === SubscriptionStatus.CANCELLED &&
      accessEnd &&
      now >= accessEnd
    ) {
      loginBlockReason =
        'Abonelik süreniz bitti. Yeniden abone olmadan giriş yapamazsınız.';
    } else if (!tenant.isActive) {
      loginBlockReason = 'Hesabınız pasif.';
    }

    const trialExpired =
      tenant.subscriptionStatus === SubscriptionStatus.TRIAL &&
      periodEnd != null &&
      now >= periodEnd;

    const canCancel =
      tenant.isActive &&
      (tenant.subscriptionStatus === SubscriptionStatus.ACTIVE ||
        tenant.subscriptionStatus === SubscriptionStatus.TRIAL) &&
      !tenant.subscriptionCancelledAt;

    const canSuspend =
      tenant.isActive &&
      (tenant.subscriptionStatus === SubscriptionStatus.ACTIVE ||
        tenant.subscriptionStatus === SubscriptionStatus.TRIAL);

    const canReactivate = withinSuspendWindow;

    return {
      status: tenant.subscriptionStatus,
      isActive: tenant.isActive,
      daysRemaining,
      accessEndsAt: accessEnd?.toISOString() ?? null,
      periodEndsAt: periodEnd?.toISOString() ?? null,
      cancelledAt: tenant.subscriptionCancelledAt?.toISOString() ?? null,
      suspendedAt: tenant.subscriptionSuspendedAt?.toISOString() ?? null,
      suspendUntil: tenant.subscriptionSuspendUntil?.toISOString() ?? null,
      frozenDaysRemaining: tenant.subscriptionFrozenDaysRemaining,
      canCancel,
      canSuspend,
      canReactivate,
      needsReactivation:
        tenant.subscriptionStatus === SubscriptionStatus.SUSPENDED &&
        withinSuspendWindow,
      loginBlocked: loginBlocked && !withinSuspendWindow,
      loginBlockReason,
      trialExpired,
      trialEndsAt:
        tenant.subscriptionStatus === SubscriptionStatus.TRIAL
          ? (periodEnd?.toISOString() ?? null)
          : null,
    };
  }

  async getSnapshot(tenantId: string): Promise<SubscriptionSnapshot> {
    const tenant = await this.refreshTenantState(tenantId);
    return this.buildSnapshot(tenant);
  }

  /** Oturum açma — askıda (90 gün içinde) giriş serbest (yeniden açma için) */
  async assertCanAuthenticate(
    tenantId: string,
    role: Role,
  ): Promise<SubscriptionSnapshot | null> {
    if (role === Role.SUPER_ADMIN) return null;

    const tenant = await this.refreshTenantState(tenantId);
    const snap = this.buildSnapshot(tenant);

    if (
      snap.needsReactivation &&
      role === Role.CASHIER
    ) {
      throw new ForbiddenException(
        'İşletme hesabı askıda. Yönetici hesabı yeniden açana kadar giriş yapılamaz.',
      );
    }

    if (snap.needsReactivation) {
      return snap;
    }

    if (snap.loginBlocked) {
      throw new ForbiddenException(
        snap.loginBlockReason ?? 'Hesaba erişim kapalı',
      );
    }

    if (!tenant.isActive) {
      throw new ForbiddenException('Hesabınız pasif');
    }

    return snap;
  }

  /** API kullanımı — askıda veya süresi dolmuş iptal */
  async assertOperational(tenantId: string, role: Role): Promise<void> {
    if (role === Role.SUPER_ADMIN) return;

    const tenant = await this.refreshTenantState(tenantId);
    const snap = this.buildSnapshot(tenant);

    if (snap.needsReactivation) {
      throw new ForbiddenException(
        'Hesap askıda. Kullanmaya devam etmek için abonelik sayfasından hesabı yeniden açın.',
      );
    }

    if (snap.loginBlocked || !tenant.isActive) {
      throw new ForbiddenException(
        snap.loginBlockReason ?? 'Hesaba erişim kapalı',
      );
    }

    if (snap.trialExpired) {
      throw new ForbiddenException(
        'Deneme süreniz sona erdi. Devam etmek için bir paket seçip faturalandırma sayfasından etkinleştirin.',
      );
    }
  }

  /** İptali geri alır: dönem sonu gelmeden önce abonelik eski haline döner. */
  async resumeSubscription(tenantId: string): Promise<SubscriptionSnapshot> {
    const tenant = await this.refreshTenantState(tenantId);
    if (tenant.subscriptionStatus !== SubscriptionStatus.CANCELLED || !tenant.subscriptionCancelledAt) {
      throw new BadRequestException('Abonelik iptal edilmemiş');
    }
    const accessEnd = tenant.subscriptionAccessEndsAt;
    if (!accessEnd || accessEnd <= new Date()) {
      throw new BadRequestException('Erişim süresi dolduğu için iptal geri alınamaz');
    }
    const restored = tenant.subscriptionActivatedAt ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: restored,
        subscriptionCancelledAt: null,
        subscriptionAccessEndsAt: null,
        isActive: true,
      },
    });
    return this.getSnapshot(tenantId);
  }

  async cancelSubscription(tenantId: string): Promise<SubscriptionSnapshot> {
    const tenant = await this.refreshTenantState(tenantId);

    if (
      tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      tenant.subscriptionStatus !== SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException('Bu abonelik iptal edilemez');
    }
    if (tenant.subscriptionCancelledAt) {
      throw new BadRequestException('Abonelik zaten iptal edilmiş');
    }

    const periodEnd = this.resolvePeriodEndsAt(tenant);
    if (!periodEnd) {
      throw new BadRequestException('Abonelik dönemi hesaplanamadı');
    }

    const now = new Date();
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELLED,
        subscriptionCancelledAt: now,
        subscriptionAccessEndsAt: periodEnd,
        subscriptionPeriodEndsAt: periodEnd,
        isActive: true,
      },
    });

    this.logger.log(`Tenant ${tenantId} cancelled — access until ${periodEnd.toISOString()}`);
    return this.buildSnapshot(updated);
  }

  async suspendAccount(tenantId: string): Promise<SubscriptionSnapshot> {
    const tenant = await this.refreshTenantState(tenantId);

    if (
      tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      tenant.subscriptionStatus !== SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException('Bu hesap askıya alınamaz');
    }

    const now = new Date();
    const periodEnd = this.resolvePeriodEndsAt(tenant);
    const frozenDays = periodEnd
      ? this.daysRemainingUntil(periodEnd, now)
      : 0;
    const suspendUntil = this.addDays(now, SUSPEND_WINDOW_DAYS);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: { user: { tenantId } },
      });
      return tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: SubscriptionStatus.SUSPENDED,
          subscriptionSuspendedAt: now,
          subscriptionSuspendUntil: suspendUntil,
          subscriptionFrozenDaysRemaining: frozenDays,
          isActive: false,
        },
      });
    });

    this.logger.log(
      `Tenant ${tenantId} suspended — frozen ${frozenDays} days, window until ${suspendUntil.toISOString()}`,
    );
    return this.buildSnapshot(updated);
  }

  async reactivateAccount(tenantId: string): Promise<SubscriptionSnapshot> {
    const tenant = await this.refreshTenantState(tenantId);

    if (tenant.subscriptionStatus !== SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException('Hesap askıda değil');
    }

    const now = new Date();
    if (
      !tenant.subscriptionSuspendUntil ||
      now >= tenant.subscriptionSuspendUntil
    ) {
      throw new BadRequestException(
        '90 günlük askı süresi doldu. Hesap yeniden açılamaz.',
      );
    }

    const frozenDays = tenant.subscriptionFrozenDaysRemaining ?? 0;
    const periodEnd = this.addDays(now, frozenDays);

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionSuspendedAt: null,
        subscriptionSuspendUntil: null,
        subscriptionFrozenDaysRemaining: null,
        subscriptionPeriodEndsAt: periodEnd,
        subscriptionCancelledAt: null,
        subscriptionAccessEndsAt: null,
        isActive: true,
        ...(tenant.subscriptionActivatedAt
          ? {}
          : { subscriptionActivatedAt: now }),
      },
    });

    this.logger.log(
      `Tenant ${tenantId} reactivated — ${frozenDays} days until ${periodEnd.toISOString()}`,
    );
    return this.buildSnapshot(updated);
  }

  /** SuperAdmin aktivasyonunda dönem bitişi ayarla */
  periodEndOnActivation(from = new Date()): Date {
    return this.addDays(from, BILLING_PERIOD_DAYS);
  }

  /**
   * Paket değiştirir.
   * - Düşürme: hemen uygulanır; yeni paketin limitlerini aşan kullanım varsa reddedilir.
   * - Yükseltme: ödeme gerektirir. Ödeme sağlayıcısı (PaymentProvider) bağlanana kadar
   *   reddedilir; bağlanınca burada checkout başlatılıp planCode ödeme onayında yazılmalı.
   */
  async changePlan(tenantId: string, targetCode: string): Promise<SubscriptionSnapshot> {
    const tenant = await this.refreshTenantState(tenantId);

    if (
      tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      tenant.subscriptionStatus !== SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException('Paket yalnızca aktif abonelikte değiştirilebilir');
    }
    if (tenant.planCode === targetCode) {
      throw new BadRequestException('Bu zaten mevcut paketiniz');
    }

    const [current, target] = await Promise.all([
      this.prisma.subscriptionPlan.findUnique({ where: { code: tenant.planCode } }),
      this.prisma.subscriptionPlan.findUnique({ where: { code: targetCode } }),
    ]);
    if (!target || !target.isActive) {
      throw new NotFoundException('Seçilen paket bulunamadı');
    }

    const currentPrice = current?.priceTry ?? 0;
    if (target.priceTry > currentPrice) {
      throw new BadRequestException(
        'Paket yükseltmek için ödeme gerekir. Online ödeme henüz bağlı değil; lütfen destek ile iletişime geçin.',
      );
    }

    const [programs, branches, categories, items, tables] = await Promise.all([
      this.prisma.loyaltyProgram.count({ where: { tenantId, isActive: true } }),
      this.prisma.branch.count({ where: { tenantId, isActive: true } }),
      this.prisma.menuCategory.count({ where: { tenantId } }),
      this.prisma.menuItem.count({ where: { tenantId } }),
      this.prisma.menuTable.count({ where: { tenantId } }),
    ]);
    const over: string[] = [];
    if (programs > target.maxPrograms) over.push(`kart ${programs}/${target.maxPrograms}`);
    if (branches > target.maxBranches) over.push(`şube ${branches}/${target.maxBranches}`);
    if (categories > target.maxMenuCategories) over.push(`menü kategorisi ${categories}/${target.maxMenuCategories}`);
    if (items > target.maxMenuItems) over.push(`menü ürünü ${items}/${target.maxMenuItems}`);
    if (tables > target.maxMenuTables) over.push(`masa ${tables}/${target.maxMenuTables}`);
    if (over.length) {
      throw new BadRequestException(
        `Bu paketin limitlerini aşıyorsunuz (${over.join(', ')}). Önce fazlalığı kaldırın.`,
      );
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { planCode: targetCode },
    });
    this.logger.log(`Tenant ${tenantId} plan changed ${tenant.planCode} -> ${targetCode}`);
    return this.buildSnapshot(updated);
  }
}
