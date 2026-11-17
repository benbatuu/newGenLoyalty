import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { SubscriptionPlan } from '@prisma/client';
import {
  resolvePlanDefinition,
  resolvePlanFeatures,
  resolvePlanMenuKeys,
  type PlanDefinition,
  type ProgramTypeCode,
} from '@ngl/shared';
import { PrismaService } from '../prisma/prisma.service';
import { buildDefaultPlanRows } from './plans.seed-data';
import type { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

export type PublicPlanDto = {
  code: string;
  labelTr: string;
  labelEn: string | null;
  priceTry: number;
  maxPrograms: number;
  maxBranches: number;
  features: string[];
  badgeTr: string | null;
  badgeEn: string | null;
  noteTr: string | null;
  noteEn: string | null;
  includesTr: string[];
  includesEn: string[];
};

export type TenantPlanDto = {
  planCode: string;
  labelTr: string;
  priceTry: number;
  features: string[];
  menuKeys: string[];
  maxPrograms: number;
  maxBranches: number;
  maxMenuCategories: number;
  maxMenuItems: number;
  maxMenuTables: number;
};

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncPlanCatalog();
  }

  /** Varsayılan paket satırlarını upsert eder — menuKeys dahil DB ile kod şablonunu hizalar */
  async syncPlanCatalog() {
    const rows = buildDefaultPlanRows();
    for (const row of rows) {
      await this.prisma.subscriptionPlan.upsert({
        where: { code: row.code },
        update: {
          menuKeys: row.menuKeys,
          features: row.features,
          allowedProgramTypes: row.allowedProgramTypes,
          maxByType: row.maxByType,
          maxPrograms: row.maxPrograms,
          maxBranches: row.maxBranches,
          maxMenuCategories: row.maxMenuCategories,
          maxMenuItems: row.maxMenuItems,
          maxMenuTables: row.maxMenuTables,
          priceTry: row.priceTry,
          labelTr: row.labelTr,
          labelEn: row.labelEn,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          isPublic: row.isPublic,
          badgeTr: row.badgeTr,
          badgeEn: row.badgeEn,
          noteTr: row.noteTr,
          noteEn: row.noteEn,
          includesTr: row.includesTr,
          includesEn: row.includesEn,
        },
        create: {
          id: `plan_${row.code}`,
          code: row.code,
          labelTr: row.labelTr,
          labelEn: row.labelEn,
          priceTry: row.priceTry,
          maxPrograms: row.maxPrograms,
          allowedProgramTypes: row.allowedProgramTypes,
          maxByType: row.maxByType,
          features: row.features,
          menuKeys: row.menuKeys,
          maxBranches: row.maxBranches,
          maxMenuCategories: row.maxMenuCategories,
          maxMenuItems: row.maxMenuItems,
          maxMenuTables: row.maxMenuTables,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          isPublic: row.isPublic,
          badgeTr: row.badgeTr,
          badgeEn: row.badgeEn,
          noteTr: row.noteTr,
          noteEn: row.noteEn,
          includesTr: row.includesTr,
          includesEn: row.includesEn,
        },
      });
    }
  }

  /** @deprecated — use syncPlanCatalog */
  async ensureDefaults() {
    await this.syncPlanCatalog();
  }

  toPlanDefinition(row: SubscriptionPlan): PlanDefinition {
    return {
      code: row.code as PlanDefinition['code'],
      labelTr: row.labelTr,
      priceTry: row.priceTry,
      maxPrograms: row.maxPrograms,
      allowedProgramTypes: row.allowedProgramTypes as ProgramTypeCode[],
      maxByType: (row.maxByType ?? {}) as Partial<
        Record<ProgramTypeCode, number>
      >,
      features: resolvePlanFeatures(row.code, row.features as string[]),
      maxBranches: row.maxBranches,
      maxMenuCategories: row.maxMenuCategories,
      maxMenuItems: row.maxMenuItems,
      maxMenuTables: row.maxMenuTables,
    };
  }

  private serialize(row: SubscriptionPlan) {
    return {
      id: row.id,
      code: row.code,
      labelTr: row.labelTr,
      labelEn: row.labelEn,
      priceTry: row.priceTry,
      maxPrograms: row.maxPrograms,
      allowedProgramTypes: row.allowedProgramTypes as string[],
      maxByType: (row.maxByType ?? {}) as Record<string, number>,
      features: resolvePlanFeatures(row.code, row.features as string[]),
      menuKeys: resolvePlanMenuKeys(row.code, row.menuKeys as string[]),
      maxBranches: row.maxBranches,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      isPublic: row.isPublic,
      badgeTr: row.badgeTr,
      badgeEn: row.badgeEn,
      noteTr: row.noteTr,
      noteEn: row.noteEn,
      includesTr: row.includesTr as string[],
      includesEn: row.includesEn as string[],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPublic(row: SubscriptionPlan): PublicPlanDto {
    return {
      code: row.code,
      labelTr: row.labelTr,
      labelEn: row.labelEn,
      priceTry: row.priceTry,
      maxPrograms: row.maxPrograms,
      maxBranches: row.maxBranches,
      features: row.features as string[],
      badgeTr: row.badgeTr,
      badgeEn: row.badgeEn,
      noteTr: row.noteTr,
      noteEn: row.noteEn,
      includesTr: row.includesTr as string[],
      includesEn: row.includesEn as string[],
    };
  }

  async listPublic(): Promise<PublicPlanDto[]> {
    const rows = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: [{ sortOrder: 'asc' }, { priceTry: 'asc' }],
    });
    return rows.map((r) => this.toPublic(r));
  }

  async listAdmin() {
    const rows = await this.prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    const tenantCounts = await this.prisma.tenant.groupBy({
      by: ['planCode'],
      _count: { _all: true },
    });
    const countByCode = Object.fromEntries(
      tenantCounts.map((t) => [t.planCode, t._count._all]),
    );
    return rows.map((r) => ({
      ...this.serialize(r),
      tenantCount: countByCode[r.code] ?? 0,
    }));
  }

  async getByCode(code: string) {
    const row = await this.prisma.subscriptionPlan.findUnique({
      where: { code },
    });
    if (!row) {
      throw new NotFoundException('Paket bulunamadı');
    }
    const tenantCount = await this.prisma.tenant.count({
      where: { planCode: code },
    });
    return { ...this.serialize(row), tenantCount };
  }

  async resolveDefinition(planCode: string): Promise<PlanDefinition> {
    const row = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode, isActive: true },
    });
    if (row) {
      return this.toPlanDefinition(row);
    }
    return resolvePlanDefinition(planCode);
  }

  async getTenantPlan(planCode: string): Promise<TenantPlanDto> {
    const row = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });
    if (row) {
      return {
        planCode: row.code,
        labelTr: row.labelTr,
        priceTry: row.priceTry,
        features: resolvePlanFeatures(row.code, row.features as string[]),
        menuKeys: resolvePlanMenuKeys(row.code, row.menuKeys as string[]),
        maxPrograms: row.maxPrograms,
        maxBranches: row.maxBranches,
        maxMenuCategories: row.maxMenuCategories,
        maxMenuItems: row.maxMenuItems,
        maxMenuTables: row.maxMenuTables,
      };
    }
    const fallback = resolvePlanDefinition(planCode);
    return {
      planCode: fallback.code,
      labelTr: fallback.labelTr,
      priceTry: fallback.priceTry,
      features: fallback.features,
      menuKeys: resolvePlanMenuKeys(fallback.code, null),
      maxPrograms: fallback.maxPrograms,
      maxBranches: fallback.maxBranches,
      maxMenuCategories: fallback.maxMenuCategories,
      maxMenuItems: fallback.maxMenuItems,
      maxMenuTables: fallback.maxMenuTables,
    };
  }

  async create(dto: CreatePlanDto) {
    const exists = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.code },
    });
    if (exists) {
      throw new ConflictException('Bu paket kodu zaten var');
    }
    const row = await this.prisma.subscriptionPlan.create({
      data: {
        code: dto.code.trim(),
        labelTr: dto.labelTr.trim(),
        labelEn: dto.labelEn?.trim() ?? null,
        priceTry: dto.priceTry,
        maxPrograms: dto.maxPrograms,
        allowedProgramTypes: dto.allowedProgramTypes,
        maxByType: dto.maxByType ?? {},
        features: dto.features,
        menuKeys: dto.menuKeys,
        maxBranches: dto.maxBranches,
        sortOrder: dto.sortOrder ?? 100,
        isActive: dto.isActive ?? true,
        isPublic: dto.isPublic ?? false,
        badgeTr: dto.badgeTr ?? null,
        badgeEn: dto.badgeEn ?? null,
        noteTr: dto.noteTr ?? null,
        noteEn: dto.noteEn ?? null,
        includesTr: dto.includesTr ?? [],
        includesEn: dto.includesEn ?? [],
      },
    });
    return this.serialize(row);
  }

  async update(code: string, dto: UpdatePlanDto) {
    await this.getByCode(code);
    const row = await this.prisma.subscriptionPlan.update({
      where: { code },
      data: {
        ...(dto.labelTr !== undefined ? { labelTr: dto.labelTr.trim() } : {}),
        ...(dto.labelEn !== undefined ? { labelEn: dto.labelEn?.trim() ?? null } : {}),
        ...(dto.priceTry !== undefined ? { priceTry: dto.priceTry } : {}),
        ...(dto.maxPrograms !== undefined ? { maxPrograms: dto.maxPrograms } : {}),
        ...(dto.allowedProgramTypes !== undefined
          ? { allowedProgramTypes: dto.allowedProgramTypes }
          : {}),
        ...(dto.maxByType !== undefined ? { maxByType: dto.maxByType } : {}),
        ...(dto.features !== undefined ? { features: dto.features } : {}),
        ...(dto.menuKeys !== undefined ? { menuKeys: dto.menuKeys } : {}),
        ...(dto.maxBranches !== undefined ? { maxBranches: dto.maxBranches } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.badgeTr !== undefined ? { badgeTr: dto.badgeTr } : {}),
        ...(dto.badgeEn !== undefined ? { badgeEn: dto.badgeEn } : {}),
        ...(dto.noteTr !== undefined ? { noteTr: dto.noteTr } : {}),
        ...(dto.noteEn !== undefined ? { noteEn: dto.noteEn } : {}),
        ...(dto.includesTr !== undefined ? { includesTr: dto.includesTr } : {}),
        ...(dto.includesEn !== undefined ? { includesEn: dto.includesEn } : {}),
      },
    });
    return this.serialize(row);
  }

  async remove(code: string) {
    const tenantCount = await this.prisma.tenant.count({
      where: { planCode: code },
    });
    if (tenantCount > 0) {
      throw new ConflictException(
        `${tenantCount} kafe bu paketi kullanıyor — silinemez; pasifleştirin.`,
      );
    }
    await this.prisma.subscriptionPlan.delete({ where: { code } });
    return { ok: true };
  }
}
