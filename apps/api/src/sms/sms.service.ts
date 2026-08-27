import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
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

  private provider(): string {
    return (this.config.get<string>('SMS_PROVIDER') ?? 'mock').toLowerCase();
  }

  /** TR numara → 905XXXXXXXXX */
  normalizePhone(raw: string): string {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length === 10 && d.startsWith('5')) d = `90${d}`;
    if (d.startsWith('90') && d.length === 12) return d;
    return d;
  }

  /**
   * Sender = panelde onaylı alfanumerik başlık (max 11) veya test için APITEST.
   * Telefon numarası sender olamaz.
   */
  private resolveSender(): string {
    const raw = (this.config.get<string>('SMS_SENDER') ?? '').trim();
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
        provider: mode === 'iletimerkezi' ? 'iletimerkezi' : mode || 'mock',
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

  private async sendIletimerkezi(
    messageId: string,
    toPhone: string,
    body: string,
    link?: string,
  ) {
    const key = this.config.get<string>('SMS_API_USER')?.trim();
    const hash = this.config.get<string>('SMS_API_PASS')?.trim();
    const sender = this.resolveSender();
    const iys = this.config.get<string>('SMS_IYS') ?? '0';

    if (!key || !hash) {
      const err = 'SMS_API_USER / SMS_API_PASS eksik';
      this.logger.error(err);
      await this.prisma.smsMessage.update({
        where: { id: messageId },
        data: { status: 'failed', error: err, statusAt: new Date() },
      });
      return { ok: false, mode: 'iletimerkezi', messageId };
    }

    // Unique suffix: aynı text+numara kısa sürede 451 verir
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

    // Match open send by orderId (packet_id == send-sms order.id)
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

    // Orphan DLR (başka app veya bizden önce webhook) — yine kaydet
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

  /** Auth doğrulama — kontör harcamaz */
  async getBalance(): Promise<{ ok: boolean; raw?: unknown; error?: string }> {
    const key = this.config.get<string>('SMS_API_USER')?.trim();
    const hash = this.config.get<string>('SMS_API_PASS')?.trim();
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
