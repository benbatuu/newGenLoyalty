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
import {
  ActivateMembershipDto,
  UseMembershipBenefitDto,
} from '../loyalty/dto/membership-card.dto';
import { MembershipCardService } from '../loyalty/membership-card.service';

@Controller('programs/:programId/membership')
@ApiTags("programs-program-membership")
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  TenantGuard,
)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class ProgramMembershipController {
  constructor(private readonly membership: MembershipCardService) {}

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
    return this.membership.getMembershipState(
      this.tenantIdOf(user),
      programId,
      customerId,
    );
  }

  @Post('customers/:customerId/activate')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  @RequirePermissions('tenant:update')
  activate(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: ActivateMembershipDto,
  ) {
    return this.membership.activateMembership(
      this.tenantIdOf(user),
      programId,
      customerId,
      dto.planId,
    );
  }

  @Post('customers/:customerId/use-benefit')
  @RequirePermissions('reward:redeem')
  useBenefit(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UseMembershipBenefitDto,
  ) {
    return this.membership.useBenefit(
      this.tenantIdOf(user),
      programId,
      customerId,
      user.id,
      dto,
    );
  }
}
