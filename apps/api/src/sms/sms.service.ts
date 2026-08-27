import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import twilio from 'twilio';
import { PrismaService } from '../prisma/prisma.service';

export type SmsPayload = {
  toPhone: string;
  body: string;
  /** Convenience for logs — e.g. Wallet invite URL */
  link?: string;
};

type IletiSendResponse = {
  response?: {
    status?: { code?: number; message?: string };
    order?: { id?: string | number };
  };
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private env(key: string): string | undefined {
    return (
      process.env[key]?.trim() ||
      this.config.get<string>(key)?.trim() ||
      undefined
    );
  }

  private provider(): string {
    return (this.env('SMS_PROVIDER') ?? 'mock').toLowerCase();
  }

  /**
   * Normalize to digits only (no +).
   * TR local → 905XXXXXXXXX; international keep country code digits.
   */
  normalizePhone(raw: string): string {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0') && d.length === 11) d = d.slice(1);
    if (d.length === 10 && d.startsWith('5')) d = `90${d}`;
    return d;
  }

  /** E.164 with leading + for Twilio */
  toE164(raw: string): string {
    const d = this.normalizePhone(raw);
    return d.startsWith('+') ? d : `+${d}`;
  }

  /**
   * iletiMerkezi: alphanumeric sender (max 11) or APITEST.
   * Twilio: unused (TWILIO_FROM / Messaging Service used instead).
   */
  private resolveSender(): string {
    const raw = (this.env('SMS_SENDER') ?? '').trim();
    if (!raw) return 'APITEST';
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10 && /^\+?90?\d+$/.test(raw.replace(/\s/g, ''))) {
      this.logger.warn(
        `SMS_SENDER telefon gibi görünüyor ("${raw}"). Sender başlık olmalı; APITEST kullanılıyor.`,
      );
      return 'APITEST';
    }
    return raw.slice(0, 11);
  }

  async send(payload: SmsPayload): Promise<{
    ok: boolean;
    mode: string;
    messageId?: string;
    orderId?: string;
  }> {
    const mode = this.provider();
    const toPhone = this.normalizePhone(payload.toPhone);

    const row = await this.prisma.smsMessage.create({
      data: {
        provider:
          mode === 'iletimerkezi'
            ? 'iletimerkezi'
            : mode === 'twilio'
              ? 'twilio'
              : mode || 'mock',
        toPhone,
        body: payload.body,
        link: payload.link ?? null,
        status: 'queued',
      },
    });

    if (mode === 'mock' || mode === '' || mode === 'log') {
      this.logger.log('──────────── SMS MOCK ────────────');
      this.logger.log(`To: +${toPhone}`);
      this.logger.log(`Body:\n${payload.body}`);
      if (payload.link) this.logger.log(`LINK (copy): ${payload.link}`);
      this.logger.log('──────────────────────────────────');
      await this.prisma.smsMessage.update({
        where: { id: row.id },
        data: { status: 'sent', sentAt: new Date(), statusAt: new Date() },
      });
      return { ok: true, mode: 'mock', messageId: row.id };
    }

    if (mode === 'iletimerkezi') {
      return this.sendIletimerkezi(row.id, toPhone, payload.body, payload.link);
    }

    if (mode === 'twilio') {
      return this.sendTwilio(row.id, toPhone, payload.body, payload.link);
    }

    this.logger.warn(
      `SMS provider "${mode}" henüz bağlı değil; mock gibi loglandı.`,
    );
    this.logger.log(`To: ${toPhone} | ${payload.body}`);
    await this.prisma.smsMessage.update({
      where: { id: row.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        statusAt: new Date(),
        error: `unknown_provider:${mode}`,
      },
    });
    return { ok: true, mode: 'fallback-mock', messageId: row.id };
  }

  private createTwilioClient() {
    const accountSid = this.env('TWILIO_ACCOUNT_SID');
    const apiKeySid = this.env('TWILIO_API_KEY_SID');
    const apiKeySecret =
      this.env('TWILIO_API_KEY_SECRET') || this.env('TWILIO_CLIENT_SECRET');
    const authToken = this.env('TWILIO_AUTH_TOKEN');

    // Common mistake: putting SK… into TWILIO_ACCOUNT_SID
    if (accountSid?.startsWith('SK') && !apiKeySid) {
      throw new Error(
        'TWILIO_ACCOUNT_SID şu an SK… (API Key). Console’dan Account SID (AC…) al; SK’yi TWILIO_API_KEY_SID yap.',
      );
    }

    if (!accountSid?.startsWith('AC')) {
      throw new Error(
        'TWILIO_ACCOUNT_SID gerekli ve AC… ile başlamalı (Twilio Console → Account SID)',
      );
    }

    if (apiKeySid?.startsWith('SK') && apiKeySecret) {
      return twilio(apiKeySid, apiKeySecret, { accountSid });
    }

    if (authToken) {
      return twilio(accountSid, authToken);
    }

    throw new Error(
      'Twilio auth eksik: TWILIO_AUTH_TOKEN veya TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET',
    );
  }

  private async sendTwilio(
    messageId: string,
    toPhone: string,
    body: string,
    link?: string,
  ) {
    const from = this.env('TWILIO_FROM');
    const messagingServiceSid = this.env('TWILIO_MESSAGING_SERVICE_SID');
    const apiBase =
      this.env('API_URL') ||
      this.env('APPLE_WEB_SERVICE_URL') ||
      '';
    const webhookToken = this.env('SMS_WEBHOOK_TOKEN');

    if (!from && !messagingServiceSid) {
      const err = 'TWILIO_FROM veya TWILIO_MESSAGING_SERVICE_SID gerekli';
      this.logger.error(err);
      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: { status: 'failed', error: err, statusAt: new Date() },
      });
      return { ok: false, mode: 'twilio', messageId };
    }

    try {
      const client = this.createTwilioClient();
      const to = this.toE164(toPhone);
      const statusCallback =
        apiBase.startsWith('https://') && webhookToken
          ? `${apiBase.replace(/\/$/, '')}/webhooks/twilio?token=${encodeURIComponent(webhookToken)}`
          : undefined;

      // Trial accounts reject custom SMS body — body must be a Twilio template name
      // (sms_delivery_updates, sms_order_confirmation, …). See TWILIO_TRIAL_TEMPLATE.
      const trialTemplate = this.env('TWILIO_TRIAL_TEMPLATE');
      const outboundBody = trialTemplate || body;
      if (trialTemplate) {
        this.logger.warn(
          `Twilio trial template="${trialTemplate}" — custom invite text not sent; open link from API walletInviteUrl / sms.link. Upgrade Twilio for real invite SMS.`,
        );
      }

      const msg = await client.messages.create({
        to,
        body: outboundBody,
        ...(messagingServiceSid
          ? { messagingServiceSid }
          : { from: from! }),
        ...(statusCallback ? { statusCallback, statusCallbackMethod: 'POST' as const } : {}),
      });

      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: {
          orderId: msg.sid,
          status: msg.status || 'sent',
          sentAt: new Date(),
          statusAt: new Date(),
          providerRaw: {
            sid: msg.sid,
            status: msg.status,
            to: msg.to,
            from: msg.from,
            errorCode: msg.errorCode,
            errorMessage: msg.errorMessage,
            trialTemplate: trialTemplate || null,
          } as Prisma.InputJsonValue,
        },
      });
      this.logger.log(
        `Twilio OK sid=${msg.sid} to=${to} status=${msg.status}`,
      );
      return { ok: true, mode: 'twilio', messageId, orderId: msg.sid };
    } catch (err) {
      let message = err instanceof Error ? err.message : String(err);
      if (/invalid template name|predefined sms templates/i.test(message)) {
        message = `${message} | Trial hesabı özel SMS metni kabul etmez. Çözüm: (1) Twilio hesabını Upgrade et, veya (2) Render’da TWILIO_TRIAL_TEMPLATE=sms_delivery_updates ekle (SMS’te invite linki olmaz; walletInviteUrl kullan).`;
      }
      this.logger.error(`Twilio send error: ${message} link=${link ?? ''}`);
      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: { status: 'failed', error: message, statusAt: new Date() },
      });
      return { ok: false, mode: 'twilio', messageId };
    }
  }

  /** Twilio Message status callback (form-urlencoded) */
  async applyTwilioStatus(report: {
    MessageSid?: string;
    SmsSid?: string;
    MessageStatus?: string;
    SmsStatus?: string;
    To?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
  }) {
    const sid = String(report.MessageSid || report.SmsSid || '').trim();
    const status = String(
      report.MessageStatus || report.SmsStatus || '',
    ).toLowerCase();
    if (!sid) return { ok: true, ignored: true };

    const mapped =
      status === 'delivered'
        ? 'delivered'
        : status === 'undelivered' || status === 'failed'
          ? 'undelivered'
          : status === 'sent' || status === 'sending' || status === 'queued'
            ? status === 'queued'
              ? 'queued'
              : 'sent'
            : status || 'sent';

    const toPhone = report.To ? this.normalizePhone(report.To) : undefined;
    const now = new Date();
    const error =
      report.ErrorCode || report.ErrorMessage
        ? `${report.ErrorCode ?? ''} ${report.ErrorMessage ?? ''}`.trim()
        : undefined;

    const byOrder = await this.prisma.smsMessage.findFirst({
      where: { orderId: sid },
      orderBy: { createdAt: 'desc' },
    });

    if (byOrder) {
      await this.prisma.smsMessage.update({
        where: { id: byOrder.id },
        data: {
          status: mapped,
          statusAt: now,
          ...(error ? { error } : {}),
          ...(toPhone ? { toPhone } : {}),
          providerRaw: {
            ...(typeof byOrder.providerRaw === 'object' && byOrder.providerRaw
              ? (byOrder.providerRaw as object)
              : {}),
            lastWebhook: report,
          } as Prisma.InputJsonValue,
        },
      });
      return { ok: true, updated: byOrder.id };
    }

    const created = await this.prisma.smsMessage.create({
      data: {
        provider: 'twilio',
        orderId: sid,
        toPhone: toPhone ?? 'unknown',
        body: '',
        status: mapped,
        statusAt: now,
        error: error ?? null,
        providerRaw: { lastWebhook: report } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, created: created.id };
  }

  private async sendIletimerkezi(
    messageId: string,
    toPhone: string,
    body: string,
    link?: string,
  ) {
    const key = this.env('SMS_API_USER');
    const hash = this.env('SMS_API_PASS');
    const sender = this.resolveSender();
    const iys = this.env('SMS_IYS') ?? '0';

    if (!key || !hash) {
      const err = 'SMS_API_USER / SMS_API_PASS eksik';
      this.logger.error(err);
      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: { status: 'failed', error: err, statusAt: new Date() },
      });
      return { ok: false, mode: 'iletimerkezi', messageId };
    }

    const text =
      body.length > 900
        ? body.slice(0, 900)
        : `${body}\n\n#${messageId.slice(-6)}`;

    const payload = {
      request: {
        authentication: { key, hash },
        order: {
          sender,
          iys: String(iys),
          message: {
            text,
            receipents: { number: [toPhone] },
          },
        },
      },
    };

    try {
      const res = await fetch(
        'https://api.iletimerkezi.com/v1/send-sms/json',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as IletiSendResponse;
      const code = data.response?.status?.code ?? res.status;
      const msg = data.response?.status?.message ?? res.statusText;
      const orderId = data.response?.order?.id
        ? String(data.response.order.id)
        : undefined;

      if (code !== 200 || !orderId) {
        this.logger.error(
          `iletiMerkezi send failed code=${code} msg=${msg} link=${link ?? ''}`,
        );
        await this.prisma.smsMessage.update({
          where: { id: messageId },
          data: {
            status: 'failed',
            error: `${code}: ${msg}`,
            providerRaw: data as unknown as Prisma.InputJsonValue,
            statusAt: new Date(),
          },
        });
        return { ok: false, mode: 'iletimerkezi', messageId };
      }

      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: {
          orderId,
          status: 'sent',
          sentAt: new Date(),
          statusAt: new Date(),
          providerRaw: data as unknown as Prisma.InputJsonValue,
        },
      });
      this.logger.log(
        `iletiMerkezi OK orderId=${orderId} to=+${toPhone} sender=${sender}`,
      );
      return { ok: true, mode: 'iletimerkezi', messageId, orderId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`iletiMerkezi network error: ${message}`);
      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: { status: 'failed', error: message, statusAt: new Date() },
      });
      return { ok: false, mode: 'iletimerkezi', messageId };
    }
  }

  /** Webhook DLR — idempotent (report.id + status) */
  async applyWebhookReport(report: {
    id: number | string;
    packet_id: number | string;
    status: string;
    to?: string;
    body?: string;
  }) {
    const reportId = String(report.id);
    const orderId = String(report.packet_id);
    const status = String(report.status || '').toLowerCase();
    const allowed = new Set(['accepted', 'delivered', 'undelivered']);
    if (!allowed.has(status)) {
      this.logger.warn(`Webhook unknown status: ${status}`);
      return { ok: true, ignored: true };
    }

    const toPhone = report.to
      ? this.normalizePhone(report.to)
      : undefined;
    const now = new Date();

    const existingByReport = await this.prisma.smsMessage.findUnique({
      where: { reportId },
    });

    if (existingByReport) {
      await this.prisma.smsMessage.update({
        where: { id: existingByReport.id },
        data: {
          status,
          statusAt: now,
          orderId: existingByReport.orderId ?? orderId,
          ...(report.body
            ? {
                providerRaw: {
                  ...(typeof existingByReport.providerRaw === 'object' &&
                  existingByReport.providerRaw
                    ? (existingByReport.providerRaw as object)
                    : {}),
                  lastWebhook: report,
                } as Prisma.InputJsonValue,
              }
            : {}),
        },
      });
      return { ok: true, updated: existingByReport.id };
    }

    const byOrder = await this.prisma.smsMessage.findFirst({
      where: { orderId, reportId: null },
      orderBy: { createdAt: 'desc' },
    });

    if (byOrder) {
      await this.prisma.smsMessage.update({
        where: { id: byOrder.id },
        data: {
          reportId,
          status,
          statusAt: now,
          ...(toPhone && !byOrder.toPhone ? { toPhone } : {}),
          providerRaw: {
            ...(typeof byOrder.providerRaw === 'object' && byOrder.providerRaw
              ? (byOrder.providerRaw as object)
              : {}),
            lastWebhook: report,
          } as Prisma.InputJsonValue,
        },
      });
      return { ok: true, updated: byOrder.id };
    }

    const created = await this.prisma.smsMessage.create({
      data: {
        provider: 'iletimerkezi',
        orderId,
        reportId,
        toPhone: toPhone ?? 'unknown',
        body: report.body ?? '',
        status,
        statusAt: now,
        providerRaw: { lastWebhook: report } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, created: created.id };
  }

  async listMessages(opts?: {
    take?: number;
    status?: string;
    q?: string;
  }) {
    const take = Math.min(opts?.take ?? 50, 100);
    const where: Prisma.SmsMessageWhereInput = {};
    if (opts?.status) where.status = opts.status;
    if (opts?.q?.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { toPhone: { contains: q.replace(/\D/g, '') || q } },
        { orderId: { contains: q } },
        { body: { contains: q } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.smsMessage.count({ where }),
    ]);
    return { total, items };
  }

  /** Auth / balance — provider’a göre */
  async getBalance(): Promise<{ ok: boolean; raw?: unknown; error?: string }> {
    const mode = this.provider();
    if (mode === 'twilio') {
      try {
        const client = this.createTwilioClient();
        const accountSid = this.env('TWILIO_ACCOUNT_SID')!;
        const account = await client.api.accounts(accountSid).fetch();
        const balance = await client.balance.fetch();
        return {
          ok: true,
          raw: {
            provider: 'twilio',
            friendlyName: account.friendlyName,
            status: account.status,
            balance: balance.balance,
            currency: balance.currency,
          },
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const key = this.env('SMS_API_USER');
    const hash = this.env('SMS_API_PASS');
    if (!key || !hash) return { ok: false, error: 'credentials missing' };
    try {
      const res = await fetch(
        'https://api.iletimerkezi.com/v1/get-balance/json',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: { authentication: { key, hash } },
          }),
        },
      );
      const raw = await res.json();
      const code = (raw as IletiSendResponse).response?.status?.code;
      return { ok: code === 200, raw };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
