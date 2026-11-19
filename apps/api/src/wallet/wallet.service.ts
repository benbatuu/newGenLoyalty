import { resolvePassStyle } from './pass-style';
import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PassNotifyKind, PassPlatform, ProgramType, StampLedgerType } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { MultiStampService } from '../loyalty/multi-stamp.service';
import type { DiscountCardService } from '../loyalty/discount-card.service';
import type { EventCardService } from '../loyalty/event-card.service';
import type { PointCardService } from '../loyalty/point-card.service';
import type { MultiStampConfig } from '../loyalty/loyalty.types';
import {
  parseWalletTemplate,
  resolvePassBranding,
} from '../loyalty/wallet-template';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { AppleApnsService } from './apple-apns.service';
import { ApplePassService } from './apple-pass.service';
import { GoogleWalletService } from './google-wallet.service';
import { PassArtService } from './pass-art.service';
import {
  stripBroadcastStamps,
  withBroadcastMarker,
} from './broadcast-message.util';
import { parseInvitePolicies, sanitizeInviteLayout } from './invite-page';
import {
  WalletProgramService,
  applePassSerial,
  buildPassBarcodeMessage,
  parseApplePassSerial,
} from './wallet-program.service';
import { customerPhonePlain } from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';

type InviteClaims = {
  sub: string;
  tenantId: string;
  typ: 'wallet_invite';
  /** Seçili kartlar — yoksa tüm uygun aktif kartlar */
  programIds?: string[];
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
    private readonly multiStamp: MultiStampService,
    private readonly walletPrograms: WalletProgramService,
    private readonly moduleRef: ModuleRef,
    private readonly pii: PiiService,
    private readonly mail: MailService,
  ) {}

  private customerPhone(customer: {
    phone?: string | null;
    phoneEnc?: string | null;
  }): string {
    return customerPhonePlain(this.pii, customer);
  }

  private _pointCard?: PointCardService;
  private _discountCard?: DiscountCardService;
  private _eventCard?: EventCardService;

  /** Döngüsel import önlemek için lazy — Wallet ↔ Campaigns ↔ PointCard */
  private get pointCard(): PointCardService {
    if (!this._pointCard) {
      const { PointCardService: Svc } =
        require('../loyalty/point-card.service') as typeof import('../loyalty/point-card.service');
      this._pointCard = this.moduleRef.get(Svc, { strict: false });
    }
    return this._pointCard;
  }

  private get discountCard(): DiscountCardService {
    if (!this._discountCard) {
      const { DiscountCardService: Svc } =
        require('../loyalty/discount-card.service') as typeof import('../loyalty/discount-card.service');
      this._discountCard = this.moduleRef.get(Svc, { strict: false });
    }
    return this._discountCard;
  }

  private get eventCard(): EventCardService {
    if (!this._eventCard) {
      const { EventCardService: Svc } =
        require('../loyalty/event-card.service') as typeof import('../loyalty/event-card.service');
      this._eventCard = this.moduleRef.get(Svc, { strict: false });
    }
    return this._eventCard;
  }

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
  private appleSerial(customerId: string, programId?: string | null): string {
    return applePassSerial(
      customerId,
      programId,
      WalletService.APPLE_ICON_REV,
    );
  }

  /** Public base for invite/download links (phone must reach this). */
  private publicApiUrl(): string {
    const lan = this.config.get<string>('PUBLIC_API_URL')?.trim();
    if (lan) return lan.replace(/\/$/, '');
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

  listInvitePrograms(tenantId: string) {
    return this.walletPrograms.listEligiblePrograms(tenantId);
  }

  createInviteToken(
    customerId: string,
    tenantId: string,
    programIds?: string[],
  ): string {
    const claims: InviteClaims = {
      sub: customerId,
      tenantId,
      typ: 'wallet_invite',
    };
    if (programIds?.length) {
      claims.programIds = programIds;
    }
    return jwt.sign(claims, this.inviteSecret(), { expiresIn: '30d' });
  }

  verifyInviteToken(token: string): InviteClaims {
    const payload = jwt.verify(token, this.inviteSecret()) as InviteClaims;
    if (payload.typ !== 'wallet_invite' || !payload.sub || !payload.tenantId) {
      throw new NotFoundException('Geçersiz wallet davet linki');
    }
    return payload;
  }

  /** Kısa davet linki üretir (kayıt kaydedilir, süresi 30 gün) */
  async inviteUrl(
    customerId: string,
    tenantId: string,
    programIds?: string[],
  ): Promise<string> {
    const code = await this.newShortCode();
    await this.prisma.walletShortLink.create({
      data: {
        code,
        tenantId,
        customerId,
        programIds: programIds?.length ? programIds : undefined,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return `${this.publicApiUrl()}/wallet/i/${code}`;
  }

  private async newShortCode(): Promise<string> {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from({ length: 7 }, () => alphabet[randomInt(alphabet.length)]).join('');
      const exists = await this.prisma.walletShortLink.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new ServiceUnavailableException('Davet kodu üretilemedi');
  }

  /** Kısa koddan davet token'ı üretir; süresi dolmuş ya da yoksa hata */
  async tokenForShortCode(code: string): Promise<string> {
    const row = await this.prisma.walletShortLink.findUnique({ where: { code } });
    if (!row || row.expiresAt < new Date()) {
      throw new NotFoundException('Davet linki geçersiz veya süresi dolmuş');
    }
    const programIds = Array.isArray(row.programIds) ? (row.programIds as string[]) : undefined;
    return this.createInviteToken(row.customerId, row.tenantId, programIds);
  }

  async createWalletInvite(
    customerId: string,
    tenantId: string,
    programIds?: string[],
  ) {
    const resolved = await this.walletPrograms.resolveProgramIds(
      tenantId,
      programIds,
    );
    await this.walletPrograms.enrollCustomerPrograms(
      tenantId,
      customerId,
      resolved,
    );
    const link = await this.inviteUrl(customerId, tenantId, resolved);
    return { link, programIds: resolved };
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

    // Hedefli duyuru varsa bu müşterinin kartında o görünür (kafe geneli yerine)
    const tenant = {
      ...customer.tenant,
      passBroadcastMessage:
        customer.passNotice ?? customer.tenant.passBroadcastMessage,
    };
    return { customer, rule, tenant };
  }

  /** MultiStamp Mod A lane alanları + son damga bildirimi metni */
  private async buildPassEnrichment(
    tenantId: string,
    customerId: string,
    notifyKind?: PassNotifyKind | null,
  ): Promise<{
    extraAuxiliaryFields: { key: string; label: string; value: string }[];
    stampNotifyValue?: string;
  }> {
    const extraAuxiliaryFields: { key: string; label: string; value: string }[] =
      [];

    const multiProgram = await this.prisma.loyaltyProgram.findFirst({
      where: {
        tenantId,
        isActive: true,
        type: ProgramType.MULTI_STAMP,
      },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
    });

    if (multiProgram) {
      const config = this.multiStamp.parseConfig(multiProgram.config);
      if (config?.mode === 'LANES' && config.lanes?.length) {
        const cp = await this.prisma.customerProgram.findUnique({
          where: {
            customerId_programId: {
              customerId,
              programId: multiProgram.id,
            },
          },
        });
        const balances =
          (cp?.balances as Record<string, number> | null) ?? {};
        for (const lane of config.lanes.slice(0, 3)) {
          const used = balances[lane.id] ?? 0;
          const tier = multiProgram.tiers.find((t) => t.laneId === lane.id);
          const max = tier?.threshold ?? 10;
          extraAuxiliaryFields.push({
            key: `lane_${lane.id}`,
            label: lane.label,
            value: `${used}/${max}`,
          });
        }
      }
    }

    const pointProgram = await this.pointCard.findActivePointProgram(tenantId);
    if (pointProgram) {
      const config = this.pointCard.parseConfig(pointProgram.config);
      const cp = await this.prisma.customerProgram.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId: pointProgram.id,
          },
        },
      });
      const balance = cp?.balance ?? 0;
      const fields = this.pointCard.walletFields(config, balance);
      extraAuxiliaryFields.push({
        key: 'points_balance',
        label: fields.label,
        value: fields.value,
      });
      if (fields.hint && extraAuxiliaryFields.length < 4) {
        extraAuxiliaryFields.push({
          key: 'points_next',
          label: 'Sonraki ödül',
          value: fields.hint.slice(0, 40),
        });
      }
    }

    const discountProgram =
      await this.discountCard.findActiveDiscountProgram(tenantId);
    if (discountProgram && extraAuxiliaryFields.length < 4) {
      const config = this.discountCard.parseConfig(discountProgram.config);
      const cp = await this.prisma.customerProgram.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId: discountProgram.id,
          },
        },
      });
      const meta =
        cp?.metadata && typeof cp.metadata === 'object'
          ? (cp.metadata as Record<string, unknown>)
          : {};
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        select: { vipTierId: true },
      });
      const effective = this.discountCard.resolveEffectiveDiscount(config, {
        visitCount: Number(meta.visitCount ?? 0),
        lifetimeSpendKurus: Number(meta.lifetimeSpendKurus ?? 0),
        vipTierId: customer?.vipTierId,
      });
      const fields = this.discountCard.walletFields(config, effective, meta);
      extraAuxiliaryFields.push({
        key: 'discount_value',
        label: fields.label,
        value: fields.value,
      });
      if (fields.hint && extraAuxiliaryFields.length < 4) {
        extraAuxiliaryFields.push({
          key: 'discount_usage',
          label: 'Kullanım',
          value: fields.hint.slice(0, 40),
        });
      }
    }

    const eventProgram = await this.eventCard.findActiveEventProgram(tenantId);
    if (eventProgram && extraAuxiliaryFields.length < 4) {
      const config = this.eventCard.parseConfig(eventProgram.config);
      const cp = await this.prisma.customerProgram.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId: eventProgram.id,
          },
        },
      });
      const meta =
        cp?.metadata && typeof cp.metadata === 'object'
          ? (cp.metadata as Record<string, unknown>)
          : {};
      const fields = this.eventCard.walletFields(config, meta);
      extraAuxiliaryFields.push({
        key: 'event_entry',
        label: fields.label,
        value: fields.value,
      });
      if (fields.hint && extraAuxiliaryFields.length < 4) {
        extraAuxiliaryFields.push({
          key: 'event_date',
          label: 'Tarih',
          value: fields.hint.slice(0, 40),
        });
      }
    }

    let stampNotifyValue: string | undefined;
    if (notifyKind === PassNotifyKind.STAMP) {
      const lastPoint = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          customerId,
          type: StampLedgerType.POINT_EARN,
        },
        orderBy: { createdAt: 'desc' },
      });
      const lastStamp = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          customerId,
          type: StampLedgerType.STAMP,
        },
        orderBy: { createdAt: 'desc' },
      });
      const usePoint =
        lastPoint &&
        (!lastStamp ||
          lastPoint.createdAt.getTime() >= lastStamp.createdAt.getTime());
      if (usePoint && lastPoint) {
        stampNotifyValue = this.formatPointNotifyValue(
          lastPoint.amount,
          lastPoint.metadata,
        );
      } else {
        const last = lastStamp;
        if (last) {
          stampNotifyValue = this.formatStampNotifyValue(
            last.amount,
            last.metadata,
            multiProgram?.config,
          );
        }
      }
    }

    return { extraAuxiliaryFields, stampNotifyValue };
  }

  private formatPointNotifyValue(
    amount: number | null,
    metadata: unknown,
  ): string | undefined {
    const meta =
      metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>)
        : {};
    const pts = amount ?? Number(meta.finalPoints ?? 0);
    const campMult = Number(meta.campaignMultiplier ?? 1);
    const parts: string[] = [`+${pts} puan`];
    if (campMult > 1) parts.push('kampanya');
    return parts.join(' ').slice(0, 80);
  }

  private formatStampNotifyValue(
    amount: number | null,
    metadata: unknown,
    programConfig: unknown,
  ): string | undefined {
    const meta =
      metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>)
        : {};
    const finalDelta = amount ?? Number(meta.finalDelta ?? 1);
    const baseDelta = Number(meta.baseDelta ?? finalDelta);
    const config = this.multiStamp.parseConfig(programConfig);

    const parts: string[] = [];
    if (finalDelta > 1) {
      parts.push(`+${finalDelta} damga`);
    } else {
      parts.push('Damga eklendi');
    }

    const groupId = meta.productGroupId as string | undefined;
    if (groupId && config?.mode === 'MULTIPLIER') {
      const group = config.productGroups?.find((g) => g.id === groupId);
      if (group) parts.push(`(${group.label})`);
    }

    if (finalDelta > baseDelta && baseDelta >= 1) {
      parts.push('kampanya');
    }

    return parts.join(' ').slice(0, 80);
  }

  private async ensureApplePassRow(
    tenantId: string,
    customerId: string,
    serial: string,
    programId?: string | null,
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
          programId: programId ?? null,
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
    opts?: { notifyKind?: PassNotifyKind; skipApple?: boolean },
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

    const applePasses = await this.prisma.pass.findMany({
      where: {
        tenantId,
        customerId,
        platform: PassPlatform.APPLE,
      },
    });

    const serialsToBump =
      applePasses.length > 0
        ? applePasses.map((p) => p.externalId)
        : [appleSerial];

    if (opts?.skipApple) {
      // Apple tarafı toplu yenileme ile zaten yapıldı (syncTenantPasses)
    } else if (this.apple.isConfigured()) {
      try {
        let totalDevices = 0;
        for (const serial of serialsToBump) {
          const parsed = parseApplePassSerial(serial);
          await this.ensureApplePassRow(
            tenantId,
            customer.id,
            serial,
            parsed.programId,
          );
          const pushed = await this.bumpApplePassAndPush(serial, opts?.notifyKind);
          totalDevices += pushed.deviceCount;
        }
        results.apple = {
          ok: true,
          externalId: serialsToBump[0]!,
          deviceCount: totalDevices,
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
    });

    // Apple: tek UPDATE + tek APNs çağrısı (müşteri başına sıralı işlem yok → yanıt hızlı)
    let devices = 0;
    if (this.apple.isConfigured() && customers.length > 0) {
      try {
        devices = (await this.bumpAllApplePassesForTenant(tenantId)).deviceCount;
      } catch (err) {
        this.logger.warn(`Tenant Apple bump: ${(err as Error).message}`);
      }
    }

    // Google (ve kalan müşteri işleri) arka planda — isteği bekletmez
    void this.syncGoogleInBackground(
      customers.map((c) => c.id),
      tenantId,
    );

    this.logger.log(
      `Tenant pass design sync: tenant=${tenantId} customers=${customers.length} devices=${devices}`,
    );
    return { synced: customers.length, devices };
  }

  private async bumpAllApplePassesForTenant(
    tenantId: string,
  ): Promise<{ deviceCount: number }> {
    const where = { tenantId, platform: PassPlatform.APPLE };
    await this.prisma.pass.updateMany({
      where,
      data: { contentVersion: { increment: 1 }, pendingNotifyKind: null },
    });
    const regs = await this.prisma.appleDeviceRegistration.findMany({
      where: { pass: where },
      select: { pushToken: true },
    });
    const tokens = [...new Set(regs.map((r) => r.pushToken))];
    if (tokens.length === 0) return { deviceCount: 0 };
    await this.apns.pushPassUpdate(tokens);
    return { deviceCount: tokens.length };
  }

  private async syncGoogleInBackground(
    customerIds: string[],
    tenantId: string,
  ): Promise<void> {
    const chunkSize = 10;
    for (let i = 0; i < customerIds.length; i += chunkSize) {
      const chunk = customerIds.slice(i, i + chunkSize);
      const outcomes = await Promise.allSettled(
        chunk.map((id) =>
          this.syncPasses(id, tenantId, { skipApple: true }),
        ),
      );
      for (const o of outcomes) {
        if (o.status === 'rejected') {
          this.logger.warn(
            `Tenant Google sync fail: ${(o.reason as Error)?.message ?? o.reason}`,
          );
        }
      }
    }
  }

  /**
   * Program (Kartlarım) tasarım/kural değişince ilgili Apple pass'leri yenile + APNs.
   */
  async syncProgramPasses(
    tenantId: string,
    programId: string,
    opts?: { includeLegacyPrimary?: boolean },
  ): Promise<{ synced: number; devices: number }> {
    if (!this.apple.isConfigured()) {
      this.logger.warn('Program pass sync atlandı — Apple Wallet yapılandırılmamış');
      return { synced: 0, devices: 0 };
    }

    const passes = await this.prisma.pass.findMany({
      where: {
        tenantId,
        platform: PassPlatform.APPLE,
        OR: [
          { programId },
          { programId: null, externalId: { contains: `_${programId}_` } },
          ...(opts?.includeLegacyPrimary ? [{ programId: null }] : []),
        ],
      },
      select: { externalId: true, customerId: true },
    });

    const uniquePasses = [
      ...new Map(passes.map((p) => [p.externalId, p])).values(),
    ];

    if (uniquePasses.length === 0) {
      this.logger.warn(
        `Program pass sync: kayıtlı pass yok (tenant=${tenantId} program=${programId})`,
      );
      return { synced: 0, devices: 0 };
    }

    const customers = new Set<string>();
    let devices = 0;

    for (const pass of uniquePasses) {
      try {
        const pushed = await this.bumpApplePassAndPush(pass.externalId);
        devices += pushed.deviceCount;
        customers.add(pass.customerId);
      } catch (err) {
        this.logger.warn(
          `Program pass bump fail serial=${pass.externalId}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Program pass sync: tenant=${tenantId} program=${programId} passes=${uniquePasses.length} customers=${customers.size} devices=${devices}`,
    );

    return { synced: customers.size, devices };
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
    const clean = stripBroadcastStamps(message);
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
    const previousRaw = tenant.passBroadcastMessage ?? '';
    const previousClean = stripBroadcastStamps(previousRaw);
    const value =
      previousClean === clean ? withBroadcastMarker(clean, previousRaw) : clean;

    const sentAt = new Date();
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        passBroadcastMessage: value,
        passBroadcastAt: sentAt,
      },
    });
    // Kafe geneli duyuru gidince eski hedefli duyurular silinir
    await this.prisma.customer.updateMany({
      where: { tenantId, passNotice: { not: null } },
      data: { passNotice: null, passNoticeAt: null },
    });

    const { synced, devices } = await this.syncTenantPasses(tenantId);

    await this.prisma.broadcastLog.create({
      data: {
        tenantId,
        message: clean,
        synced,
        devices,
        audience: 'all',
        audienceLabel: 'Herkes',
        targetCount: synced,
        createdAt: sentAt,
      },
    });

    return { message: clean, synced, devices, sentAt };
  }

  /**
   * Seçili müşteri kümesine duyuru: müşterinin kendi kartına yazılır,
   * sadece o müşterilerin kartları yenilenir.
   */
  async broadcastToCustomers(
    tenantId: string,
    customerIds: string[],
    message: string,
    audience: { type: 'segment' | 'vip'; label: string },
  ): Promise<{ message: string; synced: number; devices: number; targetCount: number; sentAt: Date }> {
    const clean = stripBroadcastStamps(message);
    if (clean.length < 2) {
      throw new BadRequestException('Bildirim metni en az 2 karakter olmalı');
    }
    if (clean.length > 120) {
      throw new BadRequestException('Bildirim metni en fazla 120 karakter');
    }
    const sentAt = new Date();
    if (customerIds.length === 0) {
      return { message: clean, synced: 0, devices: 0, targetCount: 0, sentAt };
    }

    await this.prisma.customer.updateMany({
      where: { tenantId, id: { in: customerIds } },
      data: { passNotice: clean, passNoticeAt: sentAt },
    });

    // Sadece kartı olan müşterileri yenile
    const withCards = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: customerIds }, passes: { some: {} } },
      select: { id: true },
    });

    let synced = 0;
    let devices = 0;
    const chunkSize = 10;
    for (let i = 0; i < withCards.length; i += chunkSize) {
      const chunk = withCards.slice(i, i + chunkSize);
      const outcomes = await Promise.allSettled(
        chunk.map((c) => this.syncPasses(c.id, tenantId)),
      );
      for (const o of outcomes) {
        if (o.status === 'fulfilled') {
          synced += 1;
          devices += o.value.apple?.deviceCount ?? 0;
        } else {
          this.logger.warn(
            `Targeted notice sync fail: ${(o.reason as Error)?.message ?? o.reason}`,
          );
        }
      }
    }

    await this.prisma.broadcastLog.create({
      data: {
        tenantId,
        message: clean,
        synced,
        devices,
        audience: audience.type,
        audienceLabel: audience.label,
        targetCount: customerIds.length,
        createdAt: sentAt,
      },
    });

    return { message: clean, synced, devices, targetCount: customerIds.length, sentAt };
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
      phone?: string | null;
      phoneEnc?: string | null;
      phoneLast4?: string | null;
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
      phone: this.pii.phoneMasked(customer),
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

  private buildAppleBackFields(
    tenant: {
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
  },
    program: ReturnType<typeof parseWalletTemplate>,
  ) {
    const fields: {
      key: string;
      label: string;
      value: string;
      attributedValue?: string;
      changeMessage?: string;
    }[] = [];
    // Program arka yüzü (admin "Arka yüz" sekmesi) önce gelir; anahtarlar tekil kalır
    const usedKeys = new Set<string>();
    (program?.backFields ?? []).forEach((f, i) => {
      const label = f?.label?.trim();
      const value = f?.value?.trim();
      if (!label || !value) return;
      let key = (f.key?.trim() || `prog${i + 1}`).replace(/[^A-Za-z0-9_-]/g, '');
      // Panelde "Şubeler / Adres" anahtarı 'address'; tenant şube alanıyla aynı anahtarı paylaşsın
      if (key === 'address') key = 'locations';
      if (!key || usedKeys.has(key)) key = `prog${i + 1}`;
      usedKeys.add(key);
      const attributed = f.attributedValue?.trim();
      fields.push({
        key,
        label: label.slice(0, 30),
        value: value.slice(0, 500),
        ...(attributed ? { attributedValue: attributed } : {}),
      });
    });
    const push = (
      key: string,
      defaultLabel: string,
      label: string | null | undefined,
      value: string | null | undefined,
      changeMessage?: string,
    ) => {
      const v = value?.trim();
      if (!v || usedKeys.has(key)) return;
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

  async sendWalletInviteSms(
    customerId: string,
    tenantId: string,
    linkOverride?: string,
  ) {
    const { customer, tenant } = await this.loadCustomerContext(
      customerId,
      tenantId,
    );
    const link = linkOverride ?? (await this.inviteUrl(customerId, tenantId));

    const body = [
      `${tenant.name} damga kartınız hazır.`,
      `Apple / Google Wallet'a eklemek için:`,
      link,
      ``,
      `KVKK: Bu SMS sadakat kartı kaydınız için gönderilmiştir. Ticari ileti değildir.`,
    ].join('\n');

    await this.sms.send({
      toPhone: this.customerPhone(customer),
      body,
      link,
      tenantId,
    });

    return { link };
  }

  async ensurePassesAndInvite(
    customerId: string,
    tenantId: string,
    programIds?: string[],
  ) {
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
    const invite = await this.createWalletInvite(
      customerId,
      tenantId,
      programIds,
    );
    await this.sendWalletInviteSms(customerId, tenantId, invite.link);
    await this.sendWalletInviteEmail(customerId, tenantId, invite.link);
    return { ...sync, inviteUrl: invite.link, programIds: invite.programIds };
  }

  /** Müşteri e-postası varsa kart davet bağlantısını e-postayla da gönderir. */
  private async sendWalletInviteEmail(customerId: string, tenantId: string, link: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { email: true, displayName: true, tenant: { select: { name: true } } },
    });
    if (!customer?.email) return;
    const body = this.mail.render(
      `${customer.tenant.name} sadakat kartınız hazır`,
      [
        `${customer.displayName ? `Merhaba ${customer.displayName}, ` : ''}sadakat kartınızı telefonunuza eklemek için aşağıdaki bağlantıyı kullanın.`,
      ],
      { label: 'Kartımı ekle', url: link },
    );
    const result = await this.mail.send({ to: customer.email, subject: `${customer.tenant.name} sadakat kartı daveti`, ...body });
    if (!result.ok) {
      this.logger.warn(`Wallet davet e-postası gönderilemedi: ${result.error ?? 'bilinmeyen hata'}`);
    }
  }

  async getInvitePageData(token: string) {
    const claims = this.verifyInviteToken(token);
    const { customer, rule, tenant } = await this.loadCustomerContext(
      claims.sub,
      claims.tenantId,
    );

    const programIds = await this.walletPrograms.resolveProgramIds(
      claims.tenantId,
      claims.programIds,
      claims.programIds?.length ? 'all' : 'primary',
    );

    const profileComplete = this.isInviteProfileComplete(customer, tenant);
    const needsName = tenant.collectCustomerName;
    const needsBirthday = tenant.collectCustomerBirthday;

    const baseUrl = this.publicApiUrl();
    const walletCards = await Promise.all(
      programIds.map(async (programId) => {
        const program = await this.prisma.loyaltyProgram.findFirst({
          where: { id: programId, tenantId: claims.tenantId },
          include: { tiers: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!program) return null;
        const card = this.walletPrograms.toWalletCard(program);
        let appleDownloadUrl: string | null = null;
        let googleSaveUrl: string | null = null;
        if (profileComplete) {
          if (this.apple.isConfigured()) {
            appleDownloadUrl = `${baseUrl}/wallet/apple/${token}/${programId}`;
          }
          if (this.google.isConfigured() && programIds.length === 1) {
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
        }
        return {
          ...card,
          appleDownloadUrl,
          googleSaveUrl,
        };
      }),
    );

    const cards = walletCards.filter(Boolean) as NonNullable<
      (typeof walletCards)[number]
    >[];

    const single = cards.length === 1 ? cards[0]! : null;

    const stampArt = await this.inviteStampArt(tenant, programIds[0]).catch(
      (err: Error) => {
        this.logger.warn(`Davet damga görünümü: ${err.message}`);
        return { stampTheme: 'COFFEE', stampIconFilledUrl: null, stampIconEmptyUrl: null };
      },
    );
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
      layout: sanitizeInviteLayout(tenant.inviteLayout),
      ...stampArt,
      invitePolicies: parseInvitePolicies(tenant.invitePolicies),
      stampCount: customer.stampCount,
      stampsRequired: rule.stampsRequired,
      rewardLabel: rule.rewardLabel,
      rewardReady: customer.rewardReady,
      appleAvailable: this.apple.isConfigured(),
      googleSaveUrl: single?.googleSaveUrl ?? null,
      appleDownloadUrl: single?.appleDownloadUrl ?? null,
      walletCards: cards,
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

  /** Gerçek self-enrollment QR (masa tenti) */
  enrollUrl(tenantSlug: string): string {
    return `${this.publicApiUrl()}/wallet/enroll/${tenantSlug}`;
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

    const stampArt = await this.inviteStampArt(tenant);
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
      layout: sanitizeInviteLayout(tenant.inviteLayout),
      ...stampArt,
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

  /** Davet sayfasında damga görünümü: birincil programın cüzdan tasarımı, yoksa marka ayarları */
  private async inviteStampArt(
    tenant: {
    id: string;
    stampTheme?: string | null;
    stampIconFilledUrl?: string | null;
    stampIconEmptyUrl?: string | null;
    primaryColor?: string | null;
    foregroundColor?: string | null;
    logoUrl?: string | null;
  } & Record<string, unknown>,
    programId?: string,
  ) {
    // Müşterinin kartındaki program; yoksa birincil program
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: programId
        ? { id: programId, tenantId: tenant.id }
        : { tenantId: tenant.id, isPrimary: true, isActive: true },
      select: { config: true },
    });
    const branding = resolvePassBranding(
      tenant as never,
      parseWalletTemplate(program?.config),
    );
    return {
      stampTheme: branding.stampTheme || 'COFFEE',
      stampIconFilledUrl: this.resolvePublicAssetUrl(branding.stampIconFilledUrl),
      stampIconEmptyUrl: this.resolvePublicAssetUrl(branding.stampIconEmptyUrl),
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
    programId?: string | null,
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

    const display = programId
      ? await this.walletPrograms.buildProgramPassDisplay(
          tenantId,
          customerId,
          programId,
          {
            stampCount: customer.stampCount,
            rewardReady: customer.rewardReady,
            stampsRequired: rule.stampsRequired,
            rewardLabel: rule.rewardLabel,
          },
        )
      : null;

    const stampCount = display?.stampCount ?? customer.stampCount;
    const stampsRequired = display?.stampsRequired ?? rule.stampsRequired;
    const rewardLabel = display?.rewardLabel ?? rule.rewardLabel;
    const rewardReady = display?.rewardReady ?? customer.rewardReady;

    let walletTemplate = null;
    let programType: string | null = null;
    if (programId) {
      const program = await this.prisma.loyaltyProgram.findFirst({
        where: { id: programId, tenantId },
        select: { config: true, type: true },
      });
      walletTemplate = parseWalletTemplate(program?.config);
      programType = program?.type ?? null;
    }
    const branding = resolvePassBranding(tenant, walletTemplate);

    const [stripArt, logoArt, iconArt, backgroundArt] = await Promise.all([
      this.passArt.buildStampStrip({
        theme: branding.stampTheme || 'COFFEE',
        stampCount,
        stampsRequired,
        backgroundColor: branding.primaryColor,
        foregroundColor: branding.foregroundColor,
        stampIconFilledUrl: branding.stampIconFilledUrl,
        stampIconEmptyUrl: branding.stampIconEmptyUrl,
        inset: branding.stampInset,
        stampRows: walletTemplate?.stampRows ?? null,
        stampLayout: walletTemplate?.stampLayout ?? null,
        stampGapX: walletTemplate?.stampGapX ?? null,
        stampGapY: walletTemplate?.stampGapY ?? null,
        stampLayoutOpts: {
          iconScale: walletTemplate?.stampIconScale ?? null,
          staggerRatio: walletTemplate?.stampStaggerRatio ?? null,
          offsetX: walletTemplate?.stampOffsetX ?? null,
          offsetY: walletTemplate?.stampOffsetY ?? null,
          manual: walletTemplate?.stampPositions ?? null,
          rowAdjust: walletTemplate?.stampRowAdjust ?? null,
        },
        slotFilled: display?.walletSlotFilled,
        slotStyles: display?.walletSlotStyles,
        customStripUrl: walletTemplate?.stripImageUrl,
      }),
      this.passArt.buildLogoAssets(branding.logoUrl),
      this.passArt.buildNotifyIconAssets(
        tenant.notifyIconUrl || branding.logoUrl || tenant.logoUrl,
        branding.primaryColor,
      ),
      this.passArt.buildBackgroundAssets(walletTemplate?.backgroundImageUrl),
    ]);

    const orgName = branding.orgName;

    // Logo varsa yalnızca kullanıcı açıkça üst yazı girdiyse onu göster (Apple logonun yanında yazar).
    // "" = kullanıcı üst yazıyı bilerek boşalttı → orgName ile doldurma
    const explicitLogoText = branding.logoText?.trim();
    const clearedTopText = branding.logoText === '';
    const logoText =
      logoArt?.logo || clearedTopText
        ? explicitLogoText || undefined
        : explicitLogoText || orgName;

    // Yardımcı (aux) alanlar kaldırıldı: ek alan üretimi yok
    const enrichment = programId
      ? { extraAuxiliaryFields: [], stampNotifyValue: undefined }
      : { extraAuxiliaryFields: [], stampNotifyValue: undefined };

    return this.apple.createPkPass({
      passStyle: resolvePassStyle(programType),
      serialNumber: this.appleSerial(customerId, programId),
      organizationName: orgName,
      description:
        branding.passDescription?.trim() ??
        display?.description ??
        tenant.passDescription?.trim() ??
        `${orgName} Damga Kartı`,
      logoText: logoText ?? undefined,
      backgroundColor: branding.primaryColor,
      foregroundColor: branding.foregroundColor,
      labelColor: branding.labelColor,
      stampCount,
      stampsRequired,
      rewardLabel,
      rewardReady,
      barcodeMessage: buildPassBarcodeMessage(customer.id, programId),
      barcodeFormat: walletTemplate?.barcodeFormat ?? tenant.barcodeFormat ?? 'QR',
      ...this.passKitExtras(walletTemplate),
      stampFieldLabel: display?.stampFieldLabel ?? branding.stampFieldLabel ?? undefined,
      rewardFieldLabel: display?.rewardFieldLabel ?? branding.rewardFieldLabel ?? undefined,
      statusFieldLabel: display?.statusFieldLabel ?? branding.statusFieldLabel ?? undefined,
      broadcastFieldLabel: tenant.broadcastFieldLabel ?? undefined,
      broadcastEmptyText: tenant.broadcastEmptyText ?? undefined,
      showStampField: branding.showStampField,
      showRewardField: branding.showRewardField,
      showStatusField: branding.showStatusField,
      // Program kartında ön yüz yalnızca panel önizlemesindeki alanları gösterir;
      // tenant duyurusu ön yüze eklenmez (arka yüz + changeMessage ile yine gider).
      showBroadcastField: programId ? false : tenant.showBroadcastField,
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
      backFields: this.buildAppleBackFields(tenant, walletTemplate),
      stripPng: stripArt.strip,
      strip2xPng: stripArt.strip2x,
      strip3xPng: stripArt.strip3x,
      backgroundPng: backgroundArt?.background,
      background2xPng: backgroundArt?.background2x,
      background3xPng: backgroundArt?.background3x,
      logoPng: logoArt?.logo,
      logo2xPng: logoArt?.logo2x,
      logo3xPng: logoArt?.logo3x,
      iconPng: iconArt?.icon,
      icon2xPng: iconArt?.icon2x,
      icon3xPng: iconArt?.icon3x,
      authenticationToken: authToken,
      webServiceURL: webServiceURL ?? undefined,
      extraAuxiliaryFields: enrichment.extraAuxiliaryFields,
      stampNotifyValue: enrichment.stampNotifyValue,
    });
  }

  /** walletTemplate → PassKit ek seçenekleri (Apple sınırlarına göre kırpılır) */
  private passKitExtras(
    wt: ReturnType<typeof parseWalletTemplate> | null,
  ): Partial<Parameters<ApplePassService['createPkPass']>[0]> {
    if (!wt) return {};
    const fields = (
      list: { key?: string; label: string; value: string }[] | null | undefined,
      prefix: string,
      max: number,
    ) =>
      (list ?? [])
        .filter((f) => f?.label?.trim() && f?.value?.trim())
        .slice(0, max)
        .map((f, i) => ({
          key: `${prefix}${i + 1}`,
          label: f.label.trim(),
          value: f.value.trim(),
        }));
    const locations = (wt.locations ?? [])
      .filter(
        (l) =>
          Number.isFinite(l?.latitude) &&
          Number.isFinite(l?.longitude) &&
          Math.abs(l.latitude) <= 90 &&
          Math.abs(l.longitude) <= 180,
      )
      .slice(0, 10)
      .map((l) => ({
        latitude: l.latitude,
        longitude: l.longitude,
        relevantText: l.relevantText ?? undefined,
      }));
    return {
      headerExtraFields: fields(wt.headerFields, 'hx', 2),
      // Yardımcı (aux) alanlar gösterilmiyor: Apple store card'da ikincil+yardımcı toplamını sınırlıyor
      auxCustomFields: [],
      showBarcode: wt.showBarcode ?? true,
      barcodeAltMode: wt.barcodeAltMode ?? 'CODE',
      barcodeAltText: wt.barcodeAltText ?? undefined,
      locations,
      relevantDate: wt.relevantDate ?? undefined,
      expirationDate: wt.expirationDate ?? undefined,
      suppressStripShine: wt.suppressStripShine ?? false,
      sharingProhibited: wt.sharingProhibited ?? false,
    };
  }

  async buildApplePkPass(token: string, programId?: string): Promise<Buffer> {
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

    const programIds = await this.walletPrograms.resolveProgramIds(
      claims.tenantId,
      claims.programIds,
      claims.programIds?.length ? 'all' : 'primary',
    );
    const targetProgramId =
      programId ??
      (programIds.length === 1 ? programIds[0]! : undefined);

    if (!targetProgramId && programIds.length > 1) {
      throw new BadRequestException('Hangi kartın ekleneceğini belirtin');
    }

    const serial = this.appleSerial(claims.sub, targetProgramId);
    const pass = await this.ensureApplePassRow(
      claims.tenantId,
      claims.sub,
      serial,
      targetProgramId ?? null,
    );
    return this.createPkPassBuffer(
      claims.sub,
      claims.tenantId,
      pass.authenticationToken!,
      null,
      targetProgramId ?? null,
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

    const parsed = parseApplePassSerial(input.serialNumber);
    const programId =
      pass.programId ?? parsed.programId ?? null;

    const buffer = await this.createPkPassBuffer(
      pass.customerId,
      pass.tenantId,
      pass.authenticationToken!,
      pass.pendingNotifyKind,
      programId,
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
