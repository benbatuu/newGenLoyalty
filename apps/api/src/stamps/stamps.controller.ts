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
  FindCustomerQueryDto,
  ListCustomersQueryDto,
  RegisterCustomerDto,
  ScanPassDto,
} from './dto/stamps.dto';
import { StampsService } from './stamps.service';

@Controller('stamps')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class StampsController {
  constructor(private readonly stampsService: StampsService) {}

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
    );
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

  @Post('customers/:customerId/redeem')
  @RequirePermissions('reward:redeem')
  redeem(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.stampsService.redeemReward(
      this.tenantIdOf(user),
      customerId,
      user.id,
    );
  }

  @Get('summary/today')
  @RequirePermissions('reports:read')
  summary(@CurrentUser() user: AuthUser) {
    return this.stampsService.dailySummary(this.tenantIdOf(user));
  }

  @Get('reports')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('reports:read')
  reports(@CurrentUser() user: AuthUser) {
    return this.stampsService.reports(this.tenantIdOf(user));
  }
}
