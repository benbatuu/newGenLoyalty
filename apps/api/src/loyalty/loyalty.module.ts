import { Module, forwardRef } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { WalletModule } from '../wallet/wallet.module';
import { DiscountCardService } from './discount-card.service';
import { EventCardService } from './event-card.service';
import { CashbackCardService } from './cashback-card.service';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { LoyaltyProgramService } from './loyalty-program.service';
import { MembershipCardService } from './membership-card.service';
import { MultiStampService } from './multi-stamp.service';
import { PlanLimitsService } from './plan-limits.service';
import { PointCardService } from './point-card.service';
import { StaffCardService } from './staff-card.service';
import { LoyaltyHealthController } from './loyalty-health.controller';
import { ProgramsController } from './programs.controller';
import { PlansModule } from '../plans/plans.module';
import { BranchesModule } from '../branches/branches.module';
import { VipModule } from '../vip/vip.module';

@Module({
  imports: [PlansModule, BranchesModule, VipModule, forwardRef(() => CampaignsModule), forwardRef(() => WalletModule)],
  controllers: [LoyaltyHealthController, ProgramsController],
  providers: [
    LoyaltyProgramService,
    LoyaltyEngineService,
    MultiStampService,
    PlanLimitsService,
    PointCardService,
    CashbackCardService,
    DiscountCardService,
    EventCardService,
    StaffCardService,
    MembershipCardService,
  ],
  exports: [
    LoyaltyProgramService,
    LoyaltyEngineService,
    MultiStampService,
    PlanLimitsService,
    PointCardService,
    CashbackCardService,
    DiscountCardService,
    EventCardService,
    StaffCardService,
    MembershipCardService,
  ],
})
export class LoyaltyModule {}
