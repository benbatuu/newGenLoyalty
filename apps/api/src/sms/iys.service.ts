import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IysConsentResult = {
  ok: boolean;
  mode: 'live' | 'stub';
  error?: string;
};

/** İYS (İleti Yönetim Sistemi) — ticari SMS rıza senkronu */
@Injectable()
export class IysService {
  private readonly logger = new Logger(IysService.name);

  constructor(private readonly config: ConfigService) {}

  private env(key: string): string | undefined {
    return (
      process.env[key]?.trim() ||
      this.config.get<string>(key)?.trim() ||
      undefined
    );
  }

  /** Rıza durumunu İYS'ye bildir (optIn=true → izinli, false → ret) */
  async syncConsent(
    phone: string,
    optIn: boolean,
  ): Promise<IysConsentResult> {
    const apiUrl = this.env('IYS_API_URL');
    const apiKey = this.env('IYS_API_KEY');
    const brandCode = this.env('IYS_BRAND_CODE');

    if (!apiUrl || !apiKey) {
      this.logger.debug(
        `IYS stub: ${optIn ? 'OPT_IN' : 'OPT_OUT'} phone=${phone.slice(-4)}`,
      );
      return { ok: true, mode: 'stub' };
    }

    const digits = phone.replace(/\D/g, '');
    const payload = {
      brandCode: brandCode ?? '',
      recipient: digits,
      type: 'MESAJ',
      status: optIn ? 'ONAY' : 'RET',
      source: 'HS_WEB',
    };

    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        this.logger.warn(`IYS sync failed ${res.status}: ${text}`);
        return { ok: false, mode: 'live', error: text.slice(0, 200) };
      }
      return { ok: true, mode: 'live' };
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.warn(`IYS sync error: ${msg}`);
      return { ok: false, mode: 'live', error: msg };
    }
  }
}
