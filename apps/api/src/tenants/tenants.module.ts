import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { CrmModule } from '../crm/crm.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OwnerPushModule } from '../owner-push/owner-push.module';
import { PlansModule } from '../plans/plans.module';
import { WalletModule } from '../wallet/wallet.module';
import { AssetsService } from './assets.service';
import { SubscriptionModule } from './subscription.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { RewardEditorService } from './reward-editor.service';

@Module({
  imports: [
    WalletModule,
    AuthModule,
    OwnerPushModule,
    LoyaltyModule,
    PlansModule,
    BranchesModule,
    SubscriptionModule,
    CrmModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService, AssetsService, RewardEditorService],
  exports: [TenantsService, AssetsService, SubscriptionModule],
})
export class TenantsModule {}
