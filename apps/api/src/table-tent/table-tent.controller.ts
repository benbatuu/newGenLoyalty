import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  StreamableFile,
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
import { TableTentService } from './table-tent.service';

@Controller('table-tent')
@ApiTags("table-tent")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class TableTentController {
  constructor(private readonly tableTent: TableTentService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get('export.png')
  @RequirePermissions('tenant:update')
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="table-tent.png"')
  async export(@CurrentUser() user: AuthUser) {
    const png = await this.tableTent.exportPng(this.tenantIdOf(user));
    return new StreamableFile(png);
  }
}
