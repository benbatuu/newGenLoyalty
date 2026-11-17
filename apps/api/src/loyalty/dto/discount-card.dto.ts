import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { StampSource } from '@prisma/client';

export class VerifyDiscountDto {
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class ApplyDiscountDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountKurus?: number;

  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
