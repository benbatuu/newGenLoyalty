import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeTagLabel, tagKey, DEFAULT_MENU_TAGS, DEFAULT_MENU_ALLERGENS } from '@ngl/shared';

export type CatalogKind = 'ALLERGEN' | 'EXTRA';
export type CatalogInput = {
  kind: string;
  label: string;
  translations?: Record<string, { name?: string }>;
  defaultPrice?: number | string | null;
};


function parseCatalogKind(raw: unknown): CatalogKind {
  if (raw === 'ALLERGEN' || raw === 'EXTRA') return raw;
  throw new BadRequestException('Geçersiz katalog türü');
}

function toPriceOrNull(raw: unknown): Prisma.Decimal | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100000) throw new BadRequestException('Geçersiz ekstra ücreti');
  return new Prisma.Decimal(n.toFixed(2));
}

function toCatalogDto(row: {
  id: string;
  kind: string;
  label: string;
  translations: Prisma.JsonValue;
  defaultPrice: Prisma.Decimal | null;
}) {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    translations: (row.translations ?? {}) as Record<string, { name?: string }>,
    defaultPrice: row.defaultPrice == null ? null : Number(row.defaultPrice),
  };
}

import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import {
  resolveMenuTheme,
  defaultThemeConfig,
  normalizeMenuThemePreset,
  mergeThemeConfig,
  resolveMenuDocument,
  createDefaultMenuDocument,
} from '@ngl/shared';
import type {
  BulkCreateTablesDto,
  CreateCategoryDto,
  CreateItemDto,
  CreateMenuFeedbackDto,
  CreateSavedMenuThemeDto,
  CreateTableDto,
  UpdateCategoryDto,
  UpdateItemDto,
  UpdateMenuFeedbackDto,
  UpdateSavedMenuThemeDto,
  UpdateTableDto,
  UpdateMenuThemeDto,
} from './dto/menu.dto';

function sanitizeTranslations(
  raw: Record<string, { name?: string; description?: string }> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return Prisma.JsonNull;
  const out: Record<string, { name?: string; description?: string }> = {};
  for (const [code, val] of Object.entries(raw)) {
    const lang = code.trim().toLowerCase().slice(0, 8);
    if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(lang) || !val || typeof val !== 'object') {
      continue;
    }
    const entry: { name?: string; description?: string } = {};
    if (typeof val.name === 'string' && val.name.trim()) {
      entry.name = val.name.trim().slice(0, 300);
    }
    if (typeof val.description === 'string' && val.description.trim()) {
      entry.description = val.description.trim().slice(0, 2000);
    }
    if (entry.name || entry.description) out[lang] = entry;
  }
  return Object.keys(out).length ? out : Prisma.JsonNull;
}

