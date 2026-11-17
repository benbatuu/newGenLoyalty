import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ProgramType } from '@prisma/client';
import { computeProgramQuota, planHasFeature, type ProgramQuotaSnapshot } from '@ngl/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class PlanLimitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
  ) {}

  async resolvePlan(planCode: string) {
    return this.plans.resolveDefinition(planCode);
  }

  async getQuotaForTenant(tenantId: string): Promise<ProgramQuotaSnapshot> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.resolveDefinition(tenant.planCode);
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { tenantId, isActive: true },
      select: { type: true },
    });
    return computeProgramQuota(
      tenant.planCode,
      programs.map((p) => ({ type: p.type as string })),
      plan,
    );
  }

  async assertCanCreateProgram(
    planCode: string,
    programs: { type: ProgramType }[],
    type: ProgramType,
  ): Promise<void> {
    const plan = await this.plans.resolveDefinition(planCode);
    const quota = computeProgramQuota(
      planCode,
      programs.map((p) => ({ type: p.type as string })),
      plan,
    );
    if (!(quota.allowedTypes as string[]).includes(type)) {
      throw new ForbiddenException(
        `${plan.labelTr} paketinde ${type} kart tipi kullanılamaz. Paket yükseltin.`,
      );
    }
    if (
      type === ProgramType.CASHBACK_CARD &&
      !planHasFeature(planCode, 'cashback_card', plan.features)
    ) {
      throw new ForbiddenException(
        'Cashback kartı Pro paket ve üzeri gerektirir.',
      );
    }
    if (quota.remainingPrograms <= 0) {
      throw new ForbiddenException(
        `Kart limitine ulaşıldı (${quota.usedPrograms}/${quota.maxPrograms}). Yeni kart için paket yükseltin.`,
      );
    }
    const typeQuota = quota.byType[type];
    if (typeQuota && !typeQuota.canCreate) {
      throw new ForbiddenException(
        `Bu kart tipi için limit doldu (${typeQuota.used}/${typeQuota.max}).`,
      );
    }
  }

  assertTypeImmutable(current: ProgramType, next?: ProgramType): void {
    if (next && next !== current) {
      throw new BadRequestException(
        'Kart tipi değiştirilemez. Yeni bir kart oluşturun.',
      );
    }
  }
}
