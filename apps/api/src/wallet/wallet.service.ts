import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassNotifyKind, PassPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { AppleApnsService } from './apple-apns.service';
import { ApplePassService } from './apple-pass.service';
import { GoogleWalletService } from './google-wallet.service';
import { PassArtService } from './pass-art.service';
import { parseInvitePolicies } from './invite-page';

type InviteClaims = {
  sub: string;
  tenantId: string;
  typ: 'wallet_invite';
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  /**
   * iOS caches pass icons by serial forever — bump this when the icon
   * pipeline changes so devices must re-add and get the new icon.
   */
  private static readonly APPLE_ICON_REV = 'ic3';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly apple: ApplePassService,
    private readonly google: GoogleWalletService,
    private readonly sms: SmsService,
    private readonly apns: AppleApnsService,
    private readonly passArt: PassArtService,
  ) {}

  private apiUrl(): string {
    const fromEnv = this.config.get<string>('API_URL')?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('API_URL is required in production');
    }
    return `http://localhost:${this.config.get('API_PORT') ?? 3001}`;
  }

  /**
   * iOS caches pass notification icons by serialNumber. Bump APPLE_ICON_REV
   * when the icon pipeline changes so a fresh add picks up the new icon.
   */
  private appleSerial(customerId: string): string {
    return `apple_${customerId}_${WalletService.APPLE_ICON_REV}`;
  }

  /** Public base for invite/download links (phone must reach this). */
  private publicApiUrl(): string {
    return this.appleWebServiceUrl() ?? this.apiUrl();
  }

  /**
   * Apple requires HTTPS for webServiceURL.
   * Prefer APPLE_WEB_SERVICE_URL (e.g. cloudflared/ngrok), else API_URL when https.
   */
  private appleWebServiceUrl(): string | null {
    const explicit = this.config.get<string>('APPLE_WEB_SERVICE_URL')?.trim();
    if (explicit?.startsWith('https://')) {
      return explicit.replace(/\/$/, '');
    }
    const api = this.apiUrl();
    if (api.startsWith('https://')) return api;
    return null;
  }

  private inviteSecret(): string {
    return (
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      'dev-wallet-invite-secret-change-me'
    );
  }

  private newAuthToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private assertApplePassAuth(
    authorization: string | undefined,
    expectedToken: string | null | undefined,
  ) {
    const expected = expectedToken?.trim();
    if (!expected) throw new UnauthorizedException();
    const header = (authorization ?? '').trim();
    const prefix = 'ApplePass ';
    if (!header.startsWith(prefix) || header.slice(prefix.length) !== expected) {
      throw new UnauthorizedException();
    }
  }

  createInviteToken(customerId: string, tenantId: string): string {
    return jwt.sign(
      { sub: customerId, tenantId, typ: 'wallet_invite' } satisfies InviteClaims,
      this.inviteSecret(),
      { expiresIn: '30d' },
    );
  }

  verifyInviteToken(token: string): InviteClaims {
    const payload = jwt.verify(token, this.inviteSecret()) as InviteClaims;
    if (payload.typ !== 'wallet_invite' || !payload.sub || !payload.tenantId) {
      throw new NotFoundException('Geçersiz wallet davet linki');
    }
    return payload;
  }

  inviteUrl(customerId: string, tenantId: string): string {
    const token = this.createInviteToken(customerId, tenantId);
    return `${this.publicApiUrl()}/wallet/invite/${token}`;
  }

  private async loadCustomerContext(customerId: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        tenant: true,
      },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }

    const rule = await this.prisma.rewardRule.findUnique({
      where: { tenantId },
    });
    if (!rule) {
      throw new ServiceUnavailableException('Ödül kuralı tanımlı değil');
    }

    return { customer, rule, tenant: customer.tenant };
  }

  private async ensureApplePassRow(
    tenantId: string,
    customerId: string,
    serial: string,
  ) {
    const existing = await this.prisma.pass.findUnique({
      where: {
        platform_externalId: {
          platform: PassPlatform.APPLE,
          externalId: serial,
        },
      },
    });
    if (existing) {
      if (!existing.authenticationToken) {
        return this.prisma.pass.update({
          where: { id: existing.id },
          data: { authenticationToken: this.newAuthToken() },
        });
      }
      return existing;
    }
    try {
      return await this.prisma.pass.create({
        data: {
          tenantId,
          customerId,
          platform: PassPlatform.APPLE,
          externalId: serial,
          authenticationToken: this.newAuthToken(),
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return this.prisma.pass.findUniqueOrThrow({
          where: {
            platform_externalId: {
              platform: PassPlatform.APPLE,
              externalId: serial,
            },
          },
        });
      }
      throw err;
    }
  }

  private async bumpApplePassAndPush(
    serial: string,
    notifyKind?: PassNotifyKind,
  ): Promise<{
    deviceCount: number;
  }> {
    const pass = await this.prisma.pass.update({
      where: {
        platform_externalId: {
          platform: PassPlatform.APPLE,
          externalId: serial,
        },
      },
      data: {
        contentVersion: { increment: 1 },
        pendingNotifyKind: notifyKind ?? null,
      },
      include: { appleRegistrations: true },
    });

    const tokens = pass.appleRegistrations.map((r) => r.pushToken);
    if (tokens.length === 0) {
      this.logger.warn(
        `Apple push yok — kayıtlı cihaz yok (serial=${serial}). Eski pass’i silip HTTPS invite’tan yeniden ekle.`,
      );
      return { deviceCount: 0 };
    }
    await this.apns.pushPassUpdate(tokens);
    return { deviceCount: tokens.length };
  }

  async syncPasses(
    customerId: string,
    tenantId: string,
    opts?: { notifyKind?: PassNotifyKind },
  ) {
    const { customer, rule, tenant } = await this.loadCustomerContext(
      customerId,
      tenantId,
    );

    const appleSerial = this.appleSerial(customer.id);
    const results: {
      apple?: { ok: boolean; externalId: string; deviceCount?: number };
      google?: { ok: boolean; externalId: string; saveUrl?: string };
    } = {};

    if (this.apple.isConfigured()) {
      try {
        await this.ensureApplePassRow(tenantId, customer.id, appleSerial);
        const pushed = await this.bumpApplePassAndPush(
          appleSerial,
          opts?.notifyKind,
        );
        results.apple = {
          ok: true,
          externalId: appleSerial,
          deviceCount: pushed.deviceCount,
        };
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'P2002') {
          results.apple = { ok: true, externalId: appleSerial, deviceCount: 0 };
        } else {
          this.logger.warn(`Apple sync: ${(err as Error).message}`);
          throw err;
        }
      }
    } else {
      this.logger.warn('Apple Wallet atlandı — sertifika/env eksik');
    }

    if (this.google.isConfigured()) {
      const googleInput = this.buildGooglePassInput(
        tenant,
        customer,
        rule.stampsRequired,
        rule.rewardLabel,
      );

      await this.google.upsertClassAndObject(googleInput);
      const externalId = this.google.objectId(customer.id);
      try {
        await this.prisma.pass.upsert({
          where: {
            platform_externalId: {
              platform: PassPlatform.GOOGLE,
              externalId,
            },
          },
          create: {
            tenantId,
            customerId,
            platform: PassPlatform.GOOGLE,
            externalId,
          },
          update: {},
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== 'P2002') throw err;
      }
      results.google = {
        ok: true,
        externalId,
        saveUrl: this.google.createSaveUrl(googleInput),
      };
    } else {
      this.logger.warn('Google Wallet atlandı — env eksik');
    }

    this.logger.debug(
      `Pass sync: customer=${customerId} apple=${!!results.apple} google=${!!results.google}`,
    );

    return results;
  }

  /**
   * Owner design/reward değişikliklerinde tüm müşteri pass'lerini yenile + APNs.
   */
  async syncTenantPasses(tenantId: string): Promise<{
    synced: number;
    devices: number;
  }> {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        passes: { some: {} },
      },
      select: { id: true },
      take: 1000,
    });

    let synced = 0;
    let devices = 0;
    const chunkSize = 10;
    for (let i = 0; i < customers.length; i += chunkSize) {
      const chunk = customers.slice(i, i + chunkSize);
      const outcomes = await Promise.allSettled(
        chunk.map((c) => this.syncPasses(c.id, tenantId)),
      );
      for (const o of outcomes) {
        if (o.status === 'fulfilled') {
          synced += 1;
          devices += o.value.apple?.deviceCount ?? 0;
        } else {
          this.logger.warn(
            `Tenant pass sync fail: ${(o.reason as Error)?.message ?? o.reason}`,
          );
        }
      }
    }

    this.logger.log(
      `Tenant pass design sync: tenant=${tenantId} synced=${synced}/${customers.length} devices=${devices}`,
    );
    return { synced, devices };
  }

  /**
   * Owner anlık duyuru — pass alanını güncelleyip APNs ile Wallet bildirimi tetikler.
   * (Apple serbest push metni vermez; changeMessage ile görünür.)
   */
  async broadcastNotification(
    tenantId: string,
    message: string,
  ): Promise<{
    message: string;
    synced: number;
    devices: number;
    sentAt: Date;
  }> {
    const clean = message.trim();
    if (clean.length < 2) {
      throw new BadRequestException('Bildirim metni en az 2 karakter olmalı');
    }
    if (clean.length > 120) {
      throw new BadRequestException('Bildirim metni en fazla 120 karakter');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { passBroadcastMessage: true },
    });
    if (!tenant) throw new NotFoundException('Kafe bulunamadı');

    // Aynı metin tekrarında Apple changeMessage tetiklenmez — zaman damgası ekle
    let value = clean;
    if (tenant.passBroadcastMessage === clean) {
      const stamp = new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      value = `${clean} · ${stamp}`;
    }

    const sentAt = new Date();
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        passBroadcastMessage: value,
        passBroadcastAt: sentAt,
      },
    });

    const { synced, devices } = await this.syncTenantPasses(tenantId);

    await this.prisma.broadcastLog.create({
      data: {
        tenantId,
        message: value,
        synced,
        devices,
        createdAt: sentAt,
      },
    });

    return { message: value, synced, devices, sentAt };
  }

  private buildGooglePassInput(
    tenant: {
      slug: string;
      name: string;
      primaryColor: string | null;
      logoUrl: string | null;
      logoText: string | null;
      passDescription: string | null;
      passHowItWorks: string | null;
      passTerms: string | null;
      passLocations: string | null;
      passHours: string | null;
      passWebsiteUrl: string | null;
      passPhone: string | null;
      stampFieldLabel: string | null;
      rewardFieldLabel: string | null;
      statusFieldLabel: string | null;
      rewardReadyText: string | null;
      stampsRemainingTemplate: string | null;
    },
    customer: {
      id: string;
      phone: string;
      stampCount: number;
      rewardReady: boolean;
    },
    stampsRequired: number,
    rewardLabel: string,
  ) {
    return {
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      primaryColor: tenant.primaryColor ?? '#1B4332',
      logoUrl: tenant.logoUrl,
      programName: tenant.logoText?.trim() || 'Damga Kartı',
      customerId: customer.id,
      phone: customer.phone,
      stampCount: customer.stampCount,
      stampsRequired,
      rewardLabel,
      rewardReady: customer.rewardReady,
      stampFieldLabel: tenant.stampFieldLabel,
      rewardFieldLabel: tenant.rewardFieldLabel,
      statusFieldLabel: tenant.statusFieldLabel,
      rewardReadyText: tenant.rewardReadyText,
      stampsRemainingTemplate: tenant.stampsRemainingTemplate,
      passDescription: tenant.passDescription,
      passHowItWorks: tenant.passHowItWorks,
      passTerms: tenant.passTerms,
      passLocations: tenant.passLocations,
      passHours: tenant.passHours,
      passWebsiteUrl: tenant.passWebsiteUrl,
      passPhone: tenant.passPhone,
    };
  }

  private buildAppleBackFields(tenant: {
    name: string;
    passDescription: string | null;
    passHowItWorks: string | null;
    passTerms: string | null;
    passLocations: string | null;
    passHours: string | null;
    passWebsiteUrl: string | null;
    passPhone: string | null;
    passDescriptionLabel: string | null;
    passHowItWorksLabel: string | null;
    passTermsLabel: string | null;
    passLocationsLabel: string | null;
    passHoursLabel: string | null;
    passWebsiteLabel: string | null;
    passPhoneLabel: string | null;
    passExtra1Label: string | null;
    passExtra1Value: string | null;
    passExtra2Label: string | null;
    passExtra2Value: string | null;
    passExtra3Label: string | null;
    passExtra3Value: string | null;
    passBroadcastMessage: string | null;
    broadcastFieldLabel: string | null;
    broadcastEmptyText: string | null;
  }) {
    const fields: {
      key: string;
      label: string;
      value: string;
      changeMessage?: string;
    }[] = [];
    const push = (
      key: string,
      defaultLabel: string,
      label: string | null | undefined,
      value: string | null | undefined,
      changeMessage?: string,
    ) => {
      const v = value?.trim();
      if (!v) return;
      fields.push({
        key,
        label: label?.trim() || defaultLabel,
        value: v,
        ...(changeMessage ? { changeMessage } : {}),
      });
    };
    push(
      'broadcastDetail',
      tenant.broadcastFieldLabel?.trim() || 'Notice',
      tenant.broadcastFieldLabel,
      tenant.passBroadcastMessage?.trim() ||
        tenant.broadcastEmptyText?.trim() ||
        'No announcement',
    );
    push(
      'about',
      'Hakkında',
      tenant.passDescriptionLabel,
      tenant.passDescription,
    );
    push(
      'how',
      'Nasıl çalışır?',
      tenant.passHowItWorksLabel,
      tenant.passHowItWorks,
    );
    push('terms', 'Koşullar', tenant.passTermsLabel, tenant.passTerms);
    push(
      'locations',
      'Şubeler / Adres',
      tenant.passLocationsLabel,
      tenant.passLocations,
    );
    push(
      'hours',
      'Çalışma saatleri',
      tenant.passHoursLabel,
      tenant.passHours,
    );
    push('website', 'Web', tenant.passWebsiteLabel, tenant.passWebsiteUrl);
    push('phone', 'Telefon', tenant.passPhoneLabel, tenant.passPhone);
    push('extra1', 'Not', tenant.passExtra1Label, tenant.passExtra1Value);
    push('extra2', 'Not', tenant.passExtra2Label, tenant.passExtra2Value);
    push('extra3', 'Not', tenant.passExtra3Label, tenant.passExtra3Value);
    if (fields.length === 0) {
      fields.push({
        key: 'about',
        label: 'Hakkında',
        value: `${tenant.name} dijital damga kartı. Damgalarını tamamla, ödülünü kap.`,
      });
    }
    return fields;
  }

  async sendWalletInviteSms(customerId: string, tenantId: string) {
    const { customer, tenant } = await this.loadCustomerContext(
      customerId,
      tenantId,
    );
    const link = this.inviteUrl(customerId, tenantId);

    const body = [
      `${tenant.name} damga kartınız hazır.`,
      `Apple / Google Wallet'a eklemek için:`,
      link,
      ``,
      `KVKK: Bu SMS sadakat kartı kaydınız için gönderilmiştir. Ticari ileti değildir.`,
    ].join('\n');

    await this.sms.send({
      toPhone: customer.phone,
      body,
      link,
    });

    return { link };
  }

  async ensurePassesAndInvite(customerId: string, tenantId: string) {
    let sync: Awaited<ReturnType<WalletService['syncPasses']>> | Record<
      string,
      never
    > = {};
    try {
      sync = await this.syncPasses(customerId, tenantId);
    } catch (err) {
      this.logger.warn(
        `Pass sync (invite) başarısız — SMS yine de gönderilecek: ${(err as Error).message}`,
      );
    }
    const invite = await this.sendWalletInviteSms(customerId, tenantId);
    return { ...sync, inviteUrl: invite.link };
  }

  async getInvitePageData(token: string) {
    const claims = this.verifyInviteToken(token);
    const { customer, rule, tenant } = await this.loadCustomerContext(
      claims.sub,
      claims.tenantId,
    );

    const profileComplete = this.isInviteProfileComplete(customer, tenant);
    const needsName = tenant.collectCustomerName;
    const needsBirthday = tenant.collectCustomerBirthday;

    let googleSaveUrl: string | null = null;
    let appleDownloadUrl: string | null = null;

    if (profileComplete) {
      if (this.google.isConfigured()) {
        try {
          googleSaveUrl = this.google.createSaveUrl(
            this.buildGooglePassInput(
              tenant,
              customer,
              rule.stampsRequired,
              rule.rewardLabel,
            ),
          );
        } catch (err) {
          this.logger.warn(`Google save URL: ${(err as Error).message}`);
        }
      }
      if (this.apple.isConfigured()) {
        appleDownloadUrl = `${this.publicApiUrl()}/wallet/apple/${token}`;
      }
    }

    return {
      token,
      tenantName: tenant.name,
      logoText: tenant.logoText?.trim() || null,
      logoUrl: this.resolvePublicAssetUrl(tenant.logoUrl),
      primaryColor: tenant.primaryColor ?? '#1B4332',
      foregroundColor: tenant.foregroundColor ?? '#FFFFFF',
      inviteHeadline: tenant.inviteHeadline?.trim() || null,
      inviteSubtitle: tenant.inviteSubtitle?.trim() || null,
      inviteCtaHint: tenant.inviteCtaHint?.trim() || null,
      inviteBgColor: tenant.inviteBgColor?.trim() || null,
      inviteCardColor: tenant.inviteCardColor?.trim() || null,
      inviteStatusText: tenant.inviteStatusText?.trim() || null,
      inviteAppleBtnLabel: tenant.inviteAppleBtnLabel?.trim() || null,
      inviteGoogleBtnLabel: tenant.inviteGoogleBtnLabel?.trim() || null,
      inviteFormTitle: tenant.inviteFormTitle?.trim() || null,
      inviteLegalText: tenant.inviteLegalText?.trim() || null,
      invitePolicies: parseInvitePolicies(tenant.invitePolicies),
      stampCount: customer.stampCount,
      stampsRequired: rule.stampsRequired,
      rewardLabel: rule.rewardLabel,
      rewardReady: customer.rewardReady,
      appleAvailable: this.apple.isConfigured(),
      googleSaveUrl,
      appleDownloadUrl,
      profileComplete,
      collect: {
        name: needsName,
        birthday: needsBirthday,
      },
      profile: {
        displayName: customer.displayName ?? '',
        birthMonth: customer.birthMonth ?? null,
        birthDay: customer.birthDay ?? null,
      },
    };
  }

  createInvitePreviewToken(tenantId: string): string {
    return jwt.sign(
      { tenantId, typ: 'invite_preview' },
      this.inviteSecret(),
      { expiresIn: '7d' },
    );
  }

  invitePreviewUrl(tenantId: string): string {
    const token = this.createInvitePreviewToken(tenantId);
    return `${this.publicApiUrl()}/wallet/invite-preview/${token}`;
  }

  async getInvitePreviewPageData(token: string) {
    let tenantId: string;
    try {
      const payload = jwt.verify(token, this.inviteSecret()) as {
        tenantId?: string;
        typ?: string;
      };
      if (payload.typ !== 'invite_preview' || !payload.tenantId) {
        throw new Error('bad typ');
      }
      tenantId = payload.tenantId;
    } catch {
      throw new NotFoundException('Geçersiz veya süresi dolmuş önizleme linki');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, isActive: true },
      include: { rewardRule: true },
    });
    if (!tenant) {
      throw new NotFoundException('İşletme bulunamadı');
    }

    const rule = tenant.rewardRule;
    const stampsRequired = rule?.stampsRequired ?? 10;
    const rewardLabel = rule?.rewardLabel ?? 'Ödül';

    return {
      token: 'preview',
      tenantName: tenant.name,
      logoText: tenant.logoText?.trim() || null,
      logoUrl: this.resolvePublicAssetUrl(tenant.logoUrl),
      primaryColor: tenant.primaryColor ?? '#1B4332',
      foregroundColor: tenant.foregroundColor ?? '#FFFFFF',
      inviteHeadline: tenant.inviteHeadline?.trim() || null,
      inviteSubtitle: tenant.inviteSubtitle?.trim() || null,
      inviteCtaHint: tenant.inviteCtaHint?.trim() || null,
      inviteBgColor: tenant.inviteBgColor?.trim() || null,
      inviteCardColor: tenant.inviteCardColor?.trim() || null,
      inviteStatusText: tenant.inviteStatusText?.trim() || null,
      inviteAppleBtnLabel: tenant.inviteAppleBtnLabel?.trim() || null,
      inviteGoogleBtnLabel: tenant.inviteGoogleBtnLabel?.trim() || null,
      inviteFormTitle: tenant.inviteFormTitle?.trim() || null,
      inviteLegalText: tenant.inviteLegalText?.trim() || null,
      invitePolicies: parseInvitePolicies(tenant.invitePolicies),
      stampCount: Math.min(3, stampsRequired),
      stampsRequired,
      rewardLabel,
      rewardReady: false,
      appleAvailable: this.apple.isConfigured(),
      googleSaveUrl: null,
      appleDownloadUrl: null,
      // Önizlemede hem formu hem Wallet butonlarını göster
      profileComplete: true,
      collect: {
        name: tenant.collectCustomerName,
        birthday: tenant.collectCustomerBirthday,
      },
      profile: {
        displayName: '',
        birthMonth: null,
        birthDay: null,
      },
      isPreview: true as const,
    };
  }

  private resolvePublicAssetUrl(url: string | null | undefined): string | null {
    const raw = url?.trim();
    if (!raw) return null;
    // Private R2 S3 endpoint → public API /media proxy
    try {
      const u = new URL(raw);
      if (u.hostname.endsWith('.r2.cloudflarestorage.com')) {
        let key = u.pathname.replace(/^\//, '');
        if (!key.startsWith('tenants/')) {
          const parts = key.split('/');
          if (parts.length >= 2 && parts[1] === 'tenants') {
            key = parts.slice(1).join('/');
          }
        }
        if (key.startsWith('tenants/')) {
          const base = this.publicApiUrl().replace(/\/$/, '');
          return `${base}/media/${key}${u.search || ''}`;
        }
      }
    } catch {
      /* fall through */
    }
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = this.publicApiUrl().replace(/\/$/, '');
    return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
  }

  isInviteProfileComplete(
    customer: {
      displayName: string | null;
      birthMonth: number | null;
      birthDay: number | null;
    },
    tenant: {
      collectCustomerName: boolean;
      collectCustomerBirthday: boolean;
    },
  ): boolean {
    if (tenant.collectCustomerName && !customer.displayName?.trim()) {
      return false;
    }
    if (
      tenant.collectCustomerBirthday &&
      (!customer.birthMonth || !customer.birthDay)
    ) {
      return false;
    }
    return true;
  }

  async updateInviteProfile(
    token: string,
    body: {
      displayName?: string;
      birthMonth?: number;
      birthDay?: number;
    },
    locale: 'tr' | 'en' = 'tr',
  ) {
    const claims = this.verifyInviteToken(token);
    const { customer, tenant } = await this.loadCustomerContext(
      claims.sub,
      claims.tenantId,
    );

    const data: {
      displayName?: string | null;
      birthMonth?: number | null;
      birthDay?: number | null;
    } = {};

    const msg = {
      nameShort:
        locale === 'en'
          ? 'Name must be at least 2 characters'
          : 'İsim en az 2 karakter olmalı',
      birthdayInvalid:
        locale === 'en'
          ? 'Please choose a valid birthday'
          : 'Geçerli bir doğum günü seçin',
    };

    if (tenant.collectCustomerName) {
      const name = body.displayName?.trim() ?? '';
      if (name.length < 2) {
        throw new BadRequestException(msg.nameShort);
      }
      data.displayName = name.slice(0, 80);
    }

    if (tenant.collectCustomerBirthday) {
      const month = Number(body.birthMonth);
      const day = Number(body.birthDay);
      if (
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
      ) {
        throw new BadRequestException(msg.birthdayInvalid);
      }
      const maxDay = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]!;
      if (day > maxDay) {
        throw new BadRequestException(msg.birthdayInvalid);
      }
      data.birthMonth = month;
      data.birthDay = day;
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data,
    });

    // Doğum günü yeni kaydedildiyse ve kart zaten Wallet’taysa hemen dene
    if (data.birthMonth != null && data.birthDay != null) {
      const hasPass = await this.prisma.pass.count({
        where: { customerId: customer.id },
      });
      if (hasPass > 0) {
        void this.maybeNotifyBirthdayOnPassReady(
          customer.id,
          claims.tenantId,
        ).catch((err) =>
          this.logger.warn(
            `Profil doğum günü kontrolü: ${(err as Error).message}`,
          ),
        );
      }
    }

    return this.getInvitePageData(token);
  }

  /**
   * Doğum günü olan müşterilere tenant mesajıyla Wallet bildirimi.
   * Aynı takvim yılında bir kez.
   */
  async runBirthdayNotifications(): Promise<{ sent: number; tenants: number }> {
    const { month, day, year } = this.istanbulToday();

    const tenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        birthdayGiftEnabled: true,
        collectCustomerBirthday: true,
      },
      select: { id: true },
    });

    let sent = 0;
    for (const t of tenants) {
      const customers = await this.prisma.customer.findMany({
        where: {
          tenantId: t.id,
          birthMonth: month,
          birthDay: day,
          OR: [
            { lastBirthdayNotifyYear: null },
            { lastBirthdayNotifyYear: { not: year } },
          ],
          passes: { some: {} },
        },
        select: { id: true },
        take: 500,
      });

      for (const c of customers) {
        const ok = await this.sendBirthdayNotifyIfEligible(c.id, t.id, year);
        if (ok) sent += 1;
      }
    }

    this.logger.log(
      `Doğum günü job: ${month}/${day} · ${tenants.length} tenant · ${sent} bildirim`,
    );
    return { sent, tenants: tenants.length };
  }

  /** Kart eklendiğinde / profil kaydında: bugün doğum günüyse hemen bildir */
  async maybeNotifyBirthdayOnPassReady(
    customerId: string,
    tenantId: string,
  ): Promise<boolean> {
    const { month, day, year } = this.istanbulToday();
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: {
        birthMonth: true,
        birthDay: true,
        lastBirthdayNotifyYear: true,
      },
    });
    if (!customer?.birthMonth || !customer.birthDay) return false;
    if (customer.birthMonth !== month || customer.birthDay !== day) {
      return false;
    }
    if (customer.lastBirthdayNotifyYear === year) return false;

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: tenantId,
        isActive: true,
        birthdayGiftEnabled: true,
        collectCustomerBirthday: true,
      },
      select: { id: true },
    });
    if (!tenant) return false;

    return this.sendBirthdayNotifyIfEligible(customerId, tenantId, year);
  }

  private istanbulToday(): { month: number; day: number; year: number } {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    const parts = Object.fromEntries(
      fmt
        .formatToParts(now)
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, p.value]),
    );
    return {
      month: Number(parts.month),
      day: Number(parts.day),
      year: Number(parts.year),
    };
  }

  private async sendBirthdayNotifyIfEligible(
    customerId: string,
    tenantId: string,
    year: number,
  ): Promise<boolean> {
    try {
      await this.syncPasses(customerId, tenantId, {
        notifyKind: PassNotifyKind.BIRTHDAY,
      });
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { lastBirthdayNotifyYear: year },
      });
      this.logger.log(
        `Doğum günü bildirimi gönderildi customer=${customerId} year=${year}`,
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `Doğum günü bildirimi başarısız customer=${customerId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  private notifyKindToUpdateKind(
    kind: PassNotifyKind | null | undefined,
  ): 'stamp' | 'redeem' | 'birthday' | 'sync' {
    if (kind === PassNotifyKind.STAMP) return 'stamp';
    if (kind === PassNotifyKind.REDEEM) return 'redeem';
    if (kind === PassNotifyKind.BIRTHDAY) return 'birthday';
    return 'sync';
  }

  private async createPkPassBuffer(
    customerId: string,
    tenantId: string,
    authToken: string,
    notifyKind?: PassNotifyKind | null,
  ): Promise<Buffer> {
    const { customer, rule, tenant } = await this.loadCustomerContext(
      customerId,
      tenantId,
    );
    const webServiceURL = this.appleWebServiceUrl();
    if (!webServiceURL) {
      this.logger.warn(
        'APPLE_WEB_SERVICE_URL / HTTPS API_URL yok — pass güncellemesi çalışmaz. Örnek: cloudflared/ngrok HTTPS URL.',
      );
    }

    const [stripArt, logoArt, iconArt] = await Promise.all([
      this.passArt.buildStampStrip({
        theme: tenant.stampTheme || 'COFFEE',
        stampCount: customer.stampCount,
        stampsRequired: rule.stampsRequired,
        backgroundColor: tenant.primaryColor ?? '#1B4332',
        foregroundColor: tenant.foregroundColor ?? '#FFFFFF',
        stampIconFilledUrl: tenant.stampIconFilledUrl,
        stampIconEmptyUrl: tenant.stampIconEmptyUrl,
        inset: tenant.stampInset,
      }),
      this.passArt.buildLogoAssets(tenant.logoUrl),
      this.passArt.buildNotifyIconAssets(
        tenant.notifyIconUrl || tenant.logoUrl,
        tenant.primaryColor,
      ),
    ]);

    const orgName =
      tenant.logoText?.trim() ||
      tenant.name?.trim() ||
      'Damga Kartı';

    // Logo image present → omit logoText entirely (empty string still reserved
    // visually on some iOS versions if set). Name stays on organizationName.
    const logoText = logoArt?.logo
      ? undefined
      : tenant.logoText?.trim() || orgName;

    return this.apple.createPkPass({
      serialNumber: this.appleSerial(customer.id),
      organizationName: orgName,
      description:
        tenant.passDescription?.trim() || `${orgName} Damga Kartı`,
      logoText: logoText ?? undefined,
      backgroundColor: tenant.primaryColor ?? '#1B4332',
      foregroundColor: tenant.foregroundColor ?? '#FFFFFF',
      labelColor: tenant.labelColor ?? '#DCDCDC',
      stampCount: customer.stampCount,
      stampsRequired: rule.stampsRequired,
      rewardLabel: rule.rewardLabel,
      rewardReady: customer.rewardReady,
      barcodeMessage: customer.id,
      barcodeFormat: tenant.barcodeFormat ?? 'QR',
      stampFieldLabel: tenant.stampFieldLabel ?? undefined,
      rewardFieldLabel: tenant.rewardFieldLabel ?? undefined,
      statusFieldLabel: tenant.statusFieldLabel ?? undefined,
      broadcastFieldLabel: tenant.broadcastFieldLabel ?? undefined,
      broadcastEmptyText: tenant.broadcastEmptyText ?? undefined,
      showStampField: tenant.showStampField,
      showRewardField: tenant.showRewardField,
      showStatusField: tenant.showStatusField,
      showBroadcastField: tenant.showBroadcastField,
      rewardReadyText: tenant.rewardReadyText ?? undefined,
      stampsRemainingTemplate: tenant.stampsRemainingTemplate ?? undefined,
      headerFieldLabel: tenant.headerFieldLabel ?? undefined,
      stampChangeMessage: tenant.stampChangeMessage ?? undefined,
      rewardChangeMessage: tenant.rewardChangeMessage ?? undefined,
      statusChangeMessage: tenant.statusChangeMessage ?? undefined,
      headerChangeMessage: tenant.headerChangeMessage ?? undefined,
      redeemChangeMessage: tenant.redeemChangeMessage ?? undefined,
      birthdayMessage: tenant.birthdayMessage ?? undefined,
      customerDisplayName: customer.displayName,
      updateKind: this.notifyKindToUpdateKind(notifyKind),
      broadcastMessage: tenant.passBroadcastMessage,
      backFields: this.buildAppleBackFields(tenant),
      stripPng: stripArt.strip,
      strip2xPng: stripArt.strip2x,
      logoPng: logoArt?.logo,
      logo2xPng: logoArt?.logo2x,
      iconPng: iconArt?.icon,
      icon2xPng: iconArt?.icon2x,
      icon3xPng: iconArt?.icon3x,
      authenticationToken: authToken,
      webServiceURL: webServiceURL ?? undefined,
    });
  }

  async buildApplePkPass(token: string): Promise<Buffer> {
    if (!this.apple.isConfigured()) {
      throw new ServiceUnavailableException('Apple Wallet yapılandırılmamış');
    }
    const claims = this.verifyInviteToken(token);
    const { customer, tenant } = await this.loadCustomerContext(
      claims.sub,
      claims.tenantId,
    );
    if (!this.isInviteProfileComplete(customer, tenant)) {
      throw new BadRequestException(
        'Önce davet sayfasındaki bilgileri tamamlayın',
      );
    }
    const serial = this.appleSerial(claims.sub);
    const pass = await this.ensureApplePassRow(
      claims.tenantId,
      claims.sub,
      serial,
    );
    return this.createPkPassBuffer(
      claims.sub,
      claims.tenantId,
      pass.authenticationToken!,
    );
  }

  async registerAppleDevice(input: {
    deviceLibraryIdentifier: string;
    passTypeIdentifier: string;
    serialNumber: string;
    pushToken: string;
    authorization?: string;
  }) {
    const expectedType = this.config.get<string>('APPLE_PASS_TYPE_ID');
    if (expectedType && input.passTypeIdentifier !== expectedType) {
      throw new NotFoundException();
    }

    const pass = await this.prisma.pass.findUnique({
      where: {
        platform_externalId: {
          platform: PassPlatform.APPLE,
          externalId: input.serialNumber,
        },
      },
    });
    if (!pass) throw new NotFoundException();
    this.assertApplePassAuth(input.authorization, pass.authenticationToken);

    await this.prisma.appleDeviceRegistration.upsert({
      where: {
        deviceLibraryIdentifier_passId: {
          deviceLibraryIdentifier: input.deviceLibraryIdentifier,
          passId: pass.id,
        },
      },
      create: {
        deviceLibraryIdentifier: input.deviceLibraryIdentifier,
        passTypeIdentifier: input.passTypeIdentifier,
        pushToken: input.pushToken,
        passId: pass.id,
      },
      update: {
        pushToken: input.pushToken,
        passTypeIdentifier: input.passTypeIdentifier,
      },
    });

    this.logger.log(
      `Apple device kayıt: ${input.deviceLibraryIdentifier} → ${input.serialNumber}`,
    );

    // Kart Wallet’a eklendi — bugün doğum günüyse hemen bildir (cron’u bekleme).
    // Kısa gecikme: cihaz kaydı + APNs hazır olsun.
    void (async () => {
      await new Promise((r) => setTimeout(r, 2000));
      await this.maybeNotifyBirthdayOnPassReady(pass.customerId, pass.tenantId);
    })().catch((err) =>
      this.logger.warn(
        `Kart ekleme doğum günü kontrolü: ${(err as Error).message}`,
      ),
    );
  }

  async unregisterAppleDevice(input: {
    deviceLibraryIdentifier: string;
    passTypeIdentifier: string;
    serialNumber: string;
    authorization?: string;
  }) {
    const pass = await this.prisma.pass.findUnique({
      where: {
        platform_externalId: {
          platform: PassPlatform.APPLE,
          externalId: input.serialNumber,
        },
      },
    });
    if (!pass) return;
    this.assertApplePassAuth(input.authorization, pass.authenticationToken);

    await this.prisma.appleDeviceRegistration.deleteMany({
      where: {
        deviceLibraryIdentifier: input.deviceLibraryIdentifier,
        passId: pass.id,
      },
    });
  }

  async listUpdatableApplePasses(input: {
    deviceLibraryIdentifier: string;
    passTypeIdentifier: string;
    passesUpdatedSince?: string;
  }): Promise<{ lastUpdated: string; serialNumbers: string[] } | null> {
    const regs = await this.prisma.appleDeviceRegistration.findMany({
      where: {
        deviceLibraryIdentifier: input.deviceLibraryIdentifier,
        passTypeIdentifier: input.passTypeIdentifier,
      },
      include: { pass: true },
    });
    if (regs.length === 0) return null;

    const sinceRaw = input.passesUpdatedSince?.trim();
    const sinceNum = sinceRaw ? Number.parseInt(sinceRaw, 10) : NaN;
    // Eski contentVersion tag'i (örn. "30") yeni serial'da kırılıyordu → spurious push.
    // 1e12 altı = legacy; bundan sonra unix-ms kullanıyoruz.
    const legacyTag =
      Number.isFinite(sinceNum) && sinceNum < 1_000_000_000_000;

    const updated = regs.filter((r) => {
      if (!sinceRaw || !Number.isFinite(sinceNum)) return true;
      if (legacyTag) return true;
      return r.pass.updatedAt.getTime() > sinceNum;
    });
    if (updated.length === 0) return null;

    const lastUpdated = String(
      Math.max(...updated.map((r) => r.pass.updatedAt.getTime())),
    );
    return {
      lastUpdated,
      serialNumbers: updated.map((r) => r.pass.externalId),
    };
  }

  async buildApplePkPassForSerial(input: {
    passTypeIdentifier: string;
    serialNumber: string;
    authorization?: string;
  }): Promise<{ buffer: Buffer; updatedAt: Date }> {
    if (!this.apple.isConfigured()) {
      throw new ServiceUnavailableException('Apple Wallet yapılandırılmamış');
    }
    const expectedType = this.config.get<string>('APPLE_PASS_TYPE_ID');
    if (expectedType && input.passTypeIdentifier !== expectedType) {
      throw new NotFoundException();
    }

    const pass = await this.prisma.pass.findUnique({
      where: {
        platform_externalId: {
          platform: PassPlatform.APPLE,
          externalId: input.serialNumber,
        },
      },
    });
    if (!pass) throw new NotFoundException();
    this.assertApplePassAuth(input.authorization, pass.authenticationToken);

    const buffer = await this.createPkPassBuffer(
      pass.customerId,
      pass.tenantId,
      pass.authenticationToken!,
      pass.pendingNotifyKind,
    );

    if (pass.pendingNotifyKind) {
      await this.prisma.pass.update({
        where: { id: pass.id },
        data: { pendingNotifyKind: null },
      });
    }

    return { buffer, updatedAt: pass.updatedAt };
  }
}
