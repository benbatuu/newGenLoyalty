import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import type { Request } from 'express';
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

  private assertWebhookToken(token: string | undefined) {
    const expected =
      process.env.SMS_WEBHOOK_TOKEN?.trim() ||
      this.config.get<string>('SMS_WEBHOOK_TOKEN')?.trim();
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid webhook token');
    }
  }

  /**
   * iletiMerkezi DLR webhook.
   * Panel: Ayarlar → API → Bildirim Adresi
   * Örnek: https://API_HOST/webhooks/iletimerkezi?token=SMS_WEBHOOK_TOKEN
   */
  @Post('webhooks/iletimerkezi')
  async iletimerkeziWebhook(
    @Query('token') token: string | undefined,
    @Body() body: { report?: Record<string, unknown> },
  ) {
    this.assertWebhookToken(token);

    const report = body?.report;
    if (!report || report.id == null || report.packet_id == null) {
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

  /**
   * Twilio Message status callback (application/x-www-form-urlencoded).
   * https://API_HOST/webhooks/twilio?token=SMS_WEBHOOK_TOKEN
   */
  @Post('webhooks/twilio')
  async twilioWebhook(
    @Query('token') token: string | undefined,
    @Req() req: Request,
  ) {
    this.assertWebhookToken(token);
    const body = (req.body ?? {}) as Record<string, string>;
    await this.sms.applyTwilioStatus({
      MessageSid: body.MessageSid,
      SmsSid: body.SmsSid,
      MessageStatus: body.MessageStatus,
      SmsStatus: body.SmsStatus,
      To: body.To,
      ErrorCode: body.ErrorCode,
      ErrorMessage: body.ErrorMessage,
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
