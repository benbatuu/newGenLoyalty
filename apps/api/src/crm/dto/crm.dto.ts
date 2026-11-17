import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSegmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsObject()
  rules!: Record<string, unknown>;
}

export class UpdateSegmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddCustomerTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  tag!: string;
}

export class CreateCustomerNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class SetSmsOptOutDto {
  @IsBoolean()
  optOut!: boolean;
}

export class SegmentRulesDto {
  @IsOptional()
  @IsArray()
  lifecycleStage?: string[];

  @IsOptional()
  minStamps?: number;

  @IsOptional()
  maxStamps?: number;

  @IsOptional()
  lastVisitDaysAgo?: number;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  isStaff?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
