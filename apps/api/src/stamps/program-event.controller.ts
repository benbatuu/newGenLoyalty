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
import { PassNotifyKind, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { EventCheckInDto } from '../loyalty/dto/event-card.dto';
import { EventCardService } from '../loyalty/event-card.service';
import { WalletService } from '../wallet/wallet.service';

@Controller('programs/:programId/event')
@ApiTags("programs-program-event")
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  TenantGuard,
)
@Roles(Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER)
export class ProgramEventController {
  constructor(
    private readonly event: EventCardService,
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

  @Get('customers/:customerId')
  @RequirePermissions('customer:write')
  getState(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.event.getCustomerState(
      this.tenantIdOf(user),
      programId,
      customerId,
    );
  }

  @Post('customers/:customerId/check-in')
  @RequirePermissions('customer:write')
  async checkIn(
    @CurrentUser() user: AuthUser,
    @Param('programId') programId: string,
    @Param('customerId') customerId: string,
    @Body() dto: EventCheckInDto,
  ) {
    const tenantId = this.tenantIdOf(user);
    const result = await this.event.checkIn(
      tenantId,
      programId,
      customerId,
      user.id,
      dto,
    );

    try {
      await this.wallet.syncPasses(customerId, tenantId, {
        notifyKind: PassNotifyKind.STAMP,
      });
    } catch {
      /* pass sync best-effort */
    }

    return result;
  }
}
