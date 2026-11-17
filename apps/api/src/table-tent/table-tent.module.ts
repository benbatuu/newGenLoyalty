import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { TableTentController } from './table-tent.controller';
import { TableTentService } from './table-tent.service';

@Module({
  imports: [WalletModule],
  controllers: [TableTentController],
  providers: [TableTentService],
})
export class TableTentModule {}
