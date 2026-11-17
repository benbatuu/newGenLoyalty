import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { assertHttpRateLimit } from '../common/rate-limit-http';
import {
  CreateSupportTicketDto,
  SupportReplyDto,
  TicketLookupDto,
  UpdateSupportStatusDto,
} from './support.dto';
import { SupportFile, SupportService } from './support.service';

const UPLOAD_OPTS = { limits: { files: 5, fileSize: 10 * 1024 * 1024 } };

/** Herkese açık: pasif hesap sahipleri talep açar ve takip kodu ile izler (auth yok) */
@Controller('public/support')
@ApiTags('public-support')
export class PublicSupportController {
  constructor(private readonly support: SupportService) {}

  @Post('tickets')
  @UseInterceptors(FilesInterceptor('files', 5, UPLOAD_OPTS))
  async create(
    @Req() req: Request,
    @Body() dto: CreateSupportTicketDto,
    @UploadedFiles() files: SupportFile[] | undefined,
  ) {
    await assertHttpRateLimit(req, 'support-create', 6, 60_000);
    return this.support.createTicket(dto, files ?? []);
  }

  /** E-posta ve takip kodu body'de; URL'de kişisel veri yok */
  @Post('tickets/lookup')
  async lookup(@Req() req: Request, @Body() dto: TicketLookupDto & { code: string }) {
    await assertHttpRateLimit(req, 'support-lookup', 20, 60_000);
    if (!dto.code || typeof dto.code !== 'string') throw new BadRequestException('Takip kodu gerekli');
    return this.support.findForRequester(dto.code, dto.email);
  }

  @Post('tickets/reply')
  @UseInterceptors(FilesInterceptor('files', 5, UPLOAD_OPTS))
  async reply(
    @Req() req: Request,
    @Body() dto: SupportReplyDto & { code: string; email: string },
    @UploadedFiles() files: SupportFile[] | undefined,
  ) {
    await assertHttpRateLimit(req, 'support-reply', 20, 60_000);
    if (!dto.code || !dto.email) throw new BadRequestException('Takip kodu ve e-posta gerekli');
    return this.support.requesterReply(dto.code, dto.email, dto, files ?? []);
  }
}

/** Süper admin: tüm destek talepleri, yazışma ve durum yönetimi */
@Controller('support')
@ApiTags('support')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('tenant:manage')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  list(@Query('status') status?: string, @Query('q') q?: string) {
    return this.support.adminList({ status, q });
  }

  @Get('tickets/:id')
  detail(@Param('id') id: string) {
    return this.support.adminDetail(id);
  }

  @Post('tickets/:id/messages')
  @UseInterceptors(FilesInterceptor('files', 5, UPLOAD_OPTS))
  reply(
    @Param('id') id: string,
    @Body() dto: SupportReplyDto,
    @UploadedFiles() files: SupportFile[] | undefined,
  ) {
    return this.support.adminReply(id, 'Destek ekibi', dto, files ?? []);
  }

  @Patch('tickets/:id/status')
  status(@Param('id') id: string, @Body() dto: UpdateSupportStatusDto) {
    return this.support.adminSetStatus(id, dto);
  }
}
