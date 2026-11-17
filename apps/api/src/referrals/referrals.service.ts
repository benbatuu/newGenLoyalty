import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StampSource } from '@prisma/client';
import * as crypto from 'crypto';
import { PiiService } from '../pii/pii.service';
import { PrismaService } from '../prisma/prisma.service';
import { StampsService } from '../stamps/stamps.service';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stamps: StampsService,
    private readonly pii: PiiService,
  ) {}

  /** Liste satırı için müşteri alanları (telefon maskeli döner) */
  private readonly customerSelect = {
    id: true,
    displayName: true,
    phone: true,
    phoneEnc: true,
    phoneLast4: true,
  } as const;

  private maskCustomer(c: {
    id: string;
    displayName: string | null;
    phone: string | null;
    phoneEnc: string | null;
    phoneLast4: string | null;
  }) {
    return {
      id: c.id,
      displayName: c.displayName,
      phone: this.pii.phoneMasked(c),
    };
  }

  private async codeRow(id: string) {
    const row = await this.prisma.referralCode.findUniqueOrThrow({
      where: { id },
      include: {
        customer: { select: this.customerSelect },
        _count: { select: { redemptions: true } },
      },
    });
    return { ...row, customer: this.maskCustomer(row.customer) };
  }

  /** Telefonla tam eşleşen müşteri (10 hane) */
  private async customerByPhone(tenantId: string, phoneRaw: string) {
    const digits = phoneRaw.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      throw new BadRequestException('Geçerli bir telefon numarası girin');
    }
    const customer = await this.prisma.customer.findFirst({
      where: this.pii.phoneLookupFilter(tenantId, digits),
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException(
        'Bu numarayla kayıtlı müşteri yok. Önce tezgâhta kaydedin.',
      );
    }
    return customer;
  }

  /**
   * Sayfa açılışı için tek istek: kodlar + özet + son kullanımlar.
   */
  async overview(tenantId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [codes, recent, last30] = await Promise.all([
      this.prisma.referralCode.findMany({
        where: { tenantId, isActive: true },
        include: {
          customer: { select: this.customerSelect },
          _count: { select: { redemptions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referralRedemption.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          referee: { select: this.customerSelect },
          referralCode: {
            select: {
              code: true,
              rewardStamps: true,
              customer: { select: this.customerSelect },
            },
          },
        },
      }),
      this.prisma.referralRedemption.count({
        where: { tenantId, createdAt: { gte: since } },
      }),
    ]);
    return {
      codes: codes.map((c) => ({ ...c, customer: this.maskCustomer(c.customer) })),
      recent: recent.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        code: r.referralCode.code,
        rewardStamps: r.referralCode.rewardStamps,
        referrer: this.maskCustomer(r.referralCode.customer),
        referee: this.maskCustomer(r.referee),
      })),
      stats: {
        activeCodes: codes.length,
        totalRedemptions: codes.reduce((s, c) => s + c._count.redemptions, 0),
        last30Days: last30,
      },
    };
  }

  /** Telefonla kod üret veya mevcut kodu getir — tek istek */
  async generateByPhone(tenantId: string, phone: string) {
    const customer = await this.customerByPhone(tenantId, phone);
    const before = await this.prisma.referralCode.findFirst({
      where: { tenantId, customerId: customer.id, isActive: true },
      select: { id: true },
    });
    const row = before ?? (await this.generateCode(tenantId, customer.id));
    return { created: !before, code: await this.codeRow(row.id) };
  }

  /** Kodu telefonla kullan — tek istek */
  async redeemByPhone(
    tenantId: string,
    code: string,
    phone: string,
    actorUserId: string,
  ) {
    const referee = await this.customerByPhone(tenantId, phone);
    const result = await this.redeem(tenantId, referee.id, code, actorUserId);
    return { ok: true, code: result.code, referrerRewardStamps: result.referrerRewardStamps };
  }

  private randomCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  async generateCode(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');

    const existing = await this.prisma.referralCode.findFirst({
      where: { tenantId, customerId, isActive: true },
    });
    if (existing) return existing;

    let code = this.randomCode();
    for (let i = 0; i < 5; i++) {
      const taken = await this.prisma.referralCode.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (!taken) break;
      code = this.randomCode();
    }

    return this.prisma.referralCode.create({
      data: {
        tenantId,
        customerId,
        code,
        rewardStamps: 1,
      },
    });
  }

  async listCodes(tenantId: string, customerId?: string) {
    const rows = await this.prisma.referralCode.findMany({
      where: {
        tenantId,
        ...(customerId ? { customerId } : {}),
        isActive: true,
      },
      include: {
        customer: { select: this.customerSelect },
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, customer: this.maskCustomer(r.customer) }));
  }

  async redeem(
    tenantId: string,
    refereeId: string,
    code: string,
    actorUserId: string,
  ) {
    const normalized = code.trim().toUpperCase();
    const referral = await this.prisma.referralCode.findFirst({
      where: { tenantId, code: normalized, isActive: true },
      include: { customer: true },
    });
    if (!referral) {
      throw new NotFoundException('Geçersiz referans kodu');
    }

    if (referral.customerId === refereeId) {
      throw new BadRequestException('Kendi kodunuzu kullanamazsınız');
    }

    const referee = await this.prisma.customer.findFirst({
      where: { id: refereeId, tenantId },
    });
    if (!referee) throw new NotFoundException('Müşteri bulunamadı');

    const prior = await this.prisma.referralRedemption.findUnique({
      where: {
        referralCodeId_refereeId: {
          referralCodeId: referral.id,
          refereeId,
        },
      },
    });
    if (prior) {
      throw new ConflictException('Bu kod daha önce kullanıldı');
    }

    const refereeStamp = await this.stamps.addStamp(
      tenantId,
      refereeId,
      actorUserId,
    );

    for (let i = 0; i < referral.rewardStamps; i++) {
      await this.stamps.addStamp(
        tenantId,
        referral.customerId,
        actorUserId,
        StampSource.cashier,
        {
          skipPassSync: i < referral.rewardStamps - 1,
          bypassVisitLimits: true,
        },
      );
    }

    await this.prisma.referralRedemption.create({
      data: {
        tenantId,
        referralCodeId: referral.id,
        refereeId,
      },
    });

    return {
      ok: true,
      referee: refereeStamp,
      referrerRewardStamps: referral.rewardStamps,
      code: normalized,
    };
  }
}
