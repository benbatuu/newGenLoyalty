import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StampSource } from '@prisma/client';

export class EventCheckInDto {
  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
