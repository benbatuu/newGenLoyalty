import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Delete,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { EmailService } from './email.service';
import { CreateEmailCampaignDto } from './dto/email-campaign.dto';
import { CreateFromStarterDto } from './dto/email-starter.dto';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';

@Controller('email')
@ApiTags("email")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class EmailController {
  constructor(private readonly email: EmailService) {}

  private tenantId(user: AuthUser): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant gerekli');
    return user.tenantId;
  }

  @Get('merge-tags')
  listMergeTags(@CurrentUser() user: AuthUser) {
    void this.email.assertEmailFeature(this.tenantId(user));
    return this.email.listMergeTags();
  }

  @Get('starters')
  listStarters(@CurrentUser() user: AuthUser) {
    void this.email.assertEmailFeature(this.tenantId(user));
    return this.email.listStarters();
  }

  @Post('templates/from-starter')
  createFromStarter(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFromStarterDto,
  ) {
    return this.email.createFromStarter(this.tenantId(user), dto);
  }

  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.email.uploadMedia(this.tenantId(user), file);
  }

  @Get('templates')
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.email.listTemplates(this.tenantId(user));
  }

  @Get('templates/:id')
  getTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.email.getTemplate(this.tenantId(user), id);
  }

  @Post('templates')
  createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.email.createTemplate(this.tenantId(user), dto);
  }

  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.email.updateTemplate(this.tenantId(user), id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.email.deleteTemplate(this.tenantId(user), id);
  }

  @Post('templates/:id/duplicate')
  duplicateTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.email.duplicateTemplate(this.tenantId(user), id);
  }

  @Get('campaigns')
  listCampaigns(@CurrentUser() user: AuthUser) {
    return this.email.listCampaigns(this.tenantId(user));
  }

  @Post('campaigns')
  createCampaign(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEmailCampaignDto,
  ) {
    return this.email.createCampaign(this.tenantId(user), dto);
  }

  @Post('campaigns/:id/duplicate')
  duplicateCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.email.duplicateCampaign(id, this.tenantId(user));
  }

  @Post('campaigns/:id/send')
  sendCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.email.sendCampaign(id, this.tenantId(user));
  }
}
