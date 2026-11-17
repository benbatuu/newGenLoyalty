import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgramType, StampLedgerType } from '@prisma/client';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CashbackCardService } from '../loyalty/cashback-card.service';
import { DiscountCardService } from '../loyalty/discount-card.service';
import { EventCardService } from '../loyalty/event-card.service';
import { LoyaltyProgramService } from '../loyalty/loyalty-program.service';
import { MembershipCardService } from '../loyalty/membership-card.service';
import { PointCardService } from '../loyalty/point-card.service';
import { StaffCardService } from '../loyalty/staff-card.service';
import { toPublicCustomer } from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';
import { PrismaService } from '../prisma/prisma.service';
import { STAMP_TIMEZONE, startOfCalendarDay } from './stamp-limits';
import { resolveStampRewardMeta } from './stamp-reward-meta';

/** Kasa ekranında kendi durumu olan kart türleri */
const STATEFUL_TYPES: ProgramType[] = [
  ProgramType.POINT_CARD,
  ProgramType.CASHBACK_CARD,
  ProgramType.DISCOUNT_CARD,
  ProgramType.EVENT_CARD,
  ProgramType.MEMBERSHIP_CARD,
  ProgramType.STAFF_CARD,
];

/**
 * Kasa ekranı için toplu okuma uçları.
 * Yazma işlemleri (damga, ödül, puan…) mevcut endpoint'lerde kalır.
 */
@Injectable()
export class CounterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiService,
    private readonly programs: LoyaltyProgramService,
    private readonly campaigns: CampaignsService,
    private readonly points: PointCardService,
    private readonly cashback: CashbackCardService,
    private readonly discount: DiscountCardService,
    private readonly event: EventCardService,
    private readonly membership: MembershipCardService,
    private readonly staff: StaffCardService,
  ) {}

  /** Bugünün damga/ödül sayısı — İstanbul takvim günü */
  async todaySummary(tenantId: string) {
    const start = startOfCalendarDay(STAMP_TIMEZONE);
    const [byType, totalCustomers, rewardReadyCount] = await Promise.all([
      this.prisma.stampLedger.groupBy({
        by: ['type'],
        where: {
          tenantId,
          createdAt: { gte: start },
          type: { in: [StampLedgerType.STAMP, StampLedgerType.REDEEM] },
        },
        _count: { _all: true },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, rewardReady: true } }),
    ]);
    const n = (t: StampLedgerType) =>
      byType.find((r) => r.type === t)?._count._all ?? 0;
    return {
      stampsToday: n(StampLedgerType.STAMP),
      redeemsToday: n(StampLedgerType.REDEEM),
      totalCustomers,
      rewardReadyCount,
    };
  }

  /** Kasa açılışı: kartlar + bugünün özeti + aktif kampanyalar + ödül kuralı */
  async bootstrap(tenantId: string, branchId?: string | null) {
    const [programs, summary, campaigns, reward] = await Promise.all([
      this.programs.listPrograms(tenantId, { branchId }),
      this.todaySummary(tenantId),
      this.campaigns.getActiveBadges(tenantId),
      resolveStampRewardMeta(this.prisma, tenantId),
    ]);
    return { programs, summary, campaigns, reward };
  }

  /**
   * Seçilen müşteri: güncel müşteri kaydı + her kartın kasa durumu (tek istek).
   * Bir kartın durumu alınamazsa o kart `null` döner, diğerleri etkilenmez.
   */
  async customerState(
    tenantId: string,
    customerId: string,
    branchId?: string | null,
  ) {
    const [customer, programs] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        include: { _count: { select: { passes: true } } },
      }),
      this.programs.listPrograms(tenantId, { branchId }),
    ]);
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');

    const stateful = programs.filter((p) =>
      STATEFUL_TYPES.includes(p.type as ProgramType),
    );
    const results = await Promise.allSettled(
      stateful.map((p) => this.programState(tenantId, p.id, p.type, customerId)),
    );
    const states: Record<string, unknown> = {};
    stateful.forEach((p, i) => {
      const r = results[i]!;
      states[p.id] = r.status === 'fulfilled' ? r.value : null;
    });

    return {
      customer: {
        ...toPublicCustomer(this.pii, customer),
        stampCount: customer.stampCount,
        rewardReady: customer.rewardReady,
        hasWallet: customer._count.passes > 0,
      },
      states,
    };
  }

  private programState(
    tenantId: string,
    programId: string,
    type: string,
    customerId: string,
  ): Promise<unknown> {
    switch (type) {
      case ProgramType.POINT_CARD:
        return this.points.getCustomerState(tenantId, programId, customerId);
      case ProgramType.CASHBACK_CARD:
        return this.cashback.getCustomerState(tenantId, programId, customerId);
      case ProgramType.DISCOUNT_CARD:
        return this.discount.getCustomerState(tenantId, programId, customerId);
      case ProgramType.EVENT_CARD:
        return this.event.getCustomerState(tenantId, programId, customerId);
      case ProgramType.MEMBERSHIP_CARD:
        return this.membership.getMembershipState(tenantId, programId, customerId);
      case ProgramType.STAFF_CARD:
        return this.staff.getStaffState(tenantId, programId, customerId);
      default:
        return Promise.resolve(null);
    }
  }
}
