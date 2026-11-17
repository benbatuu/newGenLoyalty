import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVipTierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minVisits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSpendKurus?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  rateMultiplier?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateVipTierDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minVisits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSpendKurus?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  rateMultiplier?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
