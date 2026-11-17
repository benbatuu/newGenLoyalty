import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PassNotifyKind, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  ApplyDiscountDto,
  VerifyDiscountDto,
} from '../loyalty/dto/discount-card.dto';
import { DiscountCardService } from '../loyalty/discount-card.service';
import { WalletService } from '../wallet/wallet.service';

@Controller('programs/:programId/discount')
@ApiTags("programs-program-discount")
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  TenantGuard,
)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class ProgramDiscountController {
  constructor(
    private readonly discount: DiscountCardService,
    private readonly wallet: WalletService,
  ) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get('customers/:customerId')
  @RequirePermissions('customer:write')
  getState(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.discount.getCustomerState(
      this.tenantIdOf(user),
      programId,
      customerId,
    );
  }

  @Post('customers/:customerId/verify')
  @RequirePermissions('customer:write')
  verify(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: VerifyDiscountDto,
  ) {
    return this.discount.verifyDiscount(
      this.tenantIdOf(user),
      programId,
      customerId,
      dto.categoryId,
    );
  }

  @Post('customers/:customerId/apply')
  @RequirePermissions('customer:write')
  async apply(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: ApplyDiscountDto,
  ) {
    const tenantId = this.tenantIdOf(user);
    const result = await this.discount.applyDiscount(
      tenantId,
      programId,
      customerId,
      user.id,
      dto,
    );

    try {
      await this.wallet.syncPasses(customerId, tenantId, {
        notifyKind: PassNotifyKind.REDEEM,
      });
    } catch {
      /* pass sync best-effort */
    }

    return result;
  }
}
