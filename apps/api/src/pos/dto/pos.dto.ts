import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePosIntegrationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  provider!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdatePosIntegrationDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
