import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { StampSource } from '@prisma/client';

export class EarnPointsDto {
  /** Harcama tutarı — kuruş (4750 = 47,50 TL) */
  @IsInt()
  @Min(0)
  amountKurus!: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Yüksek tutar onayı — requireAmountConfirmationAbove üstü için zorunlu */
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;

  /** POS idempotency */
  @IsOptional()
  @IsString()
  posReceiptId?: string;
}

export class RedeemPointsDto {
  @IsInt()
  @Min(1)
  pointCost!: number;

  @IsOptional()
  @IsString()
  rewardLabel?: string;

  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;
}
