import { OtpPurpose } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class OtpRequestDto {
  @IsEmail()
  email!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}

export class OtpVerifyDto {
  @IsEmail()
  email!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ResetPasswordOtpDto {
  @IsString()
  @MaxLength(4000)
  verificationToken!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

export class SensitiveOtpRequestDto {
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}

export class VerificationTokenDto {
  @IsString()
  @IsNotEmpty()
  verificationToken!: string;
}
