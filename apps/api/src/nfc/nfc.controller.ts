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
import {
  CreateNfcDeviceDto,
  NfcConfirmDto,
  NfcTapDto,
  UpdateNfcDeviceDto,
} from './dto/nfc.dto';
import { NfcService } from './nfc.service';

@Controller('nfc')
@ApiTags("nfc")
@ApiBearerAuth()
export class NfcController {
  constructor(private readonly nfc: NfcService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Post('tap')
  tap(@Body() dto: NfcTapDto) {
    return this.nfc.tap(null, dto);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  listDevices(@CurrentUser() user: AuthUser) {
    return this.nfc.listDevices(this.tenantIdOf(user));
  }

  @Post('devices')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  createDevice(@CurrentUser() user: AuthUser, @Body() dto: CreateNfcDeviceDto) {
    return this.nfc.createDevice(this.tenantIdOf(user), dto);
  }

  @Patch('devices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  updateDevice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNfcDeviceDto,
  ) {
    return this.nfc.updateDevice(this.tenantIdOf(user), id, dto);
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  removeDevice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.nfc.removeDevice(this.tenantIdOf(user), id);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  pending(@CurrentUser() user: AuthUser) {
    return this.nfc.listPending(this.tenantIdOf(user));
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  confirm(@CurrentUser() user: AuthUser, @Body() dto: NfcConfirmDto) {
    return this.nfc.confirm(this.tenantIdOf(user), user.id, dto);
  }
}
