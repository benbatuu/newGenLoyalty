import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsOptional, IsString, Matches } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { AnalyticsService } from './analytics.service';
import { DashboardService } from './dashboard.service';

class DashboardQueryDto {
  /** YYYY-MM-DD — dahil */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  /** YYYY-MM-DD — dahil */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

@Controller('analytics')
@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly dashboardService: DashboardService,
  ) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  /** Özet ve raporlar sayfası — tüm veri tek istekte */
  @Get('dashboard')
  @RequirePermissions('reports:read')
  dashboard(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.dashboard(
      this.tenantIdOf(user),
      query.from,
      query.to,
    );
  }

  @Get('campaign-suggestions')
  @RequirePermissions('reports:read')
  campaignSuggestions(@CurrentUser() user: AuthUser) {
    return this.analytics.getCampaignSuggestions(this.tenantIdOf(user));
  }
}
