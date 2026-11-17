import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, StampLedgerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { customerPhonePlain } from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';
import { IysService } from '../sms/iys.service';
import type {
  AddCustomerTagDto,
  CreateCustomerNoteDto,
  CreateSegmentDto,
  UpdateSegmentDto,
} from './dto/crm.dto';

export type SegmentRules = {
  lifecycleStage?: string[];
  minStamps?: number;
  maxStamps?: number;
  lastVisitDaysAgo?: number;
  branchId?: string;
  isStaff?: boolean;
  tags?: string[];
};

const TR_TZ = 'Europe/Istanbul';
const ACTIVE_DAYS = 30;
const DORMANT_DAYS = 90;

function lastVisitMatches(last: Date | undefined, days: number): boolean {
  // Hiç damgası yoksa sadece 30+ günlük kuralda sayılır (eski davranış)
  if (!last) return days >= 30;
  return last.getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
}

function ruleMatches(
  c: { lifecycleStage: string; stampCount: number; branchId: string | null; isStaff: boolean },
  rules: SegmentRules,
  last: Date | undefined,
  tags: Set<string> | undefined,
): boolean {
  if (rules.lifecycleStage?.length && !rules.lifecycleStage.includes(c.lifecycleStage)) return false;
  if (rules.minStamps !== undefined && c.stampCount < rules.minStamps) return false;
  if (rules.maxStamps !== undefined && c.stampCount > rules.maxStamps) return false;
  if (rules.branchId && c.branchId !== rules.branchId) return false;
  if (rules.isStaff !== undefined && c.isStaff !== rules.isStaff) return false;
  if (rules.tags?.length && !rules.tags.some((t) => tags?.has(t))) return false;
  if (rules.lastVisitDaysAgo !== undefined && !lastVisitMatches(last, rules.lastVisitDaysAgo)) return false;
  return true;
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly iys: IysService,
    private readonly pii: PiiService,
  ) {}

  async listSegments(tenantId: string) {
    return this.prisma.segment.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createSegment(tenantId: string, dto: CreateSegmentDto) {
    return this.prisma.segment.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        rules: dto.rules as Prisma.InputJsonValue,
      },
    });
  }

  async updateSegment(tenantId: string, id: string, dto: UpdateSegmentDto) {
    await this.getOwnedSegment(tenantId, id);
    return this.prisma.segment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.rules !== undefined
          ? { rules: dto.rules as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async removeSegment(tenantId: string, id: string) {
    await this.getOwnedSegment(tenantId, id);
    await this.prisma.segment.delete({ where: { id } });
    return { ok: true };
  }

  async previewSegmentCount(tenantId: string, id: string) {
    const segment = await this.getOwnedSegment(tenantId, id);
    const rules = segment.rules as SegmentRules;
    const customers = await this.matchCustomers(tenantId, rules);
    return { segmentId: id, count: customers.length, sampleIds: customers.slice(0, 5).map((c) => c.id) };
  }

  async previewRulesCount(tenantId: string, rules: SegmentRules) {
    const customers = await this.matchCustomers(tenantId, rules);
    return { count: customers.length, sampleIds: customers.slice(0, 5).map((c) => c.id) };
  }

  /** Kampanya hedeflemesi — segment müşteri ID kümesi */
  async listSegmentCustomerIds(
    tenantId: string,
    segmentId: string,
  ): Promise<Set<string>> {
    const segment = await this.getOwnedSegment(tenantId, segmentId);
    const rules = segment.rules as SegmentRules;
    const customers = await this.matchCustomers(tenantId, rules);
    return new Set(customers.map((c) => c.id));
  }

  /** Müşteri başına son damga tarihi — tek groupBy */
  private async lastStampMap(tenantId: string, customerIds?: string[]) {
    const rows = await this.prisma.stampLedger.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        type: StampLedgerType.STAMP,
        ...(customerIds ? { customerId: { in: customerIds } } : {}),
      },
      _max: { createdAt: true },
    });
    return new Map(rows.map((r) => [r.customerId, r._max.createdAt ?? undefined]));
  }

  /**
   * Sayfa için tek istek: gruplar + her grubun müşteri sayısı.
   * Müşteriler bir kez okunur, kurallar bellekte değerlendirilir.
   */
  async segmentsOverview(tenantId: string) {
    const segments = await this.listSegments(tenantId);
    const [customers, lastMap, tagRows] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId },
        select: { id: true, lifecycleStage: true, stampCount: true, branchId: true, isStaff: true },
      }),
      this.lastStampMap(tenantId),
      this.prisma.customerTag.findMany({
        where: { tenantId },
        select: { customerId: true, tag: true },
      }),
    ]);
    const tagsOf = new Map<string, Set<string>>();
    for (const t of tagRows) {
      const set = tagsOf.get(t.customerId) ?? new Set<string>();
      set.add(t.tag);
      tagsOf.set(t.customerId, set);
    }
    return segments.map((seg) => {
      const rules = (seg.rules ?? {}) as SegmentRules;
      const count = customers.filter((c) =>
        ruleMatches(c, rules, lastMap.get(c.id), tagsOf.get(c.id)),
      ).length;
      return { ...seg, count };
    });
  }

  private async matchCustomers(tenantId: string, rules: SegmentRules) {
    const where: Prisma.CustomerWhereInput = { tenantId };

    if (rules.lifecycleStage?.length) {
      where.lifecycleStage = { in: rules.lifecycleStage };
    }
    if (rules.minStamps !== undefined || rules.maxStamps !== undefined) {
      where.stampCount = {
        ...(rules.minStamps !== undefined ? { gte: rules.minStamps } : {}),
        ...(rules.maxStamps !== undefined ? { lte: rules.maxStamps } : {}),
      };
    }
    if (rules.branchId) {
      where.branchId = rules.branchId;
    }
    if (rules.isStaff !== undefined) {
      where.isStaff = rules.isStaff;
    }
    if (rules.tags?.length) {
      where.tags = { some: { tag: { in: rules.tags } } };
    }

    let customers = await this.prisma.customer.findMany({
      where,
      select: { id: true },
    });

    if (rules.lastVisitDaysAgo !== undefined) {
      // Tek sorgu: her müşterinin son damga tarihi (N+1 yok)
      const ids = customers.map((c) => c.id);
      const lastMap = await this.lastStampMap(tenantId, ids);
      customers = customers.filter((c) =>
        lastVisitMatches(lastMap.get(c.id), rules.lastVisitDaysAgo!),
      );
    }

    return customers;
  }

  /** Günlük — müşteri lifecycle stage güncelleme */
  @Cron('30 2 * * *', { timeZone: TR_TZ })
  async cronUpdateLifecycleStages() {
    await this.updateLifecycleStages();
  }

  async updateLifecycleStages(): Promise<{ updated: number }> {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let updated = 0;
    for (const tenant of tenants) {
      const customers = await this.prisma.customer.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, lifecycleStage: true, createdAt: true },
      });

      for (const customer of customers) {
        const lastStamp = await this.prisma.stampLedger.findFirst({
          where: {
            tenantId: tenant.id,
            customerId: customer.id,
            type: StampLedgerType.STAMP,
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const next = this.resolveLifecycleStage(
          customer.createdAt,
          lastStamp?.createdAt ?? null,
        );
        if (next !== customer.lifecycleStage) {
          await this.prisma.customer.update({
            where: { id: customer.id },
            data: { lifecycleStage: next },
          });
          updated += 1;
        }
      }
    }

    if (updated > 0) {
      this.logger.log(`Lifecycle stages updated: ${updated}`);
    }
    return { updated };
  }

  private resolveLifecycleStage(
    createdAt: Date,
    lastStampAt: Date | null,
  ): string {
    if (!lastStampAt) {
      const daysSinceJoin =
        (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000);
      return daysSinceJoin > DORMANT_DAYS ? 'churn' : 'new';
    }

    const daysSinceVisit =
      (Date.now() - lastStampAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceVisit <= ACTIVE_DAYS) return 'active';
    if (daysSinceVisit <= DORMANT_DAYS) return 'dormant';
    return 'churn';
  }

  async listTags(tenantId: string, customerId: string) {
    await this.assertCustomer(tenantId, customerId);
    return this.prisma.customerTag.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addTag(
    tenantId: string,
    customerId: string,
    dto: AddCustomerTagDto,
  ) {
    await this.assertCustomer(tenantId, customerId);
    return this.prisma.customerTag.upsert({
      where: {
        customerId_tag: { customerId, tag: dto.tag.trim() },
      },
      create: {
        tenantId,
        customerId,
        tag: dto.tag.trim(),
      },
      update: {},
    });
  }

  async removeTag(tenantId: string, customerId: string, tag: string) {
    await this.assertCustomer(tenantId, customerId);
    await this.prisma.customerTag.deleteMany({
      where: { tenantId, customerId, tag },
    });
    return { ok: true };
  }

  async listNotes(tenantId: string, customerId: string) {
    await this.assertCustomer(tenantId, customerId);
    return this.prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async addNote(
    tenantId: string,
    customerId: string,
    authorId: string,
    dto: CreateCustomerNoteDto,
  ) {
    await this.assertCustomer(tenantId, customerId);
    return this.prisma.customerNote.create({
      data: {
        tenantId,
        customerId,
        authorId,
        body: dto.body.trim(),
      },
    });
  }

  async setSmsOptOut(
    tenantId: string,
    customerId: string,
    optOut: boolean,
  ) {
    const customer = await this.assertCustomer(tenantId, customerId);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { smsOptOut: optOut },
    });
    void this.iys
      .syncConsent(customerPhonePlain(this.pii, customer), !optOut)
      .catch((err) => {
      this.logger.warn(
        `IYS sync after opt-out change failed ${customerId}: ${(err as Error).message}`,
      );
    });
    return { ok: true, smsOptOut: optOut };
  }

  async getSmsOptOut(tenantId: string, customerId: string) {
    const customer = await this.assertCustomer(tenantId, customerId);
    return { smsOptOut: customer.smsOptOut };
  }

  private async getOwnedSegment(tenantId: string, id: string) {
    const row = await this.prisma.segment.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Segment bulunamadı');
    return row;
  }

  private async assertCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');
    return customer;
  }
}
