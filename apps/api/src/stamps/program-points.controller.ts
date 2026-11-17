import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
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
  EarnPointsDto,
  RedeemPointsDto,
} from '../loyalty/dto/point-card.dto';
import { PointCardService } from '../loyalty/point-card.service';
import { WalletService } from '../wallet/wallet.service';

@Controller('programs/:programId/points')
@ApiTags("programs-program-points")
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  TenantGuard,
)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class ProgramPointsController {
  constructor(
    private readonly points: PointCardService,
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
    return this.points.getCustomerState(
      this.tenantIdOf(user),
      programId,
      customerId,
    );
  }

  @Post('customers/:customerId/preview')
  @RequirePermissions('customer:write')
  preview(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: EarnPointsDto,
  ) {
    return this.points.previewEarn(
      this.tenantIdOf(user),
      programId,
      customerId,
      dto.amountKurus,
      dto.categoryId,
    );
  }

  @Post('customers/:customerId/earn')
  @RequirePermissions('customer:write')
  async earn(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: EarnPointsDto,
  ) {
    const tenantId = this.tenantIdOf(user);
    const result = await this.points.earnPoints(
      tenantId,
      programId,
      customerId,
      user.id,
      dto,
    );

    try {
      await this.wallet.syncPasses(customerId, tenantId, {
        notifyKind: PassNotifyKind.STAMP,
      });
    } catch {
      /* pass sync best-effort */
    }

    return result;
  }

  @Post('customers/:customerId/redeem')
  @RequirePermissions('customer:write')
  async redeem(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: RedeemPointsDto,
  ) {
    const tenantId = this.tenantIdOf(user);
    const result = await this.points.redeemPoints(
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
