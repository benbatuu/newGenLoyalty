import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { GiftCreditService } from './gift-credit.service';

class CreateGiftDto {
  @Type(() => Number)
  @IsInt()
  @Min(100)
  amountKurus!: number;
}

@Controller('gift-credits')
@ApiTags("gift-credits")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class GiftCreditController {
  constructor(private readonly gifts: GiftCreditService) {}

  private tenantId(user: AuthUser): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant gerekli');
    return user.tenantId;
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.gifts.list(this.tenantId(user));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGiftDto) {
    return this.gifts.create(this.tenantId(user), dto.amountKurus);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gifts.cancel(this.tenantId(user), id);
  }
}
