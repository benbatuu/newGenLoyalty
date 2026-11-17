import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProgramType, Prisma, Role, StampSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PointCardService } from '../loyalty/point-card.service';
import { CashbackCardService } from '../loyalty/cashback-card.service';
import { StampsService } from '../stamps/stamps.service';
import type { CreatePosIntegrationDto, UpdatePosIntegrationDto } from './dto/pos.dto';
import {
  AdisyoPosAdapter,
  GenericPosAdapter,
  MenuluxPosAdapter,
  RestajetPosAdapter,
  SimpraPosAdapter,
  resolvePosAdapter,
  type PosSaleEvent,
} from './pos-adapters';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stamps: StampsService,
    private readonly points: PointCardService,
    private readonly cashback: CashbackCardService,
    private readonly adisyo: AdisyoPosAdapter,
    private readonly simpra: SimpraPosAdapter,
    private readonly menulux: MenuluxPosAdapter,
    private readonly restajet: RestajetPosAdapter,
    private readonly generic: GenericPosAdapter,
  ) {}

  async listIntegrations(tenantId: string) {
    return this.prisma.posIntegration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIntegration(tenantId: string, dto: CreatePosIntegrationDto) {
    return this.prisma.posIntegration.create({
      data: {
        tenantId,
        provider: dto.provider.trim().toLowerCase(),
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async updateIntegration(
    tenantId: string,
    id: string,
    dto: UpdatePosIntegrationDto,
  ) {
    await this.getOwnedIntegration(tenantId, id);
    return this.prisma.posIntegration.update({
      where: { id },
      data: {
        ...(dto.config !== undefined
          ? { config: dto.config as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async listEvents(tenantId: string, integrationId: string) {
    await this.getOwnedIntegration(tenantId, integrationId);
    return this.prisma.posWebhookEvent.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async handleWebhook(integrationId: string, payload: unknown) {
    const integration = await this.prisma.posIntegration.findUnique({
      where: { id: integrationId },
      include: { tenant: { select: { id: true } } },
    });
    if (!integration || !integration.isActive) {
      throw new NotFoundException('POS entegrasyonu bulunamadı');
    }

    const adapter = resolvePosAdapter(
      integration.provider,
      this.adisyo,
      this.simpra,
      this.menulux,
      this.restajet,
      this.generic,
    );
    const sale = adapter.parseWebhook(payload);

    const externalId = sale?.externalId ?? null;
    let event;
    try {
      event = await this.prisma.posWebhookEvent.create({
        data: {
          integrationId,
          externalId,
          payload: payload as object,
          status: sale ? 'RECEIVED' : 'IGNORED',
        },
      });
    } catch {
      return { ok: true, duplicate: true };
    }

    if (!sale) {
      return { ok: true, eventId: event.id, processed: false };
    }

    try {
      const result = await this.processSale(integration.tenantId, sale);
      await this.prisma.posWebhookEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED' },
      });
      return { ok: true, eventId: event.id, processed: true, result };
    } catch (err) {
      await this.prisma.posWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          payload: {
            ...(typeof payload === 'object' && payload
              ? (payload as Record<string, unknown>)
              : {}),
            error: (err as Error).message,
          },
        },
      });
      this.logger.warn(
        `POS webhook failed ${integrationId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /** Stub — point earn veya stamp */
  async processSale(tenantId: string, sale: PosSaleEvent) {
    const actor = await this.prisma.user.findFirst({
      where: {
        tenantId,
        role: { in: [Role.STORE_OWNER, Role.CASHIER] },
        isActive: true,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!actor) {
      return { skipped: true, reason: 'no_actor_user' };
    }

    let customerId = sale.customerId;
    if (!customerId && sale.customerPhone) {
      const matches = await this.stamps.findByPhone(
        tenantId,
        sale.customerPhone,
      );
      customerId = matches[0]?.id;
    }

    if (!customerId) {
      return { skipped: true, reason: 'customer_not_found' };
    }

    const cashbackProgram = await this.cashback.findActiveCashbackProgram(tenantId);
    if (cashbackProgram && sale.amountKurus && sale.amountKurus > 0) {
      let netAmountKurus = sale.amountKurus;
      if (sale.creditAppliedKurus && sale.creditAppliedKurus > 0) {
        await this.cashback.redeemCredit(
          tenantId,
          cashbackProgram.id,
          customerId,
          actor.id,
          {
            amountKurus: sale.creditAppliedKurus,
            basketKurus: sale.amountKurus,
            source: StampSource.cashier,
            posReceiptId: sale.receiptId
              ? `${sale.receiptId}:redeem`
              : undefined,
          },
        );
        netAmountKurus = Math.max(0, sale.amountKurus - sale.creditAppliedKurus);
      }
      if (netAmountKurus > 0) {
        return this.cashback.earnCashback(
          tenantId,
          cashbackProgram.id,
          customerId,
          actor.id,
          {
            amountKurus: netAmountKurus,
            source: StampSource.cashier,
            posReceiptId: sale.receiptId ?? sale.externalId,
            confirmed: true,
          },
        );
      }
      return { skipped: true, reason: 'credit_only_sale' };
    }

    const pointProgram = await this.points.findActivePointProgram(tenantId);
    if (pointProgram && sale.amountKurus && sale.amountKurus > 0) {
      return this.points.earnPoints(
        tenantId,
        pointProgram.id,
        customerId,
        actor.id,
        {
          amountKurus: sale.amountKurus,
          source: StampSource.cashier,
          posReceiptId: sale.receiptId ?? sale.externalId,
        },
      );
    }

    const primary = await this.prisma.loyaltyProgram.findFirst({
      where: {
        tenantId,
        isActive: true,
        isPrimary: true,
        type: { in: [ProgramType.STAMP_CARD, ProgramType.MULTI_STAMP] },
      },
    });
    if (primary) {
      return this.stamps.addStamp(
        tenantId,
        customerId,
        actor.id,
        StampSource.cashier,
      );
    }

    return { skipped: true, reason: 'no_program' };
  }

  private async getOwnedIntegration(tenantId: string, id: string) {
    const row = await this.prisma.posIntegration.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('POS entegrasyonu bulunamadı');
    return row;
  }
}
