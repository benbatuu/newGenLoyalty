import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateMeDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  /** Bu cihazdaki oturumu korumak için mevcut refresh token (opsiyonel) */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class RevokeOthersDto {
  @IsString()
  refreshToken!: string;
}
