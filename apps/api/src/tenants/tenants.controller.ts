import { PrismaService } from '../prisma/prisma.service';
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { OtpPurpose, Role } from '@prisma/client';
import { OtpService } from '../auth/otp.service';
import { VerificationTokenDto } from '../auth/dto/otp.dto';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';
import { AssetsService, type AssetSlot } from './assets.service';
import {
  BroadcastNotificationDto,
  CreateTenantDto,
  InviteCashierDto,
  UpdateRewardRuleDto,
  UpdateTenantAdminDto,
  UpdateTenantProfileDto,
  OwnerFeedbackDto,
  ChangePlanDto,
} from './dto/tenants.dto';
import { TenantsService } from './tenants.service';
import { RewardEditorService } from './reward-editor.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { renderInviteHtml, sanitizeInviteLayout } from '../wallet/invite-page';
import { WalletService } from '../wallet/wallet.service';
import { PlansService } from '../plans/plans.service';

const ASSET_SLOTS = new Set<AssetSlot>([
  'stampFilled',
  'stampEmpty',
  'logo',
  'icon',
  'passBackground',
  'passStrip',
]);

@Controller('tenants')
@ApiTags("tenants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly wallet: WalletService,
    private readonly plans: PlansService,
    private readonly subscription: SubscriptionLifecycleService,
    private readonly rewardEditor: RewardEditorService,
    private readonly assets: AssetsService,
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
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
  @SkipSubscriptionCheck()
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
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAsset(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('slot') slotRaw: string,
    @Query('programId') programId?: string,
  ) {
    const slot = slotRaw as AssetSlot;
    if (!ASSET_SLOTS.has(slot)) {
      throw new BadRequestException(
        'slot stampFilled | stampEmpty | logo | icon | passBackground | passStrip olmalı',
      );
    }
    return this.tenantsService.saveAndPersistAsset(
      this.tenantIdOf(user),
      slot,
      file,
      programId?.trim() || undefined,
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

  /** Görsel yükle (PNG/JPEG/WebP/GIF/SVG, 5 MB) ve kütüphaneye ekle */
  @Post('me/media')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const tenantId = this.tenantIdOf(user);
    const { url } = await this.assets.saveEmailMedia(tenantId, file);
    const row = await this.prisma.tenantMedia.create({
      data: { tenantId, url, mimeType: file.mimetype, sizeBytes: file.size },
    });
    return { id: row.id, url: row.url };
  }

  /** Daha önce yüklenen görseller (en yeniler önce) */
  @Get('me/media')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  async listMedia(@CurrentUser() user: AuthUser) {
    const items = await this.prisma.tenantMedia.findMany({
      where: { tenantId: this.tenantIdOf(user) },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, url: true, createdAt: true },
    });
    return { items };
  }

  /**
   * Taslak önizleme: kaydetmeden, panelde yazılan davet metin/renklerini
   * gerçek davet sayfası olarak HTML'e çevirir (yalnızca görüntüleme).
   */
  @Post('me/invite-draft-preview')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  async inviteDraftPreview(
    @CurrentUser() user: AuthUser,
    @Body() draft: Record<string, unknown>,
  ) {
    const tenantId = this.tenantIdOf(user);
    // Her istekte güncel veri; önbellek yok, bekleme yok
    const token = this.wallet.createInvitePreviewToken(tenantId);
    const base = await this.wallet.getInvitePreviewPageData(token);
    const str = (v: unknown, max: number) =>
      typeof v === 'string' ? v.trim().slice(0, max) || null : null;
    const color = (v: unknown) =>
      typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : null;
    const data = {
      ...base,
      inviteHeadline: str(draft.inviteHeadline, 80),
      inviteSubtitle: str(draft.inviteSubtitle, 160),
      inviteCtaHint: str(draft.inviteCtaHint, 160),
      inviteStatusText: str(draft.inviteStatusText, 120),
      inviteAppleBtnLabel: str(draft.inviteAppleBtnLabel, 60),
      inviteGoogleBtnLabel: str(draft.inviteGoogleBtnLabel, 60),
      inviteFormTitle: str(draft.inviteFormTitle, 80),
      inviteLegalText: str(draft.inviteLegalText, 1000),
      inviteBgColor: color(draft.inviteBgColor),
      inviteCardColor: color(draft.inviteCardColor),
      layout: sanitizeInviteLayout(draft.inviteLayout),
      isPreview: true,
    };
    const html = renderInviteHtml({
      ...data,
      locale: 'tr',
      platform: 'both',
    } as Parameters<typeof renderInviteHtml>[0]);
    return { html };
  }

  @Post('me/invite-preview-link')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  async invitePreviewLink(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenantsService.getById(this.tenantIdOf(user));
    return {
      url: this.wallet.invitePreviewUrl(this.tenantIdOf(user)),
      // Müşterinin telefonunda açılacak gerçek kayıt bağlantısı
      enrollUrl: this.wallet.enrollUrl(tenant.slug),
    };
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
      dto.audience,
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

  /** Sadakat kartları sayfası — işletme + kartlar + kota + şubeler (tek istek) */
  @Get('me/reward-editor')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  rewardEditorData(@CurrentUser() user: AuthUser) {
    return this.rewardEditor.load(this.tenantIdOf(user));
  }

  @Get('me/onboarding')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:read')
  onboarding(@CurrentUser() user: AuthUser) {
    return this.tenantsService.onboardingStatus(this.tenantIdOf(user));
  }

  @Get('me/plan')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:read')
  async myPlan(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenantsService.getById(this.tenantIdOf(user));
    return this.plans.getTenantPlan(tenant.planCode);
  }

  @Get('me/subscription')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:read')
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.subscription.getSnapshot(this.tenantIdOf(user));
  }

  @Post('me/subscription/cancel')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  async cancelSubscription(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerificationTokenDto,
  ) {
    await this.otp.assertProofForUser(dto.verificationToken, OtpPurpose.ACCOUNT_CANCEL, user.id);
    return this.subscription.cancelSubscription(this.tenantIdOf(user));
  }

  @Post('me/subscription/suspend')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  suspendAccount(@CurrentUser() user: AuthUser) {
    return this.subscription.suspendAccount(this.tenantIdOf(user));
  }

  @Post('me/subscription/plan')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  changePlan(@CurrentUser() user: AuthUser, @Body() dto: ChangePlanDto) {
    return this.subscription.changePlan(this.tenantIdOf(user), dto.planCode);
  }

  @Post('me/deletion')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  async requestDeletion(
    @CurrentUser() user: AuthUser,
    @Body() dto: { reason: string; note?: string; verificationToken: string },
  ) {
    await this.otp.assertProofForUser(dto.verificationToken, OtpPurpose.ACCOUNT_DELETE, user.id);
    return this.tenantsService.requestDeletion(this.tenantIdOf(user), dto.reason, dto.note);
  }

  @Post('me/deletion/cancel')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  cancelDeletion(@CurrentUser() user: AuthUser) {
    return this.tenantsService.cancelDeletion(this.tenantIdOf(user));
  }

  @Post('me/subscription/resume')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  resumeSubscription(@CurrentUser() user: AuthUser) {
    return this.subscription.resumeSubscription(this.tenantIdOf(user));
  }

  @Post('me/subscription/reactivate')
  @SkipSubscriptionCheck()
  @Roles(Role.STORE_OWNER)
  @RequirePermissions('tenant:update')
  reactivateAccount(@CurrentUser() user: AuthUser) {
    return this.subscription.reactivateAccount(this.tenantIdOf(user));
  }

  @Post('me/feedback')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:read')
  feedback(
    @CurrentUser() user: AuthUser,
    @Body() dto: OwnerFeedbackDto,
  ) {
    return this.tenantsService.submitOwnerFeedback(
      this.tenantIdOf(user),
      user,
      dto,
    );
  }

  @Get(':id/overview')
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  tenantOverview(@Param('id') id: string) {
    return this.tenantsService.tenantOverview(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateTenantAdminDto) {
    return this.tenantsService.updateAdmin(id, dto);
  }
}
