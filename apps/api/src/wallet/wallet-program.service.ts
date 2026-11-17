import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ProgramType } from '@prisma/client';
import {
  buildMultiStampWalletLayoutForProgram,
  buildSlotStylesFromLayout,
  defaultGroupStampTheme,
  type GroupStampStyle,
} from '@ngl/shared';
import { parseWalletTemplate } from '../loyalty/wallet-template';
import type { CashbackCardService } from '../loyalty/cashback-card.service';
import type { DiscountCardService } from '../loyalty/discount-card.service';
import type { EventCardService } from '../loyalty/event-card.service';
import type { MultiStampService } from '../loyalty/multi-stamp.service';
import type { PointCardService } from '../loyalty/point-card.service';
import { PrismaService } from '../prisma/prisma.service';

/** Wallet davet / pass üretimine dahil kart tipleri.
 *  MEMBERSHIP_CARD ve STAFF_CARD kasada çalışır; Wallet pass politikası gereği
 *  davet listesine dahil edilmez (operasyonel kart, müşteri cüzdanı değil). */
export const WALLET_ELIGIBLE_PROGRAM_TYPES: ProgramType[] = [
  ProgramType.STAMP_CARD,
  ProgramType.MULTI_STAMP,
  ProgramType.POINT_CARD,
  ProgramType.CASHBACK_CARD,
  ProgramType.DISCOUNT_CARD,
  ProgramType.EVENT_CARD,
];

export const PROGRAM_TYPE_LABELS: Record<string, string> = {
  STAMP_CARD: 'Damga kartı',
  MULTI_STAMP: 'Çoklu damga',
  POINT_CARD: 'Puan kartı',
  CASHBACK_CARD: 'Cashback kartı',
  DISCOUNT_CARD: 'İndirim kartı',
  EVENT_CARD: 'Etkinlik kartı',
};

export type WalletProgramCard = {
  programId: string;
  name: string;
  type: ProgramType;
  typeLabel: string;
  summary: string;
};

export type ProgramPassDisplay = {
  description: string;
  stampCount: number;
  stampsRequired: number;
  rewardLabel: string;
  rewardReady: boolean;
  stampFieldLabel?: string;
  rewardFieldLabel?: string;
  statusFieldLabel?: string;
  extraAuxiliaryFields: { key: string; label: string; value: string }[];
  /** Multi-stamp LANES: birleşik şerit slot durumu */
  walletSlotFilled?: boolean[];
  /** Multi-stamp: slot başına grup damga stili */
  walletSlotStyles?: GroupStampStyle[];
};

