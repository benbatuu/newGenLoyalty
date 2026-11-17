import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
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
import { AnalyticsService } from '../analytics/analytics.service';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Controller('campaigns')
@ApiTags("campaigns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(
    private readonly campaigns: CampaignsService,
    private readonly analytics: AnalyticsService,
  ) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get()
  @RequirePermissions('tenant:update')
  list(@CurrentUser() user: AuthUser) {
    return this.campaigns.list(this.tenantIdOf(user));
  }

  /**
   * Kampanya sayfası için tek istek: liste + müşteri grupları + öneriler.
   * Öneri hatası sayfayı bozmaz (boş liste döner). Paket yoksa 403 aynen geçer.
   */
  @Get('overview')
  @RequirePermissions('tenant:update')
  async overview(@CurrentUser() user: AuthUser) {
    const tenantId = this.tenantIdOf(user);
    const [base, suggestions] = await Promise.all([
      this.campaigns.overview(tenantId),
      this.analytics.getCampaignSuggestions(tenantId).then(
        (r) => r.suggestions,
        (err: unknown) => {
          this.logger.warn(`campaign suggestions failed: ${String(err)}`);
          return [];
        },
      ),
    ]);
    return { ...base, suggestions };
  }

  @Get('active')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  active(@CurrentUser() user: AuthUser) {
    return this.campaigns.getActiveBadges(this.tenantIdOf(user));
  }

  @Post()
  @RequirePermissions('tenant:update')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(this.tenantIdOf(user), dto);
  }

  @Patch(':id')
  @RequirePermissions('tenant:update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(this.tenantIdOf(user), id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('tenant:update')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaigns.activate(this.tenantIdOf(user), id);
  }

  @Post(':id/pause')
  @RequirePermissions('tenant:update')
  pause(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaigns.pause(this.tenantIdOf(user), id);
  }

  @Delete(':id')
  @RequirePermissions('tenant:update')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaigns.remove(this.tenantIdOf(user), id);
  }
}
