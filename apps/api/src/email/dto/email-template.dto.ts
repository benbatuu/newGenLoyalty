import {
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { EmailDocument } from '@ngl/shared';

export class CreateEmailTemplateDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsObject()
  bodyJson!: EmailDocument;

  @IsOptional()
  @IsString()
  bodyHtml?: string;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @IsObject()
  bodyJson?: EmailDocument;

  @IsOptional()
  @IsString()
  bodyHtml?: string;
}
