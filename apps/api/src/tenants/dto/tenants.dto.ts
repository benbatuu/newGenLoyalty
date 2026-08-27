import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '@prisma/client';

const HEX = /^#[0-9A-Fa-f]{6}$/;

export class InvitePolicyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  body!: string;
}

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug yalnızca küçük harf, rakam ve tire olabilir',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;
}

export class UpdateTenantAdminDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;
}

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(HEX, { message: 'primaryColor #RRGGBB formatında olmalı' })
  primaryColor?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  logoText?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(HEX, { message: 'foregroundColor #RRGGBB formatında olmalı' })
  foregroundColor?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(HEX, { message: 'labelColor #RRGGBB formatında olmalı' })
  labelColor?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(20)
  stampFieldLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(20)
  rewardFieldLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  passDescription?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(800)
  passHowItWorks?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(1200)
  passTerms?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(800)
  passLocations?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(200)
  passHours?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(300)
  passWebsiteUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passPhone?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^(COFFEE|DESSERT|STAR|HEART|DONUT|CUSTOM)$/i, {
    message: 'stampTheme COFFEE|DESSERT|STAR|HEART|DONUT|CUSTOM olmalı',
  })
  stampTheme?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  stampIconFilledUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  stampIconEmptyUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^(TIGHT|NORMAL|WIDE)$/i, {
    message: 'stampInset TIGHT|NORMAL|WIDE olmalı',
  })
  stampInset?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(QR|PDF417|AZTEC|CODE128)$/i, {
    message: 'barcodeFormat QR|PDF417|AZTEC|CODE128 olmalı',
  })
  barcodeFormat?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  notifyIconUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  stampChangeMessage?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  rewardChangeMessage?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  statusChangeMessage?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  headerChangeMessage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  redeemChangeMessage?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(20)
  statusFieldLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(20)
  broadcastFieldLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(80)
  broadcastEmptyText?: string | null;

  @IsOptional()
  @IsBoolean()
  showStampField?: boolean;

  @IsOptional()
  @IsBoolean()
  showRewardField?: boolean;

  @IsOptional()
  @IsBoolean()
  showStatusField?: boolean;

  @IsOptional()
  @IsBoolean()
  showBroadcastField?: boolean;

  @IsOptional()
  @IsBoolean()
  collectCustomerName?: boolean;

  @IsOptional()
  @IsBoolean()
  collectCustomerBirthday?: boolean;

  @IsOptional()
  @IsBoolean()
  birthdayGiftEnabled?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  birthdayMessage?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(80)
  inviteHeadline?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(200)
  inviteSubtitle?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  inviteCtaHint?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(HEX, { message: 'inviteBgColor #RRGGBB formatında olmalı' })
  inviteBgColor?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @Matches(HEX, { message: 'inviteCardColor #RRGGBB formatında olmalı' })
  inviteCardColor?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(120)
  inviteStatusText?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  inviteAppleBtnLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  inviteGoogleBtnLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(80)
  inviteFormTitle?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(2000)
  inviteLegalText?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => InvitePolicyDto)
  invitePolicies?: InvitePolicyDto[] | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(80)
  rewardReadyText?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(80)
  stampsRemainingTemplate?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(20)
  headerFieldLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passDescriptionLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passHowItWorksLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passTermsLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passLocationsLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passHoursLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passWebsiteLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passPhoneLabel?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passExtra1Label?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  passExtra1Value?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passExtra2Label?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  passExtra2Value?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(40)
  passExtra3Label?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  passExtra3Value?: string | null;
}

export class UpdateRewardRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  stampsRequired?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  rewardLabel?: string;
}

export class InviteCashierDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class BroadcastNotificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  message!: string;
}
