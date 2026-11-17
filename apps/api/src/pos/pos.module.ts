import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { StampsModule } from '../stamps/stamps.module';
import { AdisyoPosAdapter, GenericPosAdapter, MenuluxPosAdapter, RestajetPosAdapter, SimpraPosAdapter } from './pos-adapters';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [StampsModule, LoyaltyModule],
  controllers: [PosController],
  providers: [PosService, AdisyoPosAdapter, SimpraPosAdapter, MenuluxPosAdapter, RestajetPosAdapter, GenericPosAdapter],
  exports: [PosService],
})
export class PosModule {}
