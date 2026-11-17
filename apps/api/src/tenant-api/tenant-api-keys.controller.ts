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
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantApiKeysService } from './tenant-api-keys.service';

class CreateKeyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;
}

@Controller('tenants/me/api-keys')
@ApiTags("tenants-me-api-keys")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class TenantApiKeysController {
  constructor(private readonly keys: TenantApiKeysService) {}

  private tenantId(user: AuthUser): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant gerekli');
    return user.tenantId;
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.keys.list(this.tenantId(user));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateKeyDto) {
    return this.keys.create(this.tenantId(user), dto.label);
  }

  @Patch(':id/revoke')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.keys.revoke(this.tenantId(user), id);
  }
}
