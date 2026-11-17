import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StampSource } from '@prisma/client';

export class RegisterCustomerDto {
  @IsString()
  @Matches(/^(\+90|0)?5\d{9}$/, {
    message: 'Geçerli bir TR cep telefonu girin',
  })
  phone!: string;

  /** Wallet davetine dahil kartlar — boşsa tüm uygun aktif kartlar */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  programIds?: string[];
}

export class WalletInviteDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  programIds?: string[];
}

export class AddStampDto {
  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;

  /** MultiStamp MULTIPLIER modu — ürün grubu id */
  @IsOptional()
  @IsString()
  productGroupId?: string;
}

export class RedeemRewardDto {
  /** MultiStamp — kısmi ödül için tier id */
  @IsOptional()
  @IsString()
  tierId?: string;
}

/** Wallet pass barcode / QR payload (customer id or customerId:programId) */
export class ScanPassDto {
  @IsString()
  code!: string;
}

export class ScanCashbackDto {
  @IsString()
  code!: string;

  /** Harcama tutarı — kuruş */
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
  @IsString()
  posReceiptId?: string;
}

export class FindCustomerQueryDto {
  @IsString()
  @Matches(/^\d{3,11}$/, { message: 'Telefon veya son haneler gerekli' })
  phone!: string;
}

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(all|ready|wallet)$/)
  filter?: 'all' | 'ready' | 'wallet' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** "1" → kasa listesi: hareket sayısı ve ödül kuralı atlanır (daha hızlı) */
  @IsOptional()
  @IsString()
  @Matches(/^(0|1)$/)
  lean?: string;
}

export class ReportsQueryDto {
  /** YYYY-MM-DD — dahil */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  /** YYYY-MM-DD — dahil */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
