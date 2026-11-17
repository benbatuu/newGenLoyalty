import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SocialService } from './social.service';

@Controller('social')
@ApiTags("social")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class SocialController {
  constructor(private readonly social: SocialService) {}

  private tenantId(user: AuthUser): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant gerekli');
    return user.tenantId;
  }

  @Get('claims/pending')
  listPending(@CurrentUser() user: AuthUser) {
    return this.social.listPending(this.tenantId(user));
  }

  @Patch('claims/:id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.social.approve(this.tenantId(user), id, user.id);
  }

  @Patch('claims/:id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.social.reject(this.tenantId(user), id);
  }
}
