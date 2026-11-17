import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProgramType } from '@prisma/client';
import { UpdateProgramTierDto } from './update-program.dto';

export class CreateProgramDto {
  @IsEnum(ProgramType)
  type!: ProgramType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  /** Çok şubeli pakette zorunlu; tek şubede otomatik atanır */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProgramTierDto)
  tiers?: UpdateProgramTierDto[];
}
