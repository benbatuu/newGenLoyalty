import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WalletService } from './wallet.service';

@Injectable()
export class BirthdayJobService {
  private readonly logger = new Logger(BirthdayJobService.name);

  constructor(private readonly wallet: WalletService) {}

  /** Her gün 09:05 Europe/Istanbul — doğum günü Wallet bildirimi */
  @Cron('5 9 * * *', { timeZone: 'Europe/Istanbul' })
  async handleDailyBirthdays() {
    try {
      const result = await this.wallet.runBirthdayNotifications();
      this.logger.log(
        `Doğum günü cron tamam: ${result.sent} bildirim / ${result.tenants} tenant`,
      );
    } catch (err) {
      this.logger.error(
        `Doğum günü cron hata: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
