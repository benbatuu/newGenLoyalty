import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult = { ok: boolean; provider: string; error?: string };

/**
 * Tüm sistem e-postalarının tek çıkış noktası (OTP, davet, sıfırlama, faturalama,
 * kampanya). Sağlayıcı: EMAIL_PROVIDER=brevo | resend | mock. Varsayılan: BREVO_API_KEY
 * varsa brevo, yoksa mock (loglar, göndermez).
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const p = this.provider();
    this.logger.log(
      `Mail sağlayıcısı: ${p} (gönderici tanımlı: ${this.env('BREVO_SENDER') || this.env('EMAIL_FROM') ? 'evet' : 'hayır'})`,
    );
    if (p === 'mock') {
      this.logger.warn('Mail gönderilmiyor (mock). BREVO_API_KEY tanımlı ve API yeniden başlatılmış olmalı.');
    }
  }

  private env(key: string): string | undefined {
    return (
      process.env[key]?.trim() || this.config.get<string>(key)?.trim() || undefined
    );
  }

  provider(): string {
    const explicit = this.env('EMAIL_PROVIDER')?.toLowerCase();
    if (explicit) return explicit;
    return this.env('BREVO_API_KEY') ? 'brevo' : 'mock';
  }

  /** Yönetim paneli adresi (giriş/kayıt bağlantıları için); yoksa "". */
  adminUrl(): string {
    return (this.env('ADMIN_URL') ?? this.env('NEXT_PUBLIC_ADMIN_URL') ?? '').replace(/\/$/, '');
  }

  /** Ortak e-posta gövdesi: düz metin + sade HTML. */
  render(title: string, lines: string[], cta?: { label: string; url: string }) {
    const esc = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const text = [title, '', ...lines, ...(cta ? ['', `${cta.label}: ${cta.url}`] : [])].join('\n');
    const html =
      `<h2 style="font-family:sans-serif">${esc(title)}</h2>` +
      lines.map((l) => `<p style="font-family:sans-serif">${esc(l)}</p>`).join('') +
      (cta
        ? `<p><a href="${esc(cta.url)}" style="display:inline-block;padding:10px 18px;background:#D91E33;color:#fff;border-radius:8px;text-decoration:none;font-family:sans-serif">${esc(cta.label)}</a></p>`
        : '');
    return { text, html };
  }

  /** Üretimde gerçek bir sağlayıcı zorunlu; mock ile sessizce "gönderildi" denmez. */
  isLive(): boolean {
    const p = this.provider();
    return p === 'brevo' || p === 'resend';
  }

  async send(msg: MailMessage): Promise<MailResult> {
    const provider = this.provider();
    if (provider === 'brevo') return this.sendViaBrevo(msg);
    if (provider === 'resend') return this.sendViaResend(msg);
    this.logger.log(`[mock email] to=${msg.to} subject=${msg.subject}`);
    return { ok: true, provider: 'mock' };
  }

  /** "Ad <mail@x.com>" veya "mail@x.com" biçimini Brevo sender nesnesine çevirir. */
  private parseSender(raw: string): { name?: string; email: string } {
    const m = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(raw);
    if (m) {
      const name = m[1]?.replace(/^"|"$/g, '').trim();
      return { email: m[2]!.trim(), ...(name ? { name } : {}) };
    }
    return { email: raw.trim() };
  }

  /** Gönderici tanımlı değilse null: sessizce varsayılan adresle denemiyoruz. */
  private fromAddress(): string | null {
    return this.env('BREVO_SENDER') ?? this.env('EMAIL_FROM') ?? null;
  }

  private async sendViaBrevo(msg: MailMessage): Promise<MailResult> {
    const apiKey = this.env('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY eksik — mail gönderilmedi');
      return { ok: false, provider: 'brevo', error: 'BREVO_API_KEY eksik' };
    }
    const from = this.fromAddress();
    if (!from) {
      this.logger.warn('BREVO_SENDER tanımlı değil — mail gönderilmedi');
      return { ok: false, provider: 'brevo', error: 'BREVO_SENDER tanımlı değil' };
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: this.parseSender(from),
          to: [{ email: msg.to }],
          subject: msg.subject,
          htmlContent: msg.html,
          textContent: msg.text,
        }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => res.statusText);
        this.logger.warn(`Brevo failed ${res.status}: ${raw}`);
        return { ok: false, provider: 'brevo', error: raw.slice(0, 200) };
      }
      return { ok: true, provider: 'brevo' };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Brevo error: ${message}`);
      return { ok: false, provider: 'brevo', error: message };
    }
  }

  private async sendViaResend(msg: MailMessage): Promise<MailResult> {
    const apiKey = this.env('RESEND_API_KEY');
    const from = this.fromAddress() ?? 'Dokun & Kazan <onboarding@resend.dev>';
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY eksik — mail gönderilmedi');
      return { ok: false, provider: 'resend', error: 'RESEND_API_KEY eksik' };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => res.statusText);
        this.logger.warn(`Resend failed ${res.status}: ${raw}`);
        return { ok: false, provider: 'resend', error: raw.slice(0, 200) };
      }
      return { ok: true, provider: 'resend' };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Resend error: ${message}`);
      return { ok: false, provider: 'resend', error: message };
    }
  }
}
