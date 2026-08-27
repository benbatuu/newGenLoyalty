import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContactLeadDto, PublicSignupDto } from './dto/public.dto';
import { PublicService } from './public.service';

class UpdateLeadDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

@Controller()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /** Marketing iletişim formu — auth yok */
  @Post('public/contact')
  contact(@Body() dto: ContactLeadDto) {
    return this.publicService.createLead(dto);
  }

  /** Self-serve trial kafe kaydı — auth yok */
  @Post('public/signup')
  signup(@Body() dto: PublicSignupDto) {
    return this.publicService.signup(dto);
  }

  @Get('public/leads')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  listLeads(@Query('status') status?: string) {
    return this.publicService.listLeads({ status });
  }

  @Patch('public/leads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.publicService.updateLeadStatus(id, dto.status, dto.notes);
  }
}
