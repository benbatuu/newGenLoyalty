import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNfcDeviceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(500)
  tagUrl!: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateNfcDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  tagUrl?: string;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  isActive?: boolean;
}

export class NfcTapDto {
  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsString()
  passCode?: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}

export class NfcConfirmDto {
  @IsString()
  tapEventId!: string;
}
