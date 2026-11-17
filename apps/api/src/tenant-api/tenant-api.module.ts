import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { TenantApiKeyGuard } from '../auth/guards/tenant-api-key.guard';
import { ExternalApiController } from './external-api.controller';
import { TenantApiKeysController } from './tenant-api-keys.controller';
import { TenantApiKeysService } from './tenant-api-keys.service';

@Module({
  imports: [PlansModule],
  controllers: [TenantApiKeysController, ExternalApiController],
  providers: [TenantApiKeysService, TenantApiKeyGuard],
  exports: [TenantApiKeysService, TenantApiKeyGuard],
})
export class TenantApiModule {}
