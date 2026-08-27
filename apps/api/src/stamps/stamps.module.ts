import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { StampsController } from './stamps.controller';
import { StampsService } from './stamps.service';

@Module({
  imports: [WalletModule],
  controllers: [StampsController],
  providers: [StampsService],
  exports: [StampsService],
})
export class StampsModule {}
