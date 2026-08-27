import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StampSource } from '@prisma/client';

export class RegisterCustomerDto {
  @IsString()
  @Matches(/^(\+90|0)?5\d{9}$/, {
    message: 'Geçerli bir TR cep telefonu girin',
  })
  phone!: string;
}

export class AddStampDto {
  @IsOptional()
  @IsEnum(StampSource)
  source?: StampSource = StampSource.cashier;
}

export class FindCustomerQueryDto {
  @IsString()
  @Matches(/^\d{3,11}$/, { message: 'Telefon veya son haneler gerekli' })
  phone!: string;
}

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(all|ready|wallet)$/)
  filter?: 'all' | 'ready' | 'wallet' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}
