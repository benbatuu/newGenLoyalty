import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Branch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';

export type BranchContextDto = {
  maxBranches: number;
  branchCount: number;
  multiBranch: boolean;
  canAddBranch: boolean;
  defaultBranchId: string | null;
  branches: {
    id: string;
    name: string;
    address: string | null;
    isActive: boolean;
  }[];
};

@Injectable()
export class BranchPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
  ) {}

  async getContext(tenantId: string): Promise<BranchContextDto> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.getTenantPlan(tenant.planCode);
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    const branchCount = branches.length;
    const multiBranch = plan.maxBranches > 1;
    const defaultBranch =
      branches.find((b) => b.isActive) ?? branches[0] ?? null;

    return {
      maxBranches: plan.maxBranches,
      branchCount,
      multiBranch,
      canAddBranch: branchCount < plan.maxBranches,
      defaultBranchId: defaultBranch?.id ?? null,
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        isActive: b.isActive,
      })),
    };
  }

  /** Tek şubeli pakette veya hiç şube yoksa varsayılan şube oluşturur / döner */
  async ensureDefaultBranch(tenantId: string): Promise<Branch> {
    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    const inactive = await this.prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (inactive) {
      return this.prisma.branch.update({
        where: { id: inactive.id },
        data: { isActive: true },
      });
    }

    return this.prisma.branch.create({
      data: { tenantId, name: 'Ana şube' },
    });
  }

  async assertCanCreateBranch(tenantId: string): Promise<void> {
    const ctx = await this.getContext(tenantId);
    if (!ctx.canAddBranch) {
      throw new ForbiddenException(
        `Şube limitine ulaşıldı (${ctx.branchCount}/${ctx.maxBranches}). Paketinizi yükseltin.`,
      );
    }
  }

  /**
   * Kasiyer şubesi — tek şubede otomatik; çok şubede seçim zorunlu.
   */
  async resolveStaffBranchId(
    tenantId: string,
    requestedBranchId?: string | null,
  ): Promise<string> {
    const ctx = await this.getContext(tenantId);
    if (!ctx.multiBranch) {
      const branch = await this.ensureDefaultBranch(tenantId);
      return branch.id;
    }

    if (!requestedBranchId) {
      throw new BadRequestException(
        'Paketiniz birden fazla şube destekliyor — kasiyer eklerken şube seçin.',
      );
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: requestedBranchId,
        tenantId,
        isActive: true,
      },
    });
    if (!branch) {
      throw new BadRequestException('Geçersiz veya pasif şube');
    }
    return branch.id;
  }

  /**
   * Sadakat kartı şubesi — tek şubede otomatik; çok şubede seçim zorunlu.
   */
  async resolveProgramBranchId(
    tenantId: string,
    requestedBranchId?: string | null,
  ): Promise<string> {
    return this.resolveStaffBranchId(tenantId, requestedBranchId);
  }

  /** Kasiyer / tezgâh — bu şubeye ait kartlar (+ branchId null eski kayıtlar) */
  matchesBranchScope(
    programBranchId: string | null | undefined,
    cashierBranchId: string | null | undefined,
  ): boolean {
    if (!programBranchId) return true;
    if (!cashierBranchId) return true;
    return programBranchId === cashierBranchId;
  }
}
