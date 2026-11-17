import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';
import { TenantApiKeyGuard } from '../auth/guards/tenant-api-key.guard';

@Controller('v1/external')
@ApiTags("v1-external")
@ApiSecurity("apiKey")
export class ExternalApiController {
  @Get('tenant')
  @SkipSubscriptionCheck()
  @UseGuards(TenantApiKeyGuard)
  tenantSnapshot(
    @Req() req: { tenantId?: string; tenantApiKeyId?: string },
  ) {
    return {
      ok: true,
      tenantId: req.tenantId ?? null,
      keyId: req.tenantApiKeyId ?? null,
    };
  }
}
