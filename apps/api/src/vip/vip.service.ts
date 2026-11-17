import { Injectable, NotFoundException } from '@nestjs/common';
import { StampLedgerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVipTierDto, UpdateVipTierDto } from './dto/vip.dto';

type Threshold = { minSpendKurus: number; minVisits: number };

/** Kolaydan zora: önce harcama, sonra ziyaret eşiği. Elle girilen sıra kullanılmaz. */
function byThreshold(a: Threshold, b: Threshold) {
  return a.minSpendKurus - b.minSpendKurus || a.minVisits - b.minVisits;
}

const withCount = { _count: { select: { customers: true } } } as const;

@Injectable()
export class VipService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.vipTier.findMany({
      where: { tenantId },
      include: withCount,
    });
    return rows.sort(byThreshold);
  }

  /** Yanıt listeyle aynı şekilde (_count dahil) — istemci tekrar GET atmaz */
  async create(tenantId: string, dto: CreateVipTierDto) {
    return this.prisma.vipTier.create({
      include: withCount,
      data: {
        tenantId,
        name: dto.name.trim(),
        minVisits: dto.minVisits ?? 0,
        minSpendKurus: dto.minSpendKurus ?? 0,
        rateMultiplier: dto.rateMultiplier ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateVipTierDto) {
    await this.getOwned(tenantId, id);
    return this.prisma.vipTier.update({
      where: { id },
      include: withCount,
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.minVisits !== undefined ? { minVisits: dto.minVisits } : {}),
        ...(dto.minSpendKurus !== undefined
          ? { minSpendKurus: dto.minSpendKurus }
          : {}),
        ...(dto.rateMultiplier !== undefined
          ? { rateMultiplier: dto.rateMultiplier }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.getOwned(tenantId, id);
    // Customer.vipTierId onDelete: SetNull — müşteriler otomatik seviyesiz kalır
    await this.prisma.vipTier.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Damga / puan / cashback işleminden sonra otomatik seviye atama.
   * Ziyaret = kazanç işlemi sayısı; harcama = kartlarda biriken gerçek TL (kuruş).
   * Müşteri iki eşiği de geçtiği en yüksek seviyeye atanır.
   */
  async maybeUpgradeTier(tenantId: string, customerId: string) {
    const tiers = await this.prisma.vipTier.findMany({ where: { tenantId } });
    if (tiers.length === 0) return null;

    const [visitCount, programs] = await Promise.all([
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          customerId,
          type: {
            in: [
              StampLedgerType.STAMP,
              StampLedgerType.POINT_EARN,
              StampLedgerType.CASHBACK_EARN,
            ],
          },
        },
      }),
      this.prisma.customerProgram.findMany({
        where: { tenantId, customerId },
        select: { metadata: true },
      }),
    ]);

    const spendKurus = programs.reduce((sum, p) => {
      const meta = p.metadata as { lifetimeSpendKurus?: unknown } | null;
      const v = Number(meta?.lifetimeSpendKurus ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    const matched = [...tiers]
      .sort(byThreshold)
      .reverse()
      .find((t) => visitCount >= t.minVisits && spendKurus >= t.minSpendKurus);
    if (!matched) return null;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { vipTierId: true },
    });
    if (customer?.vipTierId === matched.id) return matched;

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { vipTierId: matched.id },
    });

    return matched;
  }

  /** Müşterinin VIP seviyesindeki kazanç çarpanı; seviye yoksa 1 */
  async multiplierFor(tenantId: string, customerId: string): Promise<number> {
    const c = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { vipTier: { select: { rateMultiplier: true } } },
    });
    const m = c?.vipTier?.rateMultiplier ?? 1;
    return Number.isFinite(m) && m > 1 ? m : 1;
  }

  async getCustomerTier(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { vipTier: true },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');
    return {
      customerId: customer.id,
      vipTier: customer.vipTier,
    };
  }

  private async getOwned(tenantId: string, id: string) {
    const row = await this.prisma.vipTier.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('VIP katmanı bulunamadı');
    return row;
  }
}
