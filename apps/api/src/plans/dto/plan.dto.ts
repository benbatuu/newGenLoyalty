import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(32)
  code!: string;

  @IsString()
  @MaxLength(120)
  labelTr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  labelEn?: string;

  @IsInt()
  @Min(0)
  priceTry!: number;

  @IsInt()
  @Min(1)
  maxPrograms!: number;

  @IsArray()
  @IsString({ each: true })
  allowedProgramTypes!: string[];

  @IsOptional()
  maxByType?: Record<string, number>;

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsArray()
  @IsString({ each: true })
  menuKeys!: string[];

  @IsInt()
  @Min(1)
  maxBranches!: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  badgeTr?: string | null;

  @IsOptional()
  @IsString()
  badgeEn?: string | null;

  @IsOptional()
  @IsString()
  noteTr?: string | null;

  @IsOptional()
  @IsString()
  noteEn?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includesTr?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includesEn?: string[];
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  labelTr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  labelEn?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceTry?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPrograms?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedProgramTypes?: string[];

  @IsOptional()
  maxByType?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuKeys?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxBranches?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  badgeTr?: string | null;

  @IsOptional()
  @IsString()
  badgeEn?: string | null;

  @IsOptional()
  @IsString()
  noteTr?: string | null;

  @IsOptional()
  @IsString()
  noteEn?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includesTr?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includesEn?: string[];
}
