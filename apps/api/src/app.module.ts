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
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    SmsModule,
    WalletModule,
    StampsModule,
    TenantsModule,
    BillingModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
