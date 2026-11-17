import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { StampSource } from '@prisma/client';

export class EarnCashbackDto {
  @IsInt()
  @Min(1)
  amountKurus!: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;

  @IsOptional()
  @IsString()
  posReceiptId?: string;
}

export class RedeemCashbackCreditDto {
  @IsInt()
  @Min(1)
  amountKurus!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  basketKurus?: number;

  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;

  @IsOptional()
  @IsString()
  posReceiptId?: string;
}

export class ScanCashbackDto extends EarnCashbackDto {
  @IsString()
  code!: string;
}
