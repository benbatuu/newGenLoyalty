import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class EnrollStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  inviteCode?: string;
}

export class RedeemStaffDto {
  @IsInt()
  @Min(1)
  amountKurus!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  managerPin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
