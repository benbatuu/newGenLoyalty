import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgramType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketplaceBridgeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Wallet balances for a customer — no PII beyond program state */
  async getCustomerPrograms(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, tenantId: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: {
          tr: 'Müşteri bulunamadı',
          en: 'Customer not found',
          ru: 'Клиент не найден',
        },
      });
    }

    const rows = await this.prisma.customerProgram.findMany({
      where: {
        customerId,
        program: {
          isActive: true,
          type: { not: ProgramType.STAFF_CARD },
        },
      },
      include: {
        program: {
          select: {
            id: true,
            type: true,
            name: true,
            config: true,
            tiers: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((cp) => {
      const config = (cp.program.config ?? {}) as Record<string, unknown>;
      const goal =
        typeof config.stampsRequired === 'number'
          ? (config.stampsRequired as number)
          : cp.program.tiers[0]?.threshold ?? null;
      return {
        customerProgramId: cp.id,
        programId: cp.programId,
        type: cp.program.type,
        name: cp.program.name,
        balance: cp.balance,
        balances: (cp.balances as Record<string, number> | null) ?? null,
        rewardReady: cp.rewardReady,
        goal,
      };
    });
  }

  /** Ledger / history for wallet — cursor = createdAt ISO or id */
  async getCustomerLedger(customerId: string, cursor?: string, take = 30) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: {
          tr: 'Müşteri bulunamadı',
          en: 'Customer not found',
          ru: 'Клиент не найден',
        },
      });
    }

    const limit = Math.min(Math.max(take, 1), 100);
    const rows = await this.prisma.stampLedger.findMany({
      where: {
        customerId,
        ...(cursor
          ? { createdAt: { lt: new Date(cursor) } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        type: true,
        amount: true,
        note: true,
        createdAt: true,
        programId: true,
        branch: { select: { name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? page[page.length - 1]?.createdAt.toISOString() ?? null
      : null;

    return {
      items: page.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        note: r.note,
        branchName: r.branch?.name ?? null,
        createdAt: r.createdAt.toISOString(),
        programId: r.programId,
      })),
      nextCursor,
    };
  }

  /**
   * Tenants opted into Marketplace listing.
   * Uses raw SQL so missing columns (pre-migrate) degrade gracefully.
   */
  async listMarketplaceTenants() {
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          slug: string;
          name: string;
          marketplacePlanSlug: string | null;
        }>
      >`
        SELECT id, slug, name, "marketplacePlanSlug"
        FROM "Tenant"
        WHERE "isActive" = true
          AND "marketplaceListingEnabled" = true
        ORDER BY "updatedAt" DESC
        LIMIT 500
      `;
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        marketplacePlanSlug: r.marketplacePlanSlug ?? null,
      }));
    } catch {
      // Columns not migrated yet — empty list (do not crash bridge)
      return [];
    }
  }
}
