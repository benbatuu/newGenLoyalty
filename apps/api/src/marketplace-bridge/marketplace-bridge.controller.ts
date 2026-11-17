import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceBridgeGuard } from './marketplace-bridge.guard';
import { MarketplaceBridgeService } from './marketplace-bridge.service';

@ApiTags('marketplace-bridge')
@ApiHeader({
  name: 'x-marketplace-bridge-secret',
  description: 'Shared MARKETPLACE_BRIDGE_SECRET',
  required: true,
})
@Controller('marketplace-bridge')
@UseGuards(MarketplaceBridgeGuard)
export class MarketplaceBridgeController {
  constructor(private readonly bridge: MarketplaceBridgeService) {}

  @Get('customers/:customerId/programs')
  @ApiOperation({ summary: 'Wallet program balances for a customer' })
  customerPrograms(@Param('customerId') customerId: string) {
    return this.bridge.getCustomerPrograms(customerId);
  }

  @Get('customers/:customerId/ledger')
  @ApiOperation({ summary: 'Wallet ledger / history' })
  customerLedger(
    @Param('customerId') customerId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const n = take != null && take !== '' ? Number(take) : 30;
    return this.bridge.getCustomerLedger(
      customerId,
      cursor,
      Number.isFinite(n) ? n : 30,
    );
  }

  @Get('tenants')
  @ApiOperation({
    summary: 'Tenants with marketplaceListingEnabled (for MP ingest sync)',
  })
  listTenants() {
    return this.bridge.listMarketplaceTenants();
  }
}
