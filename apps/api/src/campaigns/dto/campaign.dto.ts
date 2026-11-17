import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsIn(['MULTIPLIER', 'WIN_BACK', 'SCHEDULED_BROADCAST'])
  type!: 'MULTIPLIER' | 'WIN_BACK' | 'SCHEDULED_BROADCAST';

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
  /** true → kaydettikten sonra aynı istekte başlat (tek çağrı) */
  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  /** true → kaydettikten sonra aynı istekte başlat (tek çağrı) */
  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

export class MultiplierConfigDto {
  @IsInt()
  @Min(2)
  @Max(4)
  multiplier!: number;

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[];

  @IsOptional()
  @IsString()
  label?: string;
}

export class WinBackConfigDto {
  @IsInt()
  @Min(7)
  @Max(365)
  inactiveDays!: number;

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsIn(['OWNER_PUSH', 'SMS'])
  channel?: 'OWNER_PUSH' | 'SMS';

  @IsOptional()
  @IsString()
  segmentId?: string;
}
