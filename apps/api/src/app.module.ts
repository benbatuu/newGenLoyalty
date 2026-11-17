import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { BillingModule } from './billing/billing.module';
import { StampsModule } from './stamps/stamps.module';
import { TenantsModule } from './tenants/tenants.module';
import { WalletModule } from './wallet/wallet.module';
import { OwnerPushModule } from './owner-push/owner-push.module';
import { PublicModule } from './public/public.module';
import { SupportModule } from './support/support.module';
import { StorageModule } from './storage/storage.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { QueueModule } from './queue/queue.module';
import { PlansModule } from './plans/plans.module';

import { CampaignsModule } from './campaigns/campaigns.module';
import { BranchesModule } from './branches/branches.module';
import { NfcModule } from './nfc/nfc.module';
import { PosModule } from './pos/pos.module';
import { CrmModule } from './crm/crm.module';
import { VipModule } from './vip/vip.module';
import { ReferralsModule } from './referrals/referrals.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TableTentModule } from './table-tent/table-tent.module';
import { EmailModule } from './email/email.module';
import { SocialModule } from './social/social.module';
import { TenantApiModule } from './tenant-api/tenant-api.module';
import { GiftCreditModule } from './gift-credit/gift-credit.module';
import { PiiModule } from './pii/pii.module';
import { MenuModule } from './menu/menu.module';
import { MarketplaceBridgeModule } from './marketplace-bridge/marketplace-bridge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Render injects secrets via process.env — do not let a missing/empty
      // .env file shadow them. Local still loads .env when present.
      envFilePath: ['.env', '../../.env'],
      ignoreEnvVars: false,
    }),
    ScheduleModule.forRoot(),
    PiiModule,
    StorageModule,
    PrismaModule,
    AuthModule,
    SmsModule,
    WalletModule,
    StampsModule,
    TenantsModule,
    OwnerPushModule,
    BillingModule,
    PublicModule,
    SupportModule,
    LoyaltyModule,
    QueueModule,
    PlansModule,
    CampaignsModule,
    BranchesModule,
    NfcModule,
    PosModule,
    CrmModule,
    VipModule,
    ReferralsModule,
    AnalyticsModule,
    TableTentModule,
    EmailModule,
    SocialModule,
    TenantApiModule,
    GiftCreditModule,
    MenuModule,
    MarketplaceBridgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
