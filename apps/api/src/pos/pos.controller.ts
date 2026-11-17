import {
  Body,
  Controller,
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
  CreatePosIntegrationDto,
  UpdatePosIntegrationDto,
} from './dto/pos.dto';
import { PosService } from './pos.service';

@Controller('pos')
@ApiTags("pos")
@ApiBearerAuth()
export class PosController {
  constructor(private readonly pos: PosService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Post('webhook/:integrationId')
  webhook(
    @Param('integrationId') integrationId: string,
    @Body() payload: unknown,
  ) {
    return this.pos.handleWebhook(integrationId, payload);
  }

  @Get('integrations')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  list(@CurrentUser() user: AuthUser) {
    return this.pos.listIntegrations(this.tenantIdOf(user));
  }

  @Post('integrations')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePosIntegrationDto) {
    return this.pos.createIntegration(this.tenantIdOf(user), dto);
  }

  @Patch('integrations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePosIntegrationDto,
  ) {
    return this.pos.updateIntegration(this.tenantIdOf(user), id, dto);
  }

  @Get('integrations/:id/events')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  events(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.pos.listEvents(this.tenantIdOf(user), id);
  }
}
