import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProgramType } from '@prisma/client';

export class UpdateProgramTierDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  threshold!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  rewardLabel!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  redeemCost?: number;

  @IsOptional()
  @IsString()
  laneId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProgramDto {
  @IsOptional()
  @IsEnum(ProgramType)
  type?: ProgramType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProgramTierDto)
  tiers?: UpdateProgramTierDto[];
}
