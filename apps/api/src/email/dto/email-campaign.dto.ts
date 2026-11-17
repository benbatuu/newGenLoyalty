import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmailCampaignDto {
  @IsString()
  @MinLength(1)
  templateId!: string;

  @IsOptional()
  @IsString()
  segmentId?: string;
}
