import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  RegisterPushDeviceDto,
  UnregisterPushDeviceDto,
  UpdatePushSettingsDto,
} from './dto/owner-push.dto';
import { OwnerPushService } from './owner-push.service';

@Controller('users/me/push')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STORE_OWNER)
export class OwnerPushController {
  constructor(private readonly ownerPush: OwnerPushService) {}

  @Get('settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.ownerPush.getSettings(user.id);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePushSettingsDto,
  ) {
    return this.ownerPush.updateSettings(user.id, dto.enabled);
  }

  @Post('devices')
  registerDevice(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.ownerPush.registerDevice(user.id, dto.fcmToken, dto.platform);
  }

  @Delete('devices')
  unregisterDevice(
    @CurrentUser() user: AuthUser,
    @Body() dto: UnregisterPushDeviceDto,
  ) {
    return this.ownerPush.unregisterDevice(user.id, dto.fcmToken);
  }
}
