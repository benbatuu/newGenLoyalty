import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  requesterName!: string;

  @IsEmail()
  @MaxLength(160)
  requesterEmail!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  cafe!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}

export class TicketLookupDto {
  @IsEmail()
  email!: string;
}

export class SupportReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateSupportStatusDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}
