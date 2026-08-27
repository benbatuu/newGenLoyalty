import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SmsService } from './sms.service';

@Controller()
export class SmsController {
  constructor(
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * iletiMerkezi DLR webhook.
   * Panel: Ayarlar → API → Bildirim Adresi
   * Örnek: https://API_HOST/webhooks/iletimerkezi?token=SMS_WEBHOOK_TOKEN
   * Docs: https://www.iletimerkezi.com/docs/api/webhooks
   */
  @Post('webhooks/iletimerkezi')
  async iletimerkeziWebhook(
    @Query('token') token: string | undefined,
    @Body() body: { report?: Record<string, unknown> },
  ) {
    const expected = this.config.get<string>('SMS_WEBHOOK_TOKEN')?.trim();
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    const report = body?.report;
    if (!report || report.id == null || report.packet_id == null) {
      // Hızlı 200 — malformed'ı sessizce yut (retry storm önleme)
      return { received: true, ignored: true };
    }

    await this.sms.applyWebhookReport({
      id: report.id as string | number,
      packet_id: report.packet_id as string | number,
      status: String(report.status ?? ''),
      to: report.to != null ? String(report.to) : undefined,
      body: report.body != null ? String(report.body) : undefined,
    });

    return { received: true };
  }

  @Get('sms/messages')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.sms.listMessages({
      status,
      q,
      take: take ? Number(take) : 50,
    });
  }

  @Get('sms/balance')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  balance() {
    return this.sms.getBalance();
  }
}
