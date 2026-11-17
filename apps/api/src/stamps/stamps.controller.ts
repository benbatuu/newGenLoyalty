import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role, StampSource } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  AddStampDto,
  RedeemRewardDto,
  FindCustomerQueryDto,
  ListCustomersQueryDto,
  RegisterCustomerDto,
  ScanPassDto,
  ScanCashbackDto,
  WalletInviteDto,
} from './dto/stamps.dto';
import { CounterService } from './counter.service';
import { StampsService } from './stamps.service';

@Controller('stamps')
@ApiTags("stamps")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class StampsController {
  constructor(
    private readonly stampsService: StampsService,
    private readonly counterService: CounterService,
  ) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  /** Scan Wallet pass QR → stamp (barcode message = customerId). */
  @Post('scan')
  @RequirePermissions('customer:write')
  scanPass(@CurrentUser() user: AuthUser, @Body() dto: ScanPassDto) {
    return this.stampsService.stampByPassCode(
      this.tenantIdOf(user),
      dto.code,
      user.id,
    );
  }

  /** Pass QR → indirim kartı doğrula */
  @Post('scan-discount')
  @RequirePermissions('customer:write')
  scanDiscount(
    @CurrentUser() user: AuthUser,
    @Body() dto: ScanPassDto & { programId: string; categoryId?: string },
  ) {
    return this.stampsService.verifyDiscountByPassCode(
      this.tenantIdOf(user),
      dto.code,
      dto.programId,
      dto.categoryId,
    );
  }

  /** Pass QR → cashback kazanım (CASHBACK_CARD, customerId:programId barcode) */
  @Post('scan-cashback')
  @RequirePermissions('customer:write')
  scanCashback(@CurrentUser() user: AuthUser, @Body() dto: ScanCashbackDto) {
    return this.stampsService.scanCashbackByPassCode(
      this.tenantIdOf(user),
      dto.code,
      user.id,
      {
        amountKurus: dto.amountKurus,
        categoryId: dto.categoryId,
        confirmed: dto.confirmed,
        posReceiptId: dto.posReceiptId,
      },
    );
  }

  /** Kasa açılışı — kartlar, bugünün özeti, aktif kampanyalar, ödül kuralı (tek istek) */
  @Get('counter')
  @RequirePermissions('customer:write', 'reports:read')
  counter(@CurrentUser() user: AuthUser) {
    return this.counterService.bootstrap(
      this.tenantIdOf(user),
      user.role === Role.CASHIER ? (user.branchId ?? null) : undefined,
    );
  }

  /** Müşteri profili — özet ve tüm hareketler */
  @Get('customers/:customerId/timeline')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  customerTimeline(@CurrentUser() user: AuthUser, @Param('customerId') customerId: string) {
    return this.stampsService.customerTimeline(this.tenantIdOf(user), customerId);
  }

  /** Kasa — seçilen müşteri + tüm kartların durumu (tek istek) */
  @Get('customers/:id/counter-state')
  @RequirePermissions('customer:write')
  counterState(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.counterService.customerState(
      this.tenantIdOf(user),
      id,
      user.role === Role.CASHIER ? (user.branchId ?? null) : undefined,
    );
  }

  @Get('customers/directory')
  @RequirePermissions('customer:write')
  directory(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.stampsService.listCustomers(this.tenantIdOf(user), {
      q: query.q,
      filter: query.filter ?? 'all',
      take: query.take ?? 20,
      page: query.page ?? 1,
      lean: query.lean === '1',
    });
  }

  @Get('customers/export.csv')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="customers.csv"',
  )
  async exportCustomers(@CurrentUser() user: AuthUser) {
    const csv = await this.stampsService.exportCustomersCsv(
      this.tenantIdOf(user),
    );
    return `\uFEFF${csv}`;
  }

  @Get('ledger/export.csv')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('reports:read')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="stamp-ledger.csv"')
  async exportLedger(@CurrentUser() user: AuthUser) {
    const csv = await this.stampsService.exportLedgerCsv(this.tenantIdOf(user));
    return `\uFEFF${csv}`;
  }

  @Get('customers')
  @RequirePermissions('customer:write')
  findCustomers(
    @CurrentUser() user: AuthUser,
    @Query() query: FindCustomerQueryDto,
  ) {
    return this.stampsService.findByPhone(this.tenantIdOf(user), query.phone);
  }

  @Post('customers')
  @RequirePermissions('customer:write')
  register(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterCustomerDto,
  ) {
    return this.stampsService.register(
      this.tenantIdOf(user),
      dto.phone,
      user.id,
      dto.programIds,
    );
  }

  /** Wallet davetine uygun aktif kartlar */
  @Get('wallet-invite/programs')
  @RequirePermissions('customer:write')
  walletInvitePrograms(@CurrentUser() user: AuthUser) {
    return this.stampsService.listWalletInvitePrograms(this.tenantIdOf(user));
  }

  @Get('customers/:customerId/export')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  exportOne(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.stampsService.exportCustomerData(
      this.tenantIdOf(user),
      customerId,
    );
  }

  @Delete('customers/:customerId')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('customer:write')
  deleteCustomer(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.stampsService.deleteCustomer(
      this.tenantIdOf(user),
      customerId,
    );
  }

  @Post('customers/:customerId/stamp')
  @RequirePermissions('customer:write')
  addStamp(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: AddStampDto,
  ) {
    return this.stampsService.addStamp(
      this.tenantIdOf(user),
      customerId,
      user.id,
      dto.source ?? StampSource.cashier,
      { productGroupId: dto.productGroupId },
    );
  }

  /** Invite URL for in-store QR (no SMS). Use when SMS trial omits the link. */
  @Get('customers/:customerId/wallet-invite')
  @RequirePermissions('customer:write')
  walletInvite(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.stampsService.walletInviteLink(
      this.tenantIdOf(user),
      customerId,
    );
  }

  @Post('customers/:customerId/wallet-invite')
  @RequirePermissions('customer:write')
  walletInviteWithPrograms(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: WalletInviteDto,
  ) {
    return this.stampsService.walletInviteLink(
      this.tenantIdOf(user),
      customerId,
      dto.programIds,
    );
  }

  @Post('customers/:customerId/redeem')
  @RequirePermissions('reward:redeem')
  redeem(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: RedeemRewardDto,
  ) {
    return this.stampsService.redeemReward(
      this.tenantIdOf(user),
      customerId,
      user.id,
      dto.tierId,
    );
  }

  @Get('summary/today')
  @RequirePermissions('reports:read')
  summary(@CurrentUser() user: AuthUser) {
    return this.stampsService.dailySummary(this.tenantIdOf(user));
  }

  /** Son sadakat hareketleri (damga, ödül, puan…) — panel özet akışı */
  @Get('activity/recent')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('reports:read')
  recentActivity(
    @CurrentUser() user: AuthUser,
    @Query('take') take?: string,
  ) {
    const n = Math.min(20, Math.max(1, Number(take) || 8));
    return this.stampsService.recentActivity(this.tenantIdOf(user), n);
  }

  @Get('reports/near-reward/export.csv')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('reports:read')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="near-reward.csv"',
  )
  async exportNearReward(@CurrentUser() user: AuthUser) {
    return this.stampsService.exportNearRewardCsv(this.tenantIdOf(user));
  }
}
