import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { CampaignsService } from './campaigns.service';

@Injectable()
export class CampaignQueueBootstrap implements OnModuleInit {
  constructor(
    private readonly queue: QueueService,
    private readonly campaigns: CampaignsService,
  ) {}

  onModuleInit() {
    this.queue.registerCampaignHandler(async (payload) => {
      await this.campaigns.processQueuedRun(
        payload.tenantId,
        payload.campaignId,
      );
    });
  }
}
