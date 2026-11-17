import { Module, forwardRef } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CrmModule } from '../crm/crm.module';
import { OwnerPushModule } from '../owner-push/owner-push.module';
import { SmsModule } from '../sms/sms.module';
import { WalletModule } from '../wallet/wallet.module';
import { PlansModule } from '../plans/plans.module';
import { CampaignQueueBootstrap } from './campaign-queue.bootstrap';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [
    PlansModule,
    AnalyticsModule,
    CrmModule,
    SmsModule,
    OwnerPushModule,
    forwardRef(() => WalletModule),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignQueueBootstrap],
  exports: [CampaignsService],
})
export class CampaignsModule {}
