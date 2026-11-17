import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActivateMembershipDto {
  @IsString()
  @MaxLength(80)
  planId!: string;
}

export class UseMembershipBenefitDto {
  @IsString()
  @MaxLength(120)
  benefitLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
