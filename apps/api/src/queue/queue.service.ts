import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  CAMPAIGN_JOB_RUN,
  type CampaignJobPayload,
  QUEUE_CAMPAIGN,
} from './queue.constants';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: IORedis | null = null;
  private campaignQueue: Queue<CampaignJobPayload> | null = null;
  private campaignWorker: Worker<CampaignJobPayload> | null = null;
  private campaignHandler: ((payload: CampaignJobPayload) => Promise<void>) | null =
    null;

  constructor(private readonly config: ConfigService) {}

  /** CampaignsModule tarafından kayıt — döngüsel import önlenir */
  registerCampaignHandler(
    fn: (payload: CampaignJobPayload) => Promise<void>,
  ) {
    this.campaignHandler = fn;
  }

  get enabled(): boolean {
    return !!this.config.get<string>('REDIS_URL')?.trim();
  }

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.logger.log(
        'REDIS_URL tanımlı değil — BullMQ devre dışı (kampanyalar için opsiyonel)',
      );
      return;
    }

    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.campaignQueue = new Queue<CampaignJobPayload>(QUEUE_CAMPAIGN, {
      connection: this.connection,
    });

    this.campaignWorker = new Worker<CampaignJobPayload>(
      QUEUE_CAMPAIGN,
      async (job) => {
        if (this.campaignHandler) {
          await this.campaignHandler(job.data);
        } else {
          this.logger.debug(
            `Campaign job (no handler): tenant=${job.data.tenantId} campaign=${job.data.campaignId}`,
          );
        }
      },
      { connection: this.connection },
    );

    this.campaignWorker.on('failed', (job, err) => {
      this.logger.warn(
        `Campaign job ${job?.id ?? '?'} failed: ${err.message}`,
      );
    });

    this.logger.log('BullMQ campaign queue hazır');
  }

  async onModuleDestroy() {
    await this.campaignWorker?.close();
    await this.campaignQueue?.close();
    await this.connection?.quit();
  }

  /** Kampanya çalıştırma — Redis yoksa no-op */
  async enqueueCampaignRun(payload: CampaignJobPayload): Promise<boolean> {
    if (!this.campaignQueue) {
      this.logger.debug(
        `Campaign enqueue skipped (no Redis): ${payload.campaignId}`,
      );
      return false;
    }
    await this.campaignQueue.add(CAMPAIGN_JOB_RUN, payload, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return true;
  }

  health() {
    return {
      enabled: this.enabled,
      connected: !!this.campaignQueue,
      queues: this.enabled ? [QUEUE_CAMPAIGN] : [],
    };
  }
}