@Injectable()
export class WalletProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private _multiStamp?: MultiStampService;
  private _pointCard?: PointCardService;
  private _discountCard?: DiscountCardService;
  private _cashbackCard?: CashbackCardService;
  private _eventCard?: EventCardService;

  private get multiStamp(): MultiStampService {
    if (!this._multiStamp) {
      const { MultiStampService: Svc } =
        require('../loyalty/multi-stamp.service') as typeof import('../loyalty/multi-stamp.service');
      this._multiStamp = this.moduleRef.get(Svc, { strict: false });
    }
    return this._multiStamp;
  }

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

  private get cashbackCard(): CashbackCardService {
    if (!this._cashbackCard) {
      const { CashbackCardService: Svc } =
        require('../loyalty/cashback-card.service') as typeof import('../loyalty/cashback-card.service');
      this._cashbackCard = this.moduleRef.get(Svc, { strict: false });
    }
    return this._cashbackCard;
  }

  private get eventCard(): EventCardService {
    if (!this._eventCard) {
      const { EventCardService: Svc } =
        require('../loyalty/event-card.service') as typeof import('../loyalty/event-card.service');
      this._eventCard = this.moduleRef.get(Svc, { strict: false });
    }
    return this._eventCard;
  }

  async listEligiblePrograms(tenantId: string) {
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: {
        tenantId,
        isActive: true,
        type: { in: WALLET_ELIGIBLE_PROGRAM_TYPES },
      },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return programs.map((p) => this.toWalletCard(p));
  }

  async resolveProgramIds(
    tenantId: string,
    programIds?: string[] | null,
    fallback: 'all' | 'primary' = 'all',
  ): Promise<string[]> {
    if (!programIds?.length) {
      if (fallback === 'primary') {
        const primary = await this.prisma.loyaltyProgram.findFirst({
          where: {
            tenantId,
            isActive: true,
            isPrimary: true,
            type: { in: WALLET_ELIGIBLE_PROGRAM_TYPES },
          },
          select: { id: true },
        });
        if (primary) return [primary.id];
      }
      const all = await this.listEligiblePrograms(tenantId);
      if (all.length === 0) {
        throw new BadRequestException('Wallet için uygun aktif kart yok');
      }
      return all.map((p) => p.programId);
    }
    const unique = [...new Set(programIds)];
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: {
        tenantId,
        id: { in: unique },
        isActive: true,
        type: { in: WALLET_ELIGIBLE_PROGRAM_TYPES },
      },
      select: { id: true },
    });
    if (programs.length === 0) {
      throw new BadRequestException('Seçilen kartlar geçerli değil');
    }
    return programs.map((p) => p.id);
  }

  async enrollCustomerPrograms(
    tenantId: string,
    customerId: string,
    programIds: string[],
  ) {
    for (const programId of programIds) {
      await this.prisma.customerProgram.upsert({
        where: {
          customerId_programId: { customerId, programId },
        },
        create: {
          id: `cp_${customerId}_${programId}`,
          tenantId,
          customerId,
          programId,
          balance: 0,
        },
        update: {},
      });
    }
  }

  toWalletCard(program: {
    id: string;
    name: string;
    type: ProgramType;
    tiers: { threshold: number; rewardLabel: string }[];
  }): WalletProgramCard {
    const tier = program.tiers[0];
    let summary = PROGRAM_TYPE_LABELS[program.type] ?? program.type;
    if (tier) {
      if (
        program.type === ProgramType.STAMP_CARD ||
        program.type === ProgramType.MULTI_STAMP
      ) {
        summary = `${tier.threshold} damga · ${tier.rewardLabel}`;
      } else {
        summary = tier.rewardLabel;
      }
    }
    return {
      programId: program.id,
      name: program.name,
      type: program.type,
      typeLabel: PROGRAM_TYPE_LABELS[program.type] ?? program.type,
      summary,
    };
  }

  async buildProgramPassDisplay(
    tenantId: string,
    customerId: string,
    programId: string,
    fallback: {
      stampCount: number;
      rewardReady: boolean;
      stampsRequired: number;
      rewardLabel: string;
    },
  ): Promise<ProgramPassDisplay> {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }

    const cp = await this.prisma.customerProgram.findUnique({
      where: {
        customerId_programId: { customerId, programId },
      },
    });

    const tier = program.tiers[0];
    const extraAuxiliaryFields: { key: string; label: string; value: string }[] =
      [];

    switch (program.type) {
      case ProgramType.STAMP_CARD:
      case ProgramType.MULTI_STAMP: {
        const config =
          program.type === ProgramType.MULTI_STAMP
            ? this.multiStamp.parseConfig(program.config)
            : null;
        const balances =
          (cp?.balances as Record<string, number> | null) ?? null;

        let stampsRequired =
          program.tiers.length > 0
            ? Math.max(...program.tiers.map((t) => t.threshold))
            : fallback.stampsRequired;
        let stampCount = cp?.balance ?? fallback.stampCount;
        let rewardReady = cp?.rewardReady ?? fallback.rewardReady;
        let walletSlotFilled: boolean[] | undefined;
        let walletSlotStyles: GroupStampStyle[] | undefined;

        if (program.type === ProgramType.MULTI_STAMP && config) {
          const layout = buildMultiStampWalletLayoutForProgram(
            config.mode,
            {
              lanes: config.lanes,
              productGroups: config.productGroups,
            },
            program.tiers,
            {
              balances,
              aggregateBalance: cp?.balance ?? fallback.stampCount,
              fallbackThreshold: fallback.stampsRequired,
            },
          );

          if (layout) {
            stampsRequired = layout.totalSlots;
            stampCount = layout.totalFilled;
            walletSlotFilled = layout.slotFilled;
            const wt = parseWalletTemplate(program.config);
            const enrichedLayout = {
              ...layout,
              segments: layout.segments.map((seg, index) => {
                const groups =
                  config.mode === 'LANES'
                    ? config.lanes
                    : config.productGroups;
                const group = groups?.find((g) => g.id === seg.laneId);
                const theme =
                  group?.stampTheme ??
                  (wt?.stampTheme && wt.stampTheme !== 'CUSTOM'
                    ? wt.stampTheme
                    : defaultGroupStampTheme(index));
                const isCustom = theme === 'CUSTOM';
                return {
                  ...seg,
                  stampTheme: theme,
                  stampIconFilledUrl: isCustom
                    ? group?.stampIconFilledUrl ?? wt?.stampIconFilledUrl
                    : null,
                  stampIconEmptyUrl: isCustom
                    ? group?.stampIconEmptyUrl ?? wt?.stampIconEmptyUrl
                    : null,
                };
              }),
            };
            walletSlotStyles = buildSlotStylesFromLayout(enrichedLayout, {
              stampTheme:
                wt?.stampTheme && wt.stampTheme !== 'CUSTOM'
                  ? wt.stampTheme
                  : 'COFFEE',
              ...(wt?.stampTheme === 'CUSTOM'
                ? {
                    stampIconFilledUrl: wt?.stampIconFilledUrl,
                    stampIconEmptyUrl: wt?.stampIconEmptyUrl,
                  }
                : {}),
            });

            for (const seg of layout.segments) {
              extraAuxiliaryFields.push({
                key: `lane_${seg.laneId}`,
                label: seg.label,
                value: `${seg.filled}/${seg.threshold}`,
              });
            }

            rewardReady = layout.segments.some(
              (seg) => seg.filled >= seg.threshold,
            );
          } else {
            stampCount = cp?.balance ?? fallback.stampCount;
          }
        }

        const rewardLabel = tier?.rewardLabel ?? fallback.rewardLabel;

        return {
          description: program.name,
          stampCount,
          stampsRequired,
          rewardLabel,
          rewardReady,
          extraAuxiliaryFields,
          walletSlotFilled,
          walletSlotStyles,
        };
      }
      case ProgramType.POINT_CARD: {
        const config = this.pointCard.parseConfig(program.config);
        const balance = cp?.balance ?? 0;
        const fields = this.pointCard.walletFields(config, balance);
        return {
          description: program.name,
          stampCount: balance,
          stampsRequired: config.redeemRules[0]?.pointCost ?? 100,
          rewardLabel: config.redeemRules[0]?.rewardLabel ?? 'Ödül',
          rewardReady: config.redeemRules.some((r) => balance >= r.pointCost),
          stampFieldLabel: fields.label,
          rewardFieldLabel: 'Sonraki ödül',
          extraAuxiliaryFields: fields.hint
            ? [{ key: 'points_hint', label: 'Durum', value: fields.hint.slice(0, 40) }]
            : [],
        };
      }
      case ProgramType.CASHBACK_CARD: {
        const config = this.cashbackCard.parseConfig(program.config);
        const balance = cp?.balance ?? 0;
        const fields = this.cashbackCard.walletFields(config, balance);
        return {
          description: program.name,
          stampCount: balance,
          stampsRequired: config.minRedeemKurus,
          rewardLabel: `%${config.earnPercent} cashback`,
          rewardReady: balance >= config.minRedeemKurus,
          stampFieldLabel: fields.label,
          rewardFieldLabel: 'Cashback',
          extraAuxiliaryFields: fields.hint
            ? [{ key: 'cashback_hint', label: 'Durum', value: fields.hint.slice(0, 40) }]
            : [],
        };
      }
      case ProgramType.DISCOUNT_CARD: {
        const config = this.discountCard.parseConfig(program.config);
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
        const fields = this.discountCard.walletFields(
          config,
          effective,
          meta as Parameters<DiscountCardService['walletFields']>[2],
        );
        return {
          description: program.name,
          stampCount: 0,
          stampsRequired: 1,
          rewardLabel: fields.value,
          rewardReady: true,
          stampFieldLabel: fields.label,
          statusFieldLabel: 'Kullanım',
          extraAuxiliaryFields: fields.hint
            ? [{ key: 'discount_hint', label: 'Durum', value: fields.hint.slice(0, 40) }]
            : [],
        };
      }
      case ProgramType.EVENT_CARD: {
        const config = this.eventCard.parseConfig(program.config);
        const meta =
          cp?.metadata && typeof cp.metadata === 'object'
            ? (cp.metadata as Record<string, unknown>)
            : {};
        const fields = this.eventCard.walletFields(
          config,
          meta as Parameters<EventCardService['walletFields']>[1],
        );
        const entriesUsed = Number(meta.entriesUsed ?? 0);
        const remaining = Math.max(0, config.entryLimit - entriesUsed);
        return {
          description: program.name,
          stampCount: remaining,
          stampsRequired: config.entryLimit,
          rewardLabel: fields.value,
          rewardReady: remaining > 0,
          stampFieldLabel: fields.label,
          statusFieldLabel: 'Etkinlik',
          extraAuxiliaryFields: fields.hint
            ? [{ key: 'event_until', label: 'Bitiş', value: fields.hint.slice(0, 40) }]
            : [],
        };
      }
      default:
        return {
          description: program.name,
          stampCount: fallback.stampCount,
          stampsRequired: fallback.stampsRequired,
          rewardLabel: fallback.rewardLabel,
          rewardReady: fallback.rewardReady,
          extraAuxiliaryFields: [],
        };
    }
  }
}

export function buildPassBarcodeMessage(
  customerId: string,
  programId?: string | null,
): string {
  return programId ? `${customerId}:${programId}` : customerId;
}

export function applePassSerial(
  customerId: string,
  programId?: string | null,
  rev = 'ic3',
): string {
  if (!programId) {
    return `apple_${customerId}_${rev}`;
  }
  return `apple_${customerId}_${programId}_${rev}`;
}

export function parseApplePassSerial(serial: string): {
  customerId: string;
  programId?: string;
} {
  const m = serial.match(/^apple_(.+)_ic3$/);
  if (!m) {
    throw new BadRequestException('Geçersiz pass seri numarası');
  }
  const body = m[1];
  const split = body.indexOf('_');
  if (split === -1) {
    return { customerId: body };
  }
  return {
    customerId: body.slice(0, split),
    programId: body.slice(split + 1),
  };
}
