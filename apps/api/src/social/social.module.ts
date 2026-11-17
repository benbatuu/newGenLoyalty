import { Module, forwardRef } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { StampsModule } from '../stamps/stamps.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [PlansModule, forwardRef(() => StampsModule)],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
