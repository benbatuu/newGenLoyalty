import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
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
import { BranchesService } from './branches.service';
import {
  AssignCashierBranchDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@Controller('branches')
@ApiTags("branches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

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
    return this.branches.list(this.tenantIdOf(user));
  }

  @Get('context')
  @RequirePermissions('tenant:update')
  context(@CurrentUser() user: AuthUser) {
    return this.branches.getContext(this.tenantIdOf(user));
  }

  @Post()
  @RequirePermissions('tenant:update')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(this.tenantIdOf(user), dto);
  }

  @Patch(':id')
  @RequirePermissions('tenant:update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(this.tenantIdOf(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tenant:update')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.branches.remove(this.tenantIdOf(user), id);
  }

  @Patch('cashiers/:userId')
  @RequirePermissions('staff:manage')
  assignCashier(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AssignCashierBranchDto,
  ) {
    return this.branches.assignCashierBranch(
      this.tenantIdOf(user),
      userId,
      dto,
    );
  }
}
