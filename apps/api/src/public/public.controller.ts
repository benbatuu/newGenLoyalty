import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { assertHttpRateLimit } from '../common/rate-limit-http';
import {
  ContactLeadDto,
  PublicEnrollDto,
  PublicPortalDto,
  PublicSignupDto,
  PublicSocialClaimDto,
} from './dto/public.dto';
import { PublicService } from './public.service';
import { MenuService } from '../menu/menu.service';
import { CreateMenuFeedbackDto } from '../menu/dto/menu.dto';
import { renderEnrollHtml, resolveEnrollLocale } from '../wallet/enroll-page';

class UpdateLeadDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

function assertPublicRate(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
) {
  return assertHttpRateLimit(req, bucket, limit, windowMs);
}

@Controller()
@ApiTags("root")
@ApiBearerAuth()
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly menuService: MenuService,
  ) {}

  /** Marketing iletişim formu — auth yok */
  @Post('public/contact')
  async contact(@Req() req: Request, @Body() dto: ContactLeadDto) {
    await assertPublicRate(req, 'contact', 8, 60_000);
    return this.publicService.createLead(dto);
  }

  /** Self-serve trial kafe kaydı — auth yok */
  @Post('public/signup')
  async signup(@Req() req: Request, @Body() dto: PublicSignupDto) {
    await assertPublicRate(req, 'signup', 5, 60_000);
    return this.publicService.signup(dto);
  }

  /** Web sitesi fiyatlandırma — auth yok */
  @Get('public/plans')
  listPlans() {
    return this.publicService.listPlans();
  }

  /** Müşteri portalı — slug + telefon (GET kept for older clients) */
  @Get('public/portal')
  async portalGet(
    @Req() req: Request,
    @Query('slug') slug?: string,
    @Query('phone') phone?: string,
  ) {
    await assertPublicRate(req, 'portal', 30, 60_000);
    if (!slug?.trim() || !phone?.trim()) {
      throw new BadRequestException('slug ve phone gerekli');
    }
    return this.publicService.portalStatus(slug, phone);
  }

  /** Preferred — phone stays out of query/access logs */
  @Post('public/portal')
  async portalPost(@Req() req: Request, @Body() dto: PublicPortalDto) {
    await assertPublicRate(req, 'portal', 30, 60_000);
    return this.publicService.portalStatus(dto.slug, dto.phone);
  }

  /** Sosyal ödül talebi — auth yok */
  @Post('public/social/claim')
  async socialClaim(@Req() req: Request, @Body() dto: PublicSocialClaimDto) {
    await assertPublicRate(req, 'social-claim', 10, 60_000);
    return this.publicService.submitSocialClaim(dto);
  }


  /** Marketplace köprüsü — tüketiciye açık program kartları (STAFF_CARD hariç) */
  @Get('public/programs/:slug')
  async publicPrograms(@Req() req: Request, @Param('slug') slug: string) {
    await assertPublicRate(req, 'public-programs', 60, 60_000);
    return this.publicService.getPublicPrograms(slug);
  }

  /** Marketplace köprüsü — işletme public profili (JSON).Kaynak: getEnrollPageData */
  @Get('public/business-profile/:slug')
  async businessProfile(@Req() req: Request, @Param('slug') slug: string) {
    await assertPublicRate(req, 'business-profile', 60, 60_000);
    return this.publicService.getEnrollPageData(slug);
  }

  /** Self-enroll QR sayfası */
  @Get('wallet/enroll/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async enrollPage(
    @Param('slug') slug: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveEnrollLocale(acceptLanguage, lang);
    const data = await this.publicService.getEnrollPageData(slug);
    return renderEnrollHtml({ ...data, locale });
  }

  @Post('wallet/enroll/:slug/submit')
  async enrollSubmit(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body() dto: PublicEnrollDto,
  ) {
    await assertPublicRate(req, 'enroll', 15, 60_000);
    return this.publicService.selfEnroll(slug, dto.phone, dto.consent === true);
  }

  @Get('public/menu/:slug')
  @Header('Cache-Control', 'no-store')
  async publicMenu(
    @Param('slug') slug: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.menuService.getPublicMenu(slug, branchId);
  }

  @Get('public/menu/:slug/table/:qrCode')
  @Header('Cache-Control', 'no-store')
  async publicMenuByTable(
    @Param('slug') slug: string,
    @Param('qrCode') qrCode: string,
  ) {
    return this.menuService.getPublicMenuByTable(slug, qrCode);
  }

  @Post('public/menu/:slug/feedback')
  async publicMenuFeedback(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body() dto: CreateMenuFeedbackDto,
  ) {
    await assertPublicRate(req, 'menu-feedback', 12, 60_000);
    return this.menuService.createPublicFeedback(slug, dto);
  }

  @Get('public/leads')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  listLeads(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('take') take?: string,
  ) {
    const parsed = take ? Number(take) : undefined;
    return this.publicService.listLeads({
      status,
      source,
      take: parsed && parsed > 0 ? parsed : undefined,
    });
  }

  @Patch('public/leads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequirePermissions('tenant:manage')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.publicService.updateLeadStatus(id, dto.status, dto.notes);
  }
}
