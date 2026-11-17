import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { StaffCardService } from '../loyalty/staff-card.service';
import {
  EnrollStaffDto,
  RedeemStaffDto,
} from '../loyalty/dto/staff-card.dto';

@Controller('programs/:programId/staff')
@ApiTags("programs-program-staff")
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  TenantGuard,
)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class ProgramStaffController {
  constructor(private readonly staff: StaffCardService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get('customers/:customerId')
  @RequirePermissions('customer:write')
  getState(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.staff.getStaffState(
      this.tenantIdOf(user),
      programId,
      customerId,
    );
  }

  @Post('customers/:customerId/enroll')
  @RequirePermissions('tenant:update')
  enroll(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: EnrollStaffDto,
  ) {
    return this.staff.enrollStaff(
      this.tenantIdOf(user),
      programId,
      customerId,
      dto.inviteCode,
    );
  }

  @Post('customers/:customerId/redeem')
  @RequirePermissions('reward:redeem')
  redeem(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: RedeemStaffDto,
  ) {
    return this.staff.redeemStaffBenefit(
      this.tenantIdOf(user),
      programId,
      customerId,
      user.id,
      {
        amountKurus: dto.amountKurus,
        managerPin: dto.managerPin,
        note: dto.note,
        branchId: user.branchId ?? undefined,
      },
    );
  }
}
