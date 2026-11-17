import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateVipTierDto, UpdateVipTierDto } from './dto/vip.dto';
import { VipService } from './vip.service';

@Controller('vip')
@ApiTags("vip")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class VipController {
  constructor(private readonly vip: VipService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get('tiers')
  @RequirePermissions('tenant:update')
  list(@CurrentUser() user: AuthUser) {
    return this.vip.list(this.tenantIdOf(user));
  }

  @Post('tiers')
  @RequirePermissions('tenant:update')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVipTierDto) {
    return this.vip.create(this.tenantIdOf(user), dto);
  }

  @Patch('tiers/:id')
  @RequirePermissions('tenant:update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVipTierDto,
  ) {
    return this.vip.update(this.tenantIdOf(user), id, dto);
  }

  @Delete('tiers/:id')
  @RequirePermissions('tenant:update')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vip.remove(this.tenantIdOf(user), id);
  }

  @Get('customers/:customerId')
  @RequirePermissions('customer:write')
  customerTier(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.vip.getCustomerTier(this.tenantIdOf(user), customerId);
  }
}
