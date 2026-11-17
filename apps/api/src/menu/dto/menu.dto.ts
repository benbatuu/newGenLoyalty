import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ── Category ──────────────────────────────────────────────

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameTr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string; description?: string }>;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameTr?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string; description?: string }> | null;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string | null;
}

// ── Item ──────────────────────────────────────────────────

export class MenuVariantDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  /** "option": fiyat mutlak değer. "extra": ürün fiyatının üzerine eklenen ücret. */
  @IsOptional()
  @IsIn(['option', 'extra'])
  kind?: 'option' | 'extra';

  /** Dil kodu → { name } çevirileri */
  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string }>;
}

export class CreateItemDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameTr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string; description?: string }>;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuVariantDto)
  variants?: MenuVariantDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepTimeMin?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameTr?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nameEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string; description?: string }> | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuVariantDto)
  variants?: MenuVariantDto[] | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepTimeMin?: number | null;
}

// ── Table ─────────────────────────────────────────────────

export class CreateTableDto {
  @IsString()
  branchId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

export class BulkCreateTablesDto {
  @IsString()
  branchId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  prefix!: string;

  @IsInt()
  @Min(1)
  from!: number;

  @IsInt()
  @Min(1)
  to!: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Sort ──────────────────────────────────────────────────

export class ReorderDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class UpdateMenuThemeDto {
  @IsOptional()
  @IsString()
  @IsIn(['editorial', 'catalog', 'showcase'])
  preset?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  document?: Record<string, unknown>;
}

export class CreateSavedMenuThemeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @IsIn(['editorial', 'catalog', 'showcase'])
  preset?: string;

  @IsOptional()
  @IsObject()
  document?: Record<string, unknown>;
}

export class UpdateSavedMenuThemeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['editorial', 'catalog', 'showcase'])
  preset?: string;

  @IsOptional()
  @IsObject()
  document?: Record<string, unknown>;
}

export class CreateMenuFeedbackDto {
  @IsString()
  @IsIn(['suggest', 'complaint'])
  type!: 'suggest' | 'complaint';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  extras?: { label?: string; value?: string }[];

  @IsOptional()
  @IsString()
  @MaxLength(16)
  lang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tableLabel?: string;
}

export class UpdateMenuFeedbackDto {
  @IsString()
  @IsIn(['NEW', 'READ', 'ARCHIVED'])
  status!: 'NEW' | 'READ' | 'ARCHIVED';
}
