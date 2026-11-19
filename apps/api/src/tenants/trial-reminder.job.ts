import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

/** Her gün 10:00 (İstanbul): deneme bitişi e-posta hatırlatmaları. */
@Injectable()
export class TrialReminderJob {
  private readonly logger = new Logger(TrialReminderJob.name);

  constructor(private readonly lifecycle: SubscriptionLifecycleService) {}

  @Cron('0 10 * * *', { timeZone: 'Europe/Istanbul' })
  async run(): Promise<void> {
    const sent = await this.lifecycle.sendTrialReminders();
    if (sent > 0) this.logger.log(`Deneme hatırlatması gönderildi: ${sent}`);
  }
}
