import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ContactLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** Optional for program-suggestion; defaulted server-side when empty. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cafe?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sector?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  /** Honeypot — obscure name to avoid browser autofill. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fax_number?: string;
}

export class PublicSignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cafeName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug yalnızca küçük harf, rakam ve tire olabilir',
  })
  slug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  ownerPassword!: string;

  /** E-posta OTP doğrulamasından dönen kanıt (auth/otp/verify) */
  @IsString()
  @MaxLength(4000)
  verificationToken!: string;

  /** Seçilen paket kodu (fiyatlandırma sayfasından gelir) */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  planCode?: string;

  /** Honeypot */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fax_number?: string;
}

export class PublicPortalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(40)
  phone!: string;
}

export class PublicEnrollDto {
  @IsString()
  @MinLength(10)
  @MaxLength(40)
  phone!: string;

  @IsBoolean()
  consent!: boolean;
}

export class PublicSocialClaimDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(40)
  phone!: string;

  @IsString()
  @MaxLength(40)
  platform!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  actionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofUrl?: string;

  @IsOptional()
  rewardStamps?: number;
}
