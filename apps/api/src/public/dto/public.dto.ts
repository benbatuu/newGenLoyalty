import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cafe!: string;

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
}
