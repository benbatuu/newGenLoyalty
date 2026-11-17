import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BranchPolicyService } from './branch-policy.service';
import type {
  AssignCashierBranchDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchPolicy: BranchPolicyService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { users: true, nfcDevices: true, loyaltyPrograms: true } },
      },
    });
  }

  getContext(tenantId: string) {
    return this.branchPolicy.getContext(tenantId);
  }

  async create(tenantId: string, dto: CreateBranchDto) {
    await this.branchPolicy.assertCanCreateBranch(tenantId);
    return this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        address: dto.address?.trim() || null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto) {
    await this.getOwned(tenantId, id);
    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined
          ? { address: dto.address?.trim() || null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.getOwned(tenantId, id);
    const cashiers = await this.prisma.user.count({
      where: { tenantId, branchId: id, role: Role.CASHIER },
    });
    if (cashiers > 0) {
      throw new BadRequestException(
        'Bu şubeye atanmış kasiyer var. Önce kasiyer atamasını kaldırın.',
      );
    }
    await this.prisma.branch.delete({ where: { id } });
    return { ok: true };
  }

  async assignCashierBranch(
    tenantId: string,
    userId: string,
    dto: AssignCashierBranchDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, role: Role.CASHIER },
    });
    if (!user) {
      throw new NotFoundException('Kasiyer bulunamadı');
    }

    if (dto.branchId) {
      await this.getOwned(tenantId, dto.branchId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { branchId: dto.branchId ?? null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });
  }

  private async getOwned(tenantId: string, id: string) {
    const row = await this.prisma.branch.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Şube bulunamadı');
    return row;
  }
}
