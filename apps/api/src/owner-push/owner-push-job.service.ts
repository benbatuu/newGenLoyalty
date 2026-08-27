import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OwnerPushService } from './owner-push.service';

@Injectable()
export class OwnerPushJobService {
  private readonly logger = new Logger(OwnerPushJobService.name);

  constructor(private readonly ownerPush: OwnerPushService) {}

  /** Her gün 21:00 Europe/Istanbul — owner günlük özet */
  @Cron('0 21 * * *', { timeZone: 'Europe/Istanbul' })
  async handleDailySummary() {
    try {
      const result = await this.ownerPush.runDailySummaries();
      this.logger.log(
        `Günlük owner push: ${result.sent} gönderim / ${result.tenants} tenant (${result.dedupeKey})`,
      );
    } catch (err) {
      this.logger.error(
        `Günlük owner push hata: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /** Her Pazartesi 09:00 Europe/Istanbul — owner haftalık özet */
  @Cron('0 9 * * 1', { timeZone: 'Europe/Istanbul' })
  async handleWeeklySummary() {
    try {
      const result = await this.ownerPush.runWeeklySummaries();
      this.logger.log(
        `Haftalık owner push: ${result.sent} gönderim / ${result.tenants} tenant (${result.dedupeKey})`,
      );
    } catch (err) {
      this.logger.error(
        `Haftalık owner push hata: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
