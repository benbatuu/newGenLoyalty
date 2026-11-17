import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FcmService } from './fcm.service';
import { OwnerPushController } from './owner-push.controller';
import { OwnerPushJobService } from './owner-push-job.service';
import { OwnerPushService } from './owner-push.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [OwnerPushController],
  providers: [FcmService, OwnerPushService, OwnerPushJobService],
  exports: [OwnerPushService],
})
export class OwnerPushModule {}
