import { Injectable } from '@nestjs/common';
import { computeProgramQuota } from '@ngl/shared';
import { LoyaltyProgramService } from '../loyalty/loyalty-program.service';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from './tenants.service';

/**
 * Sadakat kartları sayfası — tek istek:
 * işletme (wallet varsayılanları + bildirim metinleri), kart kotası, kartlar, şubeler.
 * Eskiden 3 ayrı istek (/tenants/me, /programs, /branches/context) idi.
 */
@Injectable()
export class RewardEditorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly programs: LoyaltyProgramService,
    private readonly plans: PlansService,
  ) {}

  async load(tenantId: string) {
    // 1. aşama — birbirinden bağımsız okumalar
    const [tenant, programs, branches] = await Promise.all([
      this.tenants.getById(tenantId),
      this.programs.listPrograms(tenantId),
      this.prisma.branch.findMany({
        where: { tenantId },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        select: { id: true, name: true, address: true, isActive: true },
      }),
    ]);

    // 2. aşama — paket tanımı (planCode tenant'tan)
    const plan = await this.plans.resolveDefinition(tenant.planCode);

    const defaultBranch = branches.find((b) => b.isActive) ?? branches[0] ?? null;

    return {
      tenant,
      hub: {
            quota: computeProgramQuota(
              tenant.planCode,
              programs.map((p) => ({ type: p.type as string })),
              plan,
            ),
            programs,
          },
      branches: {
        maxBranches: plan.maxBranches,
        branchCount: branches.length,
        multiBranch: plan.maxBranches > 1,
        canAddBranch: branches.length < plan.maxBranches,
        defaultBranchId: defaultBranch?.id ?? null,
        branches,
      },
    };
  }
}
