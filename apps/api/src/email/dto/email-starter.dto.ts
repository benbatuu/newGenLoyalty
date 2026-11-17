import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFromStarterDto {
  @IsString()
  @MinLength(1)
  starterId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
