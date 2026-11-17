import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { VipModule } from '../vip/vip.module';
import { WalletModule } from '../wallet/wallet.module';
import { StampsController } from './stamps.controller';
import { CounterService } from './counter.service';
import { StampsService } from './stamps.service';
import { ProgramDiscountController } from './program-discount.controller';
import { ProgramEventController } from './program-event.controller';
import { ProgramMembershipController } from './program-membership.controller';
import { ProgramPointsController } from './program-points.controller';
import { ProgramCashbackController } from './program-cashback.controller';
import { ProgramStaffController } from './program-staff.controller';

@Module({
  imports: [WalletModule, LoyaltyModule, CampaignsModule, VipModule],
  controllers: [
    StampsController,
    ProgramPointsController,
    ProgramCashbackController,
    ProgramDiscountController,
    ProgramEventController,
    ProgramStaffController,
    ProgramMembershipController,
  ],
  providers: [StampsService, CounterService],
  exports: [StampsService],
})
export class StampsModule {}