export type MenuContextDto = {
  menuEnabled: boolean;
  maxCategories: number;
  maxItems: number;
  maxTables: number;
  usedCategories: number;
  usedItems: number;
  usedTables: number;
  canAddCategory: boolean;
  canAddItem: boolean;
  canAddTable: boolean;
};

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly storage: ObjectStorageService,
  ) {}

  async getContext(tenantId: string): Promise<MenuContextDto> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.getTenantPlan(tenant.planCode);
    const menuEnabled = plan.features.includes('all') || plan.features.includes('menu');
    const [usedCategories, usedItems, usedTables] = await Promise.all([
      this.prisma.menuCategory.count({ where: { tenantId } }),
      this.prisma.menuItem.count({ where: { tenantId } }),
      this.prisma.menuTable.count({ where: { tenantId } }),
    ]);
    return {
      menuEnabled,
      maxCategories: plan.maxMenuCategories,
      maxItems: plan.maxMenuItems,
      maxTables: plan.maxMenuTables,
      usedCategories,
      usedItems,
      usedTables,
      canAddCategory: menuEnabled && usedCategories < plan.maxMenuCategories,
      canAddItem: menuEnabled && usedItems < plan.maxMenuItems,
      canAddTable: menuEnabled && usedTables < plan.maxMenuTables,
    };
  }

  private async assertMenuEnabled(tenantId: string) {
    const ctx = await this.getContext(tenantId);
    if (!ctx.menuEnabled) {
      throw new ForbiddenException(
        'QR Menü özelliği paketinizde bulunmuyor. Growth veya üstü pakete yükseltin.',
      );
    }
    return ctx;
  }

  private async assertCanAddCategory(tenantId: string) {
    const ctx = await this.assertMenuEnabled(tenantId);
    if (!ctx.canAddCategory) {
      throw new ForbiddenException(
        `Kategori limitine ulaşıldı (${ctx.usedCategories}/${ctx.maxCategories}). Paketinizi yükseltin.`,
      );
    }
  }

  private async assertCanAddItem(tenantId: string) {
    const ctx = await this.assertMenuEnabled(tenantId);
    if (!ctx.canAddItem) {
      throw new ForbiddenException(
        `Ürün limitine ulaşıldı (${ctx.usedItems}/${ctx.maxItems}). Paketinizi yükseltin.`,
      );
    }
  }

  private async assertCanAddTable(tenantId: string) {
    const ctx = await this.assertMenuEnabled(tenantId);
    if (!ctx.canAddTable) {
      throw new ForbiddenException(
        `Masa limitine ulaşıldı (${ctx.usedTables}/${ctx.maxTables}). Paketinizi yükseltin.`,
      );
    }
  }

  // ── Categories ────────────────────────────────────────

  async listCategories(tenantId: string, branchId?: string) {
    const where: Prisma.MenuCategoryWhereInput = { tenantId };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }
    return this.prisma.menuCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    await this.assertCanAddCategory(tenantId);
    if (dto.branchId) {
      await this.assertBranchOwned(tenantId, dto.branchId);
    }
    return this.prisma.menuCategory.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        nameTr: dto.nameTr?.trim() || null,
        nameEn: dto.nameEn?.trim() || null,
        description: dto.description?.trim() || null,
        translations: sanitizeTranslations(dto.translations) ?? undefined,
        branchId: dto.branchId || null,
        parentId: dto.parentId || null,
        sortOrder: dto.sortOrder ?? 0,
        imageUrl: dto.imageUrl?.trim() || null,
      },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.getOwnedCategory(tenantId, id);
    if (dto.branchId) {
      await this.assertBranchOwned(tenantId, dto.branchId);
    }
    const data: Prisma.MenuCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.nameTr !== undefined) data.nameTr = dto.nameTr?.trim() || null;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn?.trim() || null;
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.translations !== undefined) {
      data.translations = sanitizeTranslations(dto.translations);
    }
    if (dto.branchId !== undefined)
      data.branch = dto.branchId
        ? { connect: { id: dto.branchId } }
        : { disconnect: true };
    if (dto.parentId !== undefined)
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl?.trim() || null;

    return this.prisma.menuCategory.update({ where: { id }, data });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.getOwnedCategory(tenantId, id);
    await this.prisma.menuCategory.delete({ where: { id } });
    return { ok: true };
  }

  async reorderCategories(tenantId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.menuCategory.updateMany({
          where: { id, tenantId },
          data: { sortOrder: i },
        }),
      ),
    );
    return { ok: true };
  }

  // ── Items ─────────────────────────────────────────────

  async listItems(tenantId: string, categoryId?: string) {
    const where: Prisma.MenuItemWhereInput = { tenantId };
    if (categoryId) where.categoryId = categoryId;
    return this.prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createItem(tenantId: string, dto: CreateItemDto) {
    await this.assertCanAddItem(tenantId);
    await this.getOwnedCategory(tenantId, dto.categoryId);
    return this.prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        nameTr: dto.nameTr?.trim() || null,
        nameEn: dto.nameEn?.trim() || null,
        description: dto.description?.trim() || null,
        translations: sanitizeTranslations(dto.translations) ?? undefined,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? 'TRY',
        allergens: dto.allergens ?? [],
        tags: await this.ensureTags(tenantId, dto.tags ?? []),
        variants: dto.variants
          ? (dto.variants as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        sortOrder: dto.sortOrder ?? 0,
        calories: dto.calories ?? null,
        prepTimeMin: dto.prepTimeMin ?? null,
      },
    });
  }

  async updateItem(tenantId: string, id: string, dto: UpdateItemDto) {
    await this.getOwnedItem(tenantId, id);
    if (dto.categoryId) {
      await this.getOwnedCategory(tenantId, dto.categoryId);
    }
    const data: Prisma.MenuItemUpdateInput = {};
    if (dto.categoryId !== undefined)
      data.category = { connect: { id: dto.categoryId } };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.nameTr !== undefined) data.nameTr = dto.nameTr?.trim() || null;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn?.trim() || null;
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.translations !== undefined) {
      data.translations = sanitizeTranslations(dto.translations);
    }
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.allergens !== undefined) data.allergens = dto.allergens;
    if (dto.tags !== undefined) data.tags = await this.ensureTags(tenantId, dto.tags);
    if (dto.variants !== undefined)
      data.variants = dto.variants
        ? (dto.variants as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.calories !== undefined) data.calories = dto.calories;
    if (dto.prepTimeMin !== undefined) data.prepTimeMin = dto.prepTimeMin;

    return this.prisma.menuItem.update({ where: { id }, data });
  }

  async deleteItem(tenantId: string, id: string) {
    await this.getOwnedItem(tenantId, id);
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  async uploadItemImage(
    tenantId: string,
    id: string,
    file: Express.Multer.File,
  ) {
    await this.getOwnedItem(tenantId, id);
    const key = `menu/${tenantId}/${id}-${Date.now()}.${file.originalname.split('.').pop()}`;
    const stored = await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    await this.prisma.menuItem.update({
      where: { id },
      data: { imageUrl: stored.url },
    });
    return { imageUrl: stored.url };
  }

  async reorderItems(tenantId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.menuItem.updateMany({
          where: { id, tenantId },
          data: { sortOrder: i },
        }),
      ),
    );
    return { ok: true };
  }

  // ── Tables ────────────────────────────────────────────

  async listTables(tenantId: string, branchId?: string) {
    const where: Prisma.MenuTableWhereInput = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.prisma.menuTable.findMany({
      where,
      orderBy: [{ label: 'asc' }],
    });
  }

  async createTable(tenantId: string, dto: CreateTableDto) {
    await this.assertCanAddTable(tenantId);
    await this.assertBranchOwned(tenantId, dto.branchId);
    return this.prisma.menuTable.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        label: dto.label.trim(),
      },
    });
  }

  async bulkCreateTables(tenantId: string, dto: BulkCreateTablesDto) {
    const ctx = await this.assertMenuEnabled(tenantId);
    await this.assertBranchOwned(tenantId, dto.branchId);
    if (dto.to < dto.from)
      throw new BadRequestException('"to" must be >= "from"');
    if (dto.to - dto.from > 200)
      throw new BadRequestException('Tek seferde en fazla 200 masa');
    const requestedCount = dto.to - dto.from + 1;
    const remaining = ctx.maxTables - ctx.usedTables;
    if (requestedCount > remaining) {
      throw new ForbiddenException(
        `Masa limitiniz ${ctx.maxTables}, mevcut ${ctx.usedTables}. En fazla ${remaining} masa ekleyebilirsiniz.`,
      );
    }

    const tables: Prisma.MenuTableCreateManyInput[] = [];
    for (let i = dto.from; i <= dto.to; i++) {
      tables.push({
        tenantId,
        branchId: dto.branchId,
        label: `${dto.prefix.trim()} ${i}`,
      });
    }
    const result = await this.prisma.menuTable.createMany({
      data: tables,
      skipDuplicates: true,
    });
    return { created: result.count };
  }

  async updateTable(tenantId: string, id: string, dto: UpdateTableDto) {
    await this.getOwnedTable(tenantId, id);
    const data: Prisma.MenuTableUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.menuTable.update({ where: { id }, data });
  }

  async deleteTable(tenantId: string, id: string) {
    await this.getOwnedTable(tenantId, id);
    await this.prisma.menuTable.delete({ where: { id } });
    return { ok: true };
  }

  // ── Public ────────────────────────────────────────────

  async getPublicMenu(slug: string, branchId?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        menuThemePreset: true,
        menuThemeConfig: true,
      },
    });
    if (!tenant) throw new NotFoundException('İşletme bulunamadı');

    const catWhere: Prisma.MenuCategoryWhereInput = {
      tenantId: tenant.id,
      isActive: true,
    };
    if (branchId) {
      catWhere.OR = [{ branchId }, { branchId: null }];
    }

    const categories = await this.prisma.menuCategory.findMany({
      where: catWhere,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    const tagRows = await this.prisma.menuTag.findMany({
      where: { tenantId: tenant.id },
      select: { label: true, translations: true },
    });
    // Etiket adı → { dil: çeviri }; istemci ürün etiketlerini seçili dile çevirir
    const tagLabels: Record<string, Record<string, string>> = {};
    for (const row of tagRows) {
      const tr = (row.translations ?? {}) as Record<string, { name?: string }>;
      const map: Record<string, string> = { tr: row.label };
      for (const [lang, v] of Object.entries(tr)) {
        if (v?.name) map[lang] = v.name;
      }
      tagLabels[row.label] = map;
    }

    // Alerjen adı → { dil: çeviri }; istemci ürün alerjenlerini seçili dile çevirir
    const allergenRows = await this.prisma.menuCatalogEntry.findMany({
      where: { tenantId: tenant.id, kind: 'ALLERGEN' },
      select: { label: true, translations: true },
    });
    const allergenLabels: Record<string, Record<string, string>> = {};
    for (const row of allergenRows) {
      const tr = (row.translations ?? {}) as Record<string, { name?: string }>;
      const map: Record<string, string> = { tr: row.label };
      for (const [lang, v] of Object.entries(tr)) {
        if (v?.name) map[lang] = v.name;
      }
      allergenLabels[row.label] = map;
    }

    const branches = await this.prisma.branch.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const activeTheme = await this.prisma.menuTheme.findFirst({
      where: { tenantId: tenant.id, isActive: true },
      select: { preset: true, document: true, updatedAt: true },
    });
    const presetSource = activeTheme?.preset ?? tenant.menuThemePreset;
    const configSource = activeTheme?.document ?? tenant.menuThemeConfig;
    const theme = resolveMenuTheme(
      presetSource,
      configSource,
      tenant.primaryColor,
    );
    const document = resolveMenuDocument(
      presetSource,
      configSource,
      tenant.primaryColor,
    );

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
      },
      theme: { ...theme, document },
      revision: activeTheme?.updatedAt?.toISOString() ?? null,
      categories,
      branches,
      tagLabels,
      allergenLabels,
    };
  }

  async getTheme(tenantId: string) {
    await this.assertMenuEnabled(tenantId);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        primaryColor: true,
        menuThemePreset: true,
        menuThemeConfig: true,
      },
    });
    const theme = resolveMenuTheme(
      tenant.menuThemePreset,
      tenant.menuThemeConfig,
      tenant.primaryColor,
    );
    return {
      ...theme,
      document: resolveMenuDocument(
        tenant.menuThemePreset,
        tenant.menuThemeConfig,
        tenant.primaryColor,
      ),
    };
  }

  async updateTheme(tenantId: string, dto: UpdateMenuThemeDto) {
    await this.assertMenuEnabled(tenantId);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        primaryColor: true,
        menuThemePreset: true,
        menuThemeConfig: true,
      },
    });
    const preset = dto.preset
      ? normalizeMenuThemePreset(dto.preset)
      : normalizeMenuThemePreset(tenant.menuThemePreset);
    const rawSource =
      dto.document !== undefined
        ? dto.document
        : dto.config === null
          ? defaultThemeConfig(preset, tenant.primaryColor)
          : dto.config !== undefined
            ? dto.config
            : tenant.menuThemeConfig;
    const document = resolveMenuDocument(
      preset,
      rawSource,
      tenant.primaryColor,
    );
    const config = mergeThemeConfig(
      preset,
      dto.config && 'hero' in dto.config ? dto.config : undefined,
      tenant.primaryColor,
    );

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        menuThemePreset: preset,
        menuThemeConfig: document as unknown as Prisma.InputJsonValue,
      },
    });

    const active = await this.prisma.menuTheme.findFirst({
      where: { tenantId, isActive: true },
    });
    if (active) {
      await this.prisma.menuTheme.update({
        where: { id: active.id },
        data: {
          preset,
          document: document as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return { preset, config, document };
  }

  // ── Saved themes ──────────────────────────────────────

  async listSavedThemes(tenantId: string) {
    await this.assertMenuEnabled(tenantId);
    await this.ensureLegacyThemeMigrated(tenantId);
    const themes = await this.prisma.menuTheme.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        preset: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { themes, presets: this.listPresetCatalog() };
  }

  async getSavedTheme(tenantId: string, id: string) {
    await this.assertMenuEnabled(tenantId);
    const theme = await this.prisma.menuTheme.findFirst({
      where: { id, tenantId },
    });
    if (!theme) throw new NotFoundException('Tema bulunamadı');
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { primaryColor: true },
    });
    const document = resolveMenuDocument(
      theme.preset,
      theme.document,
      tenant.primaryColor,
    );
    return {
      id: theme.id,
      name: theme.name,
      preset: normalizeMenuThemePreset(theme.preset),
      isActive: theme.isActive,
      document,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    };
  }

  async createSavedTheme(tenantId: string, dto: CreateSavedMenuThemeDto) {
    await this.assertMenuEnabled(tenantId);
    await this.ensureLegacyThemeMigrated(tenantId);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { primaryColor: true },
    });
    const preset = normalizeMenuThemePreset(dto.preset ?? 'editorial');
    const document = resolveMenuDocument(
      preset,
      dto.document ?? createDefaultMenuDocument(preset, tenant.primaryColor),
      tenant.primaryColor,
    );
    const count = await this.prisma.menuTheme.count({ where: { tenantId } });
    const theme = await this.prisma.menuTheme.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        preset,
        document: document as unknown as Prisma.InputJsonValue,
        isActive: count === 0,
      },
    });
    if (theme.isActive) {
      await this.syncActiveThemeToTenant(tenantId, theme.id);
    }
    return this.getSavedTheme(tenantId, theme.id);
  }

  async updateSavedTheme(
    tenantId: string,
    id: string,
    dto: UpdateSavedMenuThemeDto,
  ) {
    await this.assertMenuEnabled(tenantId);
    const existing = await this.prisma.menuTheme.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Tema bulunamadı');
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { primaryColor: true },
    });
    const preset = normalizeMenuThemePreset(dto.preset ?? existing.preset);
    const incoming =
      dto.document &&
      typeof dto.document === 'object' &&
      Array.isArray((dto.document as { blocks?: unknown }).blocks)
        ? dto.document
        : undefined;
    const document = resolveMenuDocument(
      preset,
      incoming ?? existing.document,
      tenant.primaryColor,
    );

    await this.prisma.menuTheme.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        preset,
        document: document as unknown as Prisma.InputJsonValue,
      },
    });

    if (existing.isActive) {
      await this.syncActiveThemeToTenant(tenantId, id);
    }
    return this.getSavedTheme(tenantId, id);
  }

  async activateSavedTheme(tenantId: string, id: string) {
    await this.assertMenuEnabled(tenantId);
    const theme = await this.prisma.menuTheme.findFirst({
      where: { id, tenantId },
    });
    if (!theme) throw new NotFoundException('Tema bulunamadı');
    await this.prisma.$transaction([
      this.prisma.menuTheme.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.menuTheme.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);
    await this.syncActiveThemeToTenant(tenantId, id);
    return this.getSavedTheme(tenantId, id);
  }

  async deleteSavedTheme(tenantId: string, id: string) {
    await this.assertMenuEnabled(tenantId);
    const theme = await this.prisma.menuTheme.findFirst({
      where: { id, tenantId },
    });
    if (!theme) throw new NotFoundException('Tema bulunamadı');
    await this.prisma.menuTheme.delete({ where: { id } });
    if (theme.isActive) {
      const next = await this.prisma.menuTheme.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
      });
      if (next) {
        await this.activateSavedTheme(tenantId, next.id);
      }
    }
    return { ok: true };
  }

  async uploadThemeAsset(
    tenantId: string,
    themeId: string,
    file: Express.Multer.File,
  ) {
    await this.assertMenuEnabled(tenantId);
    const theme = await this.prisma.menuTheme.findFirst({
      where: { id: themeId, tenantId },
      select: { id: true },
    });
    if (!theme) throw new NotFoundException('Tema bulunamadı');
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const key = `menu-themes/${tenantId}/${themeId}-${Date.now()}.${ext}`;
    const stored = await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    return { url: stored.url };
  }

  async uploadCategoryImage(
    tenantId: string,
    id: string,
    file: Express.Multer.File,
  ) {
    await this.getOwnedCategory(tenantId, id);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const key = `menu/${tenantId}/cat-${id}-${Date.now()}.${ext}`;
    const stored = await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    await this.prisma.menuCategory.update({
      where: { id },
      data: { imageUrl: stored.url },
    });
    return { imageUrl: stored.url };
  }

  private listPresetCatalog() {
    return (
      [
        {
          id: 'editorial',
          name: 'Editorial',
          hint: 'Tipografi ağırlıklı, sade ve prestijli kafe menüsü.',
        },
        {
          id: 'catalog',
          name: 'Katalog',
          hint: 'Kategori görselleri önde, kart bazlı keşif.',
        },
        {
          id: 'showcase',
          name: 'Vitrin',
          hint: 'Büyük hero ve görsel ürün sunumu.',
        },
      ] as const
    ).map((p) => ({ ...p, preset: p.id as 'editorial' | 'catalog' | 'showcase' }));
  }

  private async ensureLegacyThemeMigrated(tenantId: string) {
    const count = await this.prisma.menuTheme.count({ where: { tenantId } });
    if (count > 0) return;
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        primaryColor: true,
        menuThemePreset: true,
        menuThemeConfig: true,
      },
    });
    const preset = normalizeMenuThemePreset(tenant.menuThemePreset);
    const document = resolveMenuDocument(
      preset,
      tenant.menuThemeConfig,
      tenant.primaryColor,
    );
    await this.prisma.menuTheme.create({
      data: {
        tenantId,
        name: 'Aktif tema',
        preset,
        document: document as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  private async syncActiveThemeToTenant(tenantId: string, themeId: string) {
    const theme = await this.prisma.menuTheme.findFirstOrThrow({
      where: { id: themeId, tenantId },
    });
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        menuThemePreset: normalizeMenuThemePreset(theme.preset),
        menuThemeConfig: theme.document as Prisma.InputJsonValue,
      },
    });
  }

  async getPublicMenuByTable(slug: string, qrCode: string) {
    const table = await this.prisma.menuTable.findUnique({
      where: { qrCode },
      select: { id: true, label: true, branchId: true, isActive: true },
    });
    if (!table || !table.isActive)
      throw new NotFoundException('Masa bulunamadı');

    const menu = await this.getPublicMenu(slug, table.branchId);
    return { ...menu, table: { id: table.id, label: table.label } };
  }

  // ── Feedback ──────────────────────────────────────────

  async createPublicFeedback(slug: string, dto: CreateMenuFeedbackDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('İşletme bulunamadı');
    const extras = Array.isArray(dto.extras)
      ? dto.extras
          .map((e) => {
            const label = typeof e?.label === 'string' ? e.label.trim() : '';
            const value = typeof e?.value === 'string' ? e.value.trim() : '';
            if (!label || !value) return null;
            return `${label}: ${value}`.slice(0, 240);
          })
          .filter((x): x is string => !!x)
          .slice(0, 16)
      : [];
    const messageParts = [dto.message.trim(), ...extras];
    const message = messageParts.join('\n').slice(0, 4000);
    return this.prisma.menuFeedback.create({
      data: {
        tenantId: tenant.id,
        type: dto.type,
        name: dto.name?.trim() || null,
        message,
        lang: dto.lang?.trim().slice(0, 16) || null,
        tableLabel: dto.tableLabel?.trim().slice(0, 120) || null,
      },
      select: { id: true },
    });
  }

  async listFeedback(tenantId: string, status?: string) {
    await this.assertMenuEnabled(tenantId);
    const where: Prisma.MenuFeedbackWhereInput = { tenantId };
    if (status === 'NEW' || status === 'READ' || status === 'ARCHIVED') {
      where.status = status;
    }
    return this.prisma.menuFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateFeedback(
    tenantId: string,
    id: string,
    dto: UpdateMenuFeedbackDto,
  ) {
    await this.assertMenuEnabled(tenantId);
    const row = await this.prisma.menuFeedback.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Kayıt bulunamadı');
    return this.prisma.menuFeedback.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // ── Helpers ───────────────────────────────────────────

  private async assertBranchOwned(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) throw new NotFoundException('Şube bulunamadı');
  }

  private async getOwnedCategory(tenantId: string, id: string) {
    const row = await this.prisma.menuCategory.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Kategori bulunamadı');
    return row;
  }

  private async getOwnedItem(tenantId: string, id: string) {
    const row = await this.prisma.menuItem.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Ürün bulunamadı');
    return row;
  }

  private async getOwnedTable(tenantId: string, id: string) {
    const row = await this.prisma.menuTable.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Masa bulunamadı');
    return row;
  }

  // ── Etiket kataloğu ─────────────────────────────────────

  /** Etiket listesini kataloğa göre normalize eder; yoksa katalog kaydı oluşturur. */
  async ensureTags(tenantId: string, labels: string[]): Promise<string[]> {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of labels) {
      const label = normalizeTagLabel(String(raw ?? ''));
      if (!label) continue;
      const key = tagKey(label);
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = await this.prisma.menuTag.findFirst({
        where: { tenantId, label: { equals: label, mode: 'insensitive' } },
      });
      if (existing) {
        out.push(existing.label);
        continue;
      }
      await this.prisma.menuTag.create({
        data: { tenantId, label, translations: { tr: { name: label }, en: { name: label } } },
      });
      out.push(label);
    }
    return out;
  }

  async listTags(tenantId: string) {
    return this.prisma.menuTag.findMany({
      where: { tenantId },
      orderBy: { label: 'asc' },
    });
  }

  /** Kataloğu varsayılan etiketlerle doldurur (yoksa). Mevcut kayıtlara dokunmaz. */
  async seedDefaultTags(tenantId: string) {
    for (const d of DEFAULT_MENU_TAGS) {
      const exists = await this.prisma.menuTag.findFirst({
        where: { tenantId, label: { equals: d.tr, mode: 'insensitive' } },
      });
      if (!exists) {
        await this.prisma.menuTag.create({
          data: { tenantId, label: d.tr, translations: { tr: { name: d.tr }, en: { name: d.en } } },
        });
      }
    }
    return this.listTags(tenantId);
  }

  async createTag(tenantId: string, dto: { label: string; translations?: Record<string, { name?: string }> }) {
    const label = normalizeTagLabel(dto.label ?? '');
    if (!label) throw new BadRequestException('Etiket adı boş olamaz');
    const existing = await this.prisma.menuTag.findFirst({
      where: { tenantId, label: { equals: label, mode: 'insensitive' } },
    });
    if (existing) return existing;
    return this.prisma.menuTag.create({
      data: {
        tenantId,
        label,
        translations: this.normalizeTagTranslations(label, dto.translations) as Prisma.InputJsonValue,
      },
    });
  }

  async updateTag(
    tenantId: string,
    id: string,
    dto: { label?: string; translations?: Record<string, { name?: string }> },
  ) {
    const tag = await this.prisma.menuTag.findFirst({ where: { id, tenantId } });
    if (!tag) throw new NotFoundException('Etiket bulunamadı');
    const nextLabel = dto.label !== undefined ? normalizeTagLabel(dto.label) : tag.label;
    if (!nextLabel) throw new BadRequestException('Etiket adı boş olamaz');
    if (tagKey(nextLabel) !== tagKey(tag.label)) {
      const clash = await this.prisma.menuTag.findFirst({
        where: { tenantId, label: { equals: nextLabel, mode: 'insensitive' }, NOT: { id } },
      });
      if (clash) throw new BadRequestException('Bu etiket zaten var');
      await this.replaceTagInItems(tenantId, tag.label, nextLabel);
    }
    const translations = this.normalizeTagTranslations(
      nextLabel,
      dto.translations ?? (tag.translations as Record<string, { name?: string }> | null) ?? undefined,
    );
    return this.prisma.menuTag.update({
      where: { id },
      data: { label: nextLabel, translations: translations as Prisma.InputJsonValue },
    });
  }

  async deleteTag(tenantId: string, id: string) {
    const tag = await this.prisma.menuTag.findFirst({ where: { id, tenantId } });
    if (!tag) throw new NotFoundException('Etiket bulunamadı');
    await this.replaceTagInItems(tenantId, tag.label, null);
    await this.prisma.menuTag.delete({ where: { id } });
    return { ok: true };
  }

  // ── Alerjen ve ekstra kataloğu ──

  async listCatalog(tenantId: string, kind: CatalogKind) {
    const rows = await this.prisma.menuCatalogEntry.findMany({
      where: { tenantId, kind },
      orderBy: { label: 'asc' },
    });
    return rows.map(toCatalogDto);
  }

  /** Alerjen kataloğunu AB'nin 14 zorunlu alerjeniyle doldurur (yoksa). Mevcut kayıtlara dokunmaz. */
  async seedDefaultAllergens(tenantId: string) {
    for (const d of DEFAULT_MENU_ALLERGENS) {
      const exists = await this.prisma.menuCatalogEntry.findFirst({
        where: { tenantId, kind: 'ALLERGEN', label: { equals: d.tr, mode: 'insensitive' } },
      });
      if (!exists) {
        await this.prisma.menuCatalogEntry.create({
          data: {
            tenantId,
            kind: 'ALLERGEN',
            label: d.tr,
            translations: { tr: { name: d.tr }, en: { name: d.en } },
          },
        });
      }
    }
    return this.listCatalog(tenantId, 'ALLERGEN');
  }

  /**
   * Etiket ve alerjen kataloğunu sıfırlar: mevcut kayıtlar silinir, hazır listeler (TR + EN) yazılır.
   * Ürünlerdeki etiket/alerjen değerleri yeni listeye eşlenir; listede olmayanlar ürünlerden kaldırılır.
   */
  async resetDefaultCatalog(tenantId: string) {
    const tagCanon = new Map(DEFAULT_MENU_TAGS.map((d) => [tagKey(d.tr), d.tr]));
    const allergenCanon = new Map(
      DEFAULT_MENU_ALLERGENS.map((d) => [d.tr.toLocaleLowerCase('tr-TR'), d.tr]),
    );
    const items = await this.prisma.menuItem.findMany({
      where: { tenantId },
      select: { id: true, tags: true, allergens: true },
    });
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.menuTag.deleteMany({ where: { tenantId } }),
      this.prisma.menuCatalogEntry.deleteMany({ where: { tenantId, kind: 'ALLERGEN' } }),
      this.prisma.menuTag.createMany({
        data: DEFAULT_MENU_TAGS.map((d) => ({
          tenantId,
          label: d.tr,
          translations: { tr: { name: d.tr }, en: { name: d.en } } as Prisma.InputJsonValue,
        })),
      }),
      this.prisma.menuCatalogEntry.createMany({
        data: DEFAULT_MENU_ALLERGENS.map((d) => ({
          tenantId,
          kind: 'ALLERGEN',
          label: d.tr,
          translations: { tr: { name: d.tr }, en: { name: d.en } } as Prisma.InputJsonValue,
        })),
      }),
    ];
    let itemsChanged = 0;
    for (const it of items) {
      const tags: string[] = [];
      for (const t of it.tags) {
        const v = tagCanon.get(tagKey(t));
        if (v && !tags.includes(v)) tags.push(v);
      }
      const allergens: string[] = [];
      for (const a of it.allergens) {
        const v = allergenCanon.get(a.toLocaleLowerCase('tr-TR'));
        if (v && !allergens.includes(v)) allergens.push(v);
      }
      const changed =
        tags.length !== it.tags.length ||
        allergens.length !== it.allergens.length ||
        tags.some((t, k) => t !== it.tags[k]) ||
        allergens.some((a, k) => a !== it.allergens[k]);
      if (changed) {
        itemsChanged++;
        ops.push(this.prisma.menuItem.update({ where: { id: it.id }, data: { tags, allergens } }));
      }
    }
    await this.prisma.$transaction(ops);
    return {
      tags: DEFAULT_MENU_TAGS.length,
      allergens: DEFAULT_MENU_ALLERGENS.length,
      itemsChanged,
    };
  }

  async createCatalogEntry(tenantId: string, dto: CatalogInput) {
    const kind = parseCatalogKind(dto.kind);
    const label = normalizeTagLabel(dto.label ?? '');
    if (!label) throw new BadRequestException('Ad boş olamaz');
    const existing = await this.prisma.menuCatalogEntry.findFirst({
      where: { tenantId, kind, label: { equals: label, mode: 'insensitive' } },
    });
    if (existing) throw new BadRequestException('Bu ad zaten kataloğda var');
    const row = await this.prisma.menuCatalogEntry.create({
      data: {
        tenantId,
        kind,
        label,
        translations: this.normalizeTagTranslations(label, dto.translations) as Prisma.InputJsonValue,
        defaultPrice: kind === 'EXTRA' ? toPriceOrNull(dto.defaultPrice) : null,
      },
    });
    return toCatalogDto(row);
  }

  async updateCatalogEntry(tenantId: string, id: string, dto: Partial<CatalogInput>) {
    const row = await this.prisma.menuCatalogEntry.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Kayıt bulunamadı');
    const kind = row.kind as CatalogKind;
    const nextLabel = dto.label !== undefined ? normalizeTagLabel(dto.label) : row.label;
    if (!nextLabel) throw new BadRequestException('Ad boş olamaz');
    if (nextLabel.toLowerCase() !== row.label.toLowerCase()) {
      const clash = await this.prisma.menuCatalogEntry.findFirst({
        where: { tenantId, kind, label: { equals: nextLabel, mode: 'insensitive' }, NOT: { id } },
      });
      if (clash) throw new BadRequestException('Bu ad zaten kataloğda var');
      if (kind === 'ALLERGEN') await this.replaceAllergenInItems(tenantId, row.label, nextLabel);
    }
    const translations = this.normalizeTagTranslations(
      nextLabel,
      dto.translations ?? (row.translations as Record<string, { name?: string }> | null) ?? undefined,
    );
    const updated = await this.prisma.menuCatalogEntry.update({
      where: { id },
      data: {
        label: nextLabel,
        translations: translations as Prisma.InputJsonValue,
        ...(kind === 'EXTRA'
          ? { defaultPrice: dto.defaultPrice !== undefined ? toPriceOrNull(dto.defaultPrice) : row.defaultPrice }
          : {}),
      },
    });
    return toCatalogDto(updated);
  }

  async deleteCatalogEntry(tenantId: string, id: string) {
    const row = await this.prisma.menuCatalogEntry.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Kayıt bulunamadı');
    if (row.kind === 'ALLERGEN') await this.replaceAllergenInItems(tenantId, row.label, null);
    await this.prisma.menuCatalogEntry.delete({ where: { id } });
    return { ok: true };
  }

  /** Ürünlerdeki alerjen adını değiştirir (newLabel null ise kaldırır). */
  private async replaceAllergenInItems(tenantId: string, oldLabel: string, newLabel: string | null) {
    const items = await this.prisma.menuItem.findMany({
      where: { tenantId, allergens: { has: oldLabel } },
      select: { id: true, allergens: true },
    });
    for (const it of items) {
      const next: string[] = [];
      for (const a of it.allergens) {
        const v = a === oldLabel ? newLabel : a;
        if (v && !next.includes(v)) next.push(v);
      }
      await this.prisma.menuItem.update({ where: { id: it.id }, data: { allergens: next } });
    }
  }

  private normalizeTagTranslations(
    label: string,
    raw?: Record<string, { name?: string }> | null,
  ): Record<string, { name: string }> {
    const out: Record<string, { name: string }> = { tr: { name: label } };
    for (const [lang, v] of Object.entries(raw ?? {})) {
      if (!/^[a-z]{2,3}$/.test(lang)) continue;
      const n = normalizeTagLabel(String(v?.name ?? ''));
      if (n) out[lang] = { name: n };
    }
    if (!out.en) out.en = { name: label };
    return out;
  }

  /** Ürünlerdeki etiket adını değiştirir (newLabel null ise kaldırır). */
  private async replaceTagInItems(tenantId: string, oldLabel: string, newLabel: string | null) {
    const items = await this.prisma.menuItem.findMany({
      where: { tenantId, tags: { has: oldLabel } },
      select: { id: true, tags: true },
    });
    for (const it of items) {
      const next: string[] = [];
      for (const t of it.tags) {
        const v = t === oldLabel ? newLabel : t;
        if (v && !next.includes(v)) next.push(v);
      }
      await this.prisma.menuItem.update({ where: { id: it.id }, data: { tags: next } });
    }
  }
}
