import { Module } from '@nestjs/common';
import { PlatformPlansController } from './platform-plans.controller';
import { PlansService } from './plans.service';

@Module({
  controllers: [PlatformPlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
