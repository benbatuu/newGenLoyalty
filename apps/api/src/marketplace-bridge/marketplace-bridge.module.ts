import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketplaceBridgeController } from './marketplace-bridge.controller';
import { MarketplaceBridgeService } from './marketplace-bridge.service';
import { MarketplaceBridgeGuard } from './marketplace-bridge.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MarketplaceBridgeController],
  providers: [MarketplaceBridgeService, MarketplaceBridgeGuard],
  exports: [MarketplaceBridgeService],
})
export class MarketplaceBridgeModule {}
