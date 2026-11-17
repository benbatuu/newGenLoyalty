import { Module } from '@nestjs/common';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

@Module({
  providers: [SubscriptionLifecycleService],
  exports: [SubscriptionLifecycleService],
})
export class SubscriptionModule {}
