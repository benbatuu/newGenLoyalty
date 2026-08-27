import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PushPlatform } from '@prisma/client';

export class RegisterPushDeviceDto {
  @IsString()
  @MinLength(20)
  fcmToken!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;
}

export class UpdatePushSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}

export class UnregisterPushDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(20)
  fcmToken?: string;
}
