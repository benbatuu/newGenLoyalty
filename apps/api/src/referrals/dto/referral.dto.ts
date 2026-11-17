import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RedeemReferralDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  customerId!: string;
}

export class GenerateReferralDto {
  @IsOptional()
  @IsString()
  customerId?: string;
}

/** Telefonla kod üret/göster — tek istek */
export class GenerateByPhoneDto {
  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Geçerli bir telefon numarası girin' })
  phone!: string;
}

/** Yeni müşteri arkadaşının kodunu getirdi — tek istek */
export class RedeemByPhoneDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Geçerli bir telefon numarası girin' })
  phone!: string;
}
