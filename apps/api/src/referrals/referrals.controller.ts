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
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  GenerateByPhoneDto,
  RedeemByPhoneDto,
  RedeemReferralDto,
} from './dto/referral.dto';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
@ApiTags("referrals")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  /** Sayfa için tek istek: kodlar + özet + son kullanımlar */
  @Get('overview')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  overview(@CurrentUser() user: AuthUser) {
    return this.referrals.overview(this.tenantIdOf(user));
  }

  @Post('generate-by-phone')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  generateByPhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateByPhoneDto,
  ) {
    return this.referrals.generateByPhone(this.tenantIdOf(user), dto.phone);
  }

  @Post('redeem-by-phone')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  redeemByPhone(@CurrentUser() user: AuthUser, @Body() dto: RedeemByPhoneDto) {
    return this.referrals.redeemByPhone(
      this.tenantIdOf(user),
      dto.code,
      dto.phone,
      user.id,
    );
  }

  @Get('codes')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  list(
    @CurrentUser() user: AuthUser,
    @Query('customerId') customerId?: string,
  ) {
    return this.referrals.listCodes(this.tenantIdOf(user), customerId);
  }

  @Post('customers/:customerId/generate')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  generate(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.referrals.generateCode(this.tenantIdOf(user), customerId);
  }

  @Post('redeem')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemReferralDto) {
    return this.referrals.redeem(
      this.tenantIdOf(user),
      dto.customerId,
      dto.code,
      user.id,
    );
  }
}
