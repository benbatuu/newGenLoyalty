import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { AssetsService } from './assets.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [WalletModule, AuthModule],
  controllers: [TenantsController],
  providers: [TenantsService, AssetsService],
  exports: [TenantsService, AssetsService],
})
export class TenantsModule {}
