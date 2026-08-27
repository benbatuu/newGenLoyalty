import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import type { AssetSlot } from './assets.service';
import {
  BroadcastNotificationDto,
  CreateTenantDto,
  InviteCashierDto,
  UpdateRewardRuleDto,
  UpdateTenantAdminDto,
  UpdateTenantProfileDto,
} from './dto/tenants.dto';
import { TenantsService } from './tenants.service';
import { WalletService } from '../wallet/wallet.service';

const ASSET_SLOTS = new Set<AssetSlot>([
  'stampFilled',
  'stampEmpty',
  'logo',
  'icon',
]);

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly wallet: WalletService,
  ) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get('platform/overview')
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  platformOverview() {
    return this.tenantsService.platformOverview();
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  list() {
    return this.tenantsService.list();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get('me')
  @Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
  @RequirePermissions('tenant:read')
  me(@CurrentUser() user: AuthUser) {
    return this.tenantsService.getById(this.tenantIdOf(user));
  }

  @Post('me/assets')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2.5 * 1024 * 1024 },
    }),
  )
  uploadAsset(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('slot') slotRaw: string,
  ) {
    const slot = slotRaw as AssetSlot;
    if (!ASSET_SLOTS.has(slot)) {
      throw new BadRequestException(
        'slot stampFilled | stampEmpty | logo | icon olmalı',
      );
    }
    return this.tenantsService.saveAndPersistAsset(
      this.tenantIdOf(user),
      slot,
      file,
    );
  }

  @Patch('me')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTenantProfileDto,
  ) {
    return this.tenantsService.updateProfile(this.tenantIdOf(user), dto);
  }

  @Post('me/invite-preview-link')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  invitePreviewLink(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const token = this.wallet.createInvitePreviewToken(this.tenantIdOf(user));
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = (
      Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
    )?.split(',')[0]?.trim() || req.protocol || 'http';
    const forwardedHost = req.headers['x-forwarded-host'];
    const fromRequest =
      (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
        ?.split(',')[0]
        ?.trim() || req.get('host');
    const fromEnv = process.env.API_URL?.replace(/^https?:\/\//, '').replace(
      /\/$/,
      '',
    );
    const host =
      fromRequest ||
      fromEnv ||
      (process.env.NODE_ENV !== 'production' ? 'localhost:3001' : undefined);
    if (!host) {
      throw new BadRequestException(
        'Unable to resolve host for invite preview URL',
      );
    }
    return { url: `${proto}://${host}/wallet/invite-preview/${token}` };
  }

  @Patch('me/reward-rule')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  updateReward(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRewardRuleDto,
  ) {
    return this.tenantsService.updateRewardRule(this.tenantIdOf(user), dto);
  }

  @Get('me/notifications')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  notificationStatus(@CurrentUser() user: AuthUser) {
    return this.tenantsService.notificationStatus(this.tenantIdOf(user));
  }

  @Post('me/notifications')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  broadcast(
    @CurrentUser() user: AuthUser,
    @Body() dto: BroadcastNotificationDto,
  ) {
    return this.tenantsService.broadcastNotification(
      this.tenantIdOf(user),
      dto.message,
    );
  }

  @Get('me/staff')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('staff:manage')
  staff(@CurrentUser() user: AuthUser) {
    return this.tenantsService.listStaff(this.tenantIdOf(user));
  }

  @Post('me/staff')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('staff:manage')
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteCashierDto) {
    return this.tenantsService.inviteCashier(this.tenantIdOf(user), dto);
  }

  @Post('me/staff/:userId/reset-link')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('staff:manage')
  staffResetLink(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
  ) {
    return this.tenantsService.createStaffResetLink(
      this.tenantIdOf(user),
      userId,
    );
  }

  @Post('me/staff/:userId/password')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('staff:manage')
  setStaffPassword(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: { password: string },
  ) {
    return this.tenantsService.setStaffPassword(
      this.tenantIdOf(user),
      userId,
      body.password ?? '',
    );
  }

  @Get('me/metrics')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN, Role.CASHIER)
  @RequirePermissions('reports:read')
  metrics(@CurrentUser() user: AuthUser) {
    return this.tenantsService.metrics(this.tenantIdOf(user));
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateTenantAdminDto) {
    return this.tenantsService.updateAdmin(id, dto);
  }
}
