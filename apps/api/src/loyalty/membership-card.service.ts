import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProgramType,
  StampLedgerType,
  StampSource,
} from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_MEMBERSHIP_CARD_CONFIG,
  type MembershipBenefit,
  type MembershipCardConfig,
  type MembershipProgramMeta,
} from './loyalty.types';

const TR_TZ = 'Europe/Istanbul';

@Injectable()
export class MembershipCardService {
  constructor(private readonly prisma: PrismaService) {}

  parseConfig(raw: unknown): MembershipCardConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_MEMBERSHIP_CARD_CONFIG };
    }
    const c = raw as Partial<MembershipCardConfig>;
    return {
      ...DEFAULT_MEMBERSHIP_CARD_CONFIG,
      ...c,
      plans: c.plans?.length ? c.plans : DEFAULT_MEMBERSHIP_CARD_CONFIG.plans,
    };
  }

  async getMembershipProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });
    if (!program) throw new NotFoundException('Kart bulunamadı');
    if (program.type !== ProgramType.MEMBERSHIP_CARD) {
      throw new BadRequestException('Bu kart üyelik kartı değil');
    }
    return program;
  }

  private readMeta(metadata: unknown): MembershipProgramMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as MembershipProgramMeta;
  }

  private buildBenefitQuota(benefits: MembershipBenefit[]): Record<string, number> {
    const quota: Record<string, number> = {};
    for (const b of benefits) {
      if (b.type === 'MONTHLY_FREE_ITEM' && b.quota) {
        quota[b.label] = b.quota;
      }
    }
    return quota;
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  async activateMembership(
    tenantId: string,
    programId: string,
    customerId: string,
    planId: string,
  ) {
    const program = await this.getMembershipProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const plan = config.plans.find((p) => p.id === planId);
    if (!plan) throw new BadRequestException('Geçersiz üyelik planı');

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');

    const now = new Date();
    const expiresAt =
      plan.billingInterval === 'YEAR'
        ? this.addMonths(now, 12)
        : this.addMonths(now, 1);

    const meta: MembershipProgramMeta = {
      planId: plan.id,
      status: 'active',
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      benefitQuota: this.buildBenefitQuota(plan.benefits),
      quotaResetAt: now.toISOString(),
    };

    const cp = await this.prisma.customerProgram.upsert({
      where: {
        customerId_programId: { customerId, programId },
      },
      create: {
        tenantId,
        customerId,
        programId,
        balance: 0,
        metadata: meta as Prisma.InputJsonValue,
      },
      update: {
        metadata: meta as Prisma.InputJsonValue,
      },
    });

    return {
      customerProgramId: cp.id,
      plan: { id: plan.id, label: plan.label },
      status: meta.status,
      expiresAt: meta.expiresAt,
      benefitQuota: meta.benefitQuota,
    };
  }

  async useBenefit(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto: { benefitLabel: string; note?: string },
  ) {
    const program = await this.getMembershipProgram(tenantId, programId);
    const config = this.parseConfig(program.config);

    const cp = await this.prisma.customerProgram.findUnique({
      where: {
        customerId_programId: { customerId, programId },
      },
    });
    if (!cp) {
      throw new BadRequestException('Aktif üyelik bulunamadı');
    }

    const meta = this.readMeta(cp.metadata);
    this.assertActiveMembership(meta, config);

    const quota = { ...(meta.benefitQuota ?? {}) };
    const remaining = quota[dto.benefitLabel];
    if (remaining === undefined || remaining <= 0) {
      throw new BadRequestException('Bu hak için kota kalmadı');
    }

    quota[dto.benefitLabel] = remaining - 1;
    const nextMeta: MembershipProgramMeta = {
      ...meta,
      benefitQuota: quota,
    };

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: { metadata: nextMeta as Prisma.InputJsonValue },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.MEMBERSHIP_USE,
          source: StampSource.cashier,
          createdByUserId: actorUserId,
          amount: 1,
          note: dto.note ?? dto.benefitLabel,
          metadata: {
            benefitLabel: dto.benefitLabel,
            remaining: quota[dto.benefitLabel],
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      benefitLabel: dto.benefitLabel,
      remaining: quota[dto.benefitLabel],
      metadata: updated.metadata,
    };
  }

  private assertActiveMembership(
    meta: MembershipProgramMeta,
    config: MembershipCardConfig,
  ) {
    const now = new Date();
    if (meta.status === 'suspended' || meta.status === 'expired') {
      throw new BadRequestException('Üyelik askıda veya süresi dolmuş');
    }

    if (meta.expiresAt) {
      const expires = new Date(meta.expiresAt);
      if (expires < now) {
        if (meta.status === 'grace' && meta.graceUntil) {
          const graceEnd = new Date(meta.graceUntil);
          if (graceEnd >= now) return;
        }
        throw new BadRequestException('Üyelik süresi dolmuş');
      }
    }

    if (meta.status === 'grace' && meta.graceUntil) {
      const graceEnd = new Date(meta.graceUntil);
      if (graceEnd < now) {
        throw new BadRequestException('Grace süresi doldu');
      }
    }

    void config;
  }

  async getMembershipState(
    tenantId: string,
    programId: string,
    customerId: string,
  ) {
    const program = await this.getMembershipProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.prisma.customerProgram.findUnique({
      where: {
        customerId_programId: { customerId, programId },
      },
    });
    const meta = this.readMeta(cp?.metadata);
    const plan = config.plans.find((p) => p.id === meta.planId);

    return {
      programId: program.id,
      programName: program.name,
      plan: plan ?? null,
      status: meta.status ?? 'inactive',
      activatedAt: meta.activatedAt ?? null,
      expiresAt: meta.expiresAt ?? null,
      graceUntil: meta.graceUntil ?? null,
      benefitQuota: meta.benefitQuota ?? {},
      plans: config.plans,
      gracePeriodDays: config.gracePeriodDays,
    };
  }

  /** Her ayın 1'i 00:05 — benefitQuota reset */
  @Cron('5 0 1 * *', { timeZone: TR_TZ })
  async cronMonthlyQuotaReset() {
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { type: ProgramType.MEMBERSHIP_CARD, isActive: true },
      select: { id: true, tenantId: true, config: true },
    });

    const now = new Date().toISOString();
    for (const program of programs) {
      const config = this.parseConfig(program.config);
      const enrollments = await this.prisma.customerProgram.findMany({
        where: {
          programId: program.id,
          tenantId: program.tenantId,
        },
      });

      for (const cp of enrollments) {
        const meta = this.readMeta(cp.metadata);
        if (!meta.planId || meta.status === 'expired') continue;

        const plan = config.plans.find((p) => p.id === meta.planId);
        if (!plan) continue;

        await this.prisma.customerProgram.update({
          where: { id: cp.id },
          data: {
            metadata: {
              ...meta,
              benefitQuota: this.buildBenefitQuota(plan.benefits),
              quotaResetAt: now,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }
  }

  /** Günlük grace / expire kontrolü */
  @Cron('0 6 * * *', { timeZone: TR_TZ })
  async cronGracePeriodCheck() {
    const enrollments = await this.prisma.customerProgram.findMany({
      where: {
        program: { type: ProgramType.MEMBERSHIP_CARD, isActive: true },
      },
      include: { program: true },
    });

    const now = new Date();
    for (const cp of enrollments) {
      const config = this.parseConfig(cp.program.config);
      const meta = this.readMeta(cp.metadata);
      if (!meta.expiresAt || !meta.planId) continue;

      const expires = new Date(meta.expiresAt);
      if (expires >= now) continue;

      if (meta.status === 'active') {
        const graceUntil = new Date(expires);
        graceUntil.setDate(graceUntil.getDate() + config.gracePeriodDays);
        await this.prisma.customerProgram.update({
          where: { id: cp.id },
          data: {
            metadata: {
              ...meta,
              status: 'grace',
              graceUntil: graceUntil.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      } else if (meta.status === 'grace' && meta.graceUntil) {
        const graceEnd = new Date(meta.graceUntil);
        if (graceEnd < now) {
          await this.prisma.customerProgram.update({
            where: { id: cp.id },
            data: {
              metadata: {
                ...meta,
                status: 'expired',
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    }
  }
}
