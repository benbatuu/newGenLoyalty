import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apn from '@parse/node-apn';
import { applePassMaterials } from './wallet-materials';

/**
 * PassKit update push via APNs (production).
 * Modern APNs rejects a truly empty `{}` body (PayloadEmpty);
 * Wallet accepts background + content-available.
 */
@Injectable()
export class AppleApnsService implements OnModuleDestroy {
  private readonly logger = new Logger(AppleApnsService.name);
  private provider: apn.Provider | null = null;

  constructor(private readonly config: ConfigService) {}

  private getProvider(): apn.Provider | null {
    if (this.provider) return this.provider;
    try {
      const materials = applePassMaterials(this.config);
      if (!materials) return null;

      this.provider = new apn.Provider({
        cert: materials.cert,
        key: materials.key,
        passphrase: materials.passphrase,
        production: true,
      });
      return this.provider;
    } catch (err) {
      this.logger.warn(`APNs provider init: ${(err as Error).message}`);
      return null;
    }
  }

  async pushPassUpdate(pushTokens: string[]): Promise<void> {
    if (pushTokens.length === 0) return;
    const provider = this.getProvider();
    if (!provider) {
      this.logger.warn('APNs atlandı — pass sertifikası yok');
      return;
    }

    const topic = this.config.getOrThrow<string>('APPLE_PASS_TYPE_ID');
    const note = new apn.Notification();
    note.topic = topic;
    note.pushType = 'background';
    note.contentAvailable = true;
    note.priority = 10;
    note.expiry = Math.floor(Date.now() / 1000) + 3600;

    const result = await provider.send(note, pushTokens);
    if (result.failed.length > 0) {
      for (const f of result.failed) {
        const reason =
          (f.response as { reason?: string } | undefined)?.reason ??
          f.error?.message ??
          f.status ??
          'unknown';
        this.logger.warn(`APNs fail ${f.device}: ${reason}`);
      }
    }
    if (result.sent.length > 0) {
      this.logger.log(`APNs pass update → ${result.sent.length} cihaz`);
    }
  }

  onModuleDestroy() {
    this.provider?.shutdown();
    this.provider = null;
  }
}
