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
import { CrmService } from './crm.service';
import {
  AddCustomerTagDto,
  CreateCustomerNoteDto,
  CreateSegmentDto,
  SegmentRulesDto,
  SetSmsOptOutDto,
  UpdateSegmentDto,
} from './dto/crm.dto';

@Controller('crm')
@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  @Get('segments')
  @RequirePermissions('tenant:update')
  listSegments(@CurrentUser() user: AuthUser) {
    return this.crm.listSegments(this.tenantIdOf(user));
  }

  @Post('segments')
  @RequirePermissions('tenant:update')
  createSegment(@CurrentUser() user: AuthUser, @Body() dto: CreateSegmentDto) {
    return this.crm.createSegment(this.tenantIdOf(user), dto);
  }

  @Patch('segments/:id')
  @RequirePermissions('tenant:update')
  updateSegment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.crm.updateSegment(this.tenantIdOf(user), id, dto);
  }

  @Delete('segments/:id')
  @RequirePermissions('tenant:update')
  removeSegment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.removeSegment(this.tenantIdOf(user), id);
  }

  /** Sayfa için tek istek: gruplar + müşteri sayıları */
  @Get('segments/overview')
  @RequirePermissions('tenant:update')
  segmentsOverview(@CurrentUser() user: AuthUser) {
    return this.crm.segmentsOverview(this.tenantIdOf(user));
  }

  @Get('segments/:id/preview')
  @RequirePermissions('tenant:update')
  previewSegment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.previewSegmentCount(this.tenantIdOf(user), id);
  }

  @Post('segments/preview')
  @RequirePermissions('tenant:update')
  previewRules(@CurrentUser() user: AuthUser, @Body() dto: SegmentRulesDto) {
    return this.crm.previewRulesCount(this.tenantIdOf(user), dto);
  }

  @Get('customers/:customerId/tags')
  @RequirePermissions('customer:write')
  listTags(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.crm.listTags(this.tenantIdOf(user), customerId);
  }

  @Post('customers/:customerId/tags')
  @RequirePermissions('customer:write')
  addTag(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: AddCustomerTagDto,
  ) {
    return this.crm.addTag(this.tenantIdOf(user), customerId, dto);
  }

  @Delete('customers/:customerId/tags/:tag')
  @RequirePermissions('customer:write')
  removeTag(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('tag') tag: string,
  ) {
    return this.crm.removeTag(this.tenantIdOf(user), customerId, tag);
  }

  @Get('customers/:customerId/notes')
  @RequirePermissions('customer:write')
  listNotes(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.crm.listNotes(this.tenantIdOf(user), customerId);
  }

  @Post('customers/:customerId/notes')
  @RequirePermissions('customer:write')
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerNoteDto,
  ) {
    return this.crm.addNote(
      this.tenantIdOf(user),
      customerId,
      user.id,
      dto,
    );
  }

  @Get('customers/:customerId/sms-opt-out')
  @RequirePermissions('customer:write')
  getSmsOptOut(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.crm.getSmsOptOut(this.tenantIdOf(user), customerId);
  }

  @Patch('customers/:customerId/sms-opt-out')
  @RequirePermissions('customer:write')
  setSmsOptOut(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: SetSmsOptOutDto,
  ) {
    return this.crm.setSmsOptOut(
      this.tenantIdOf(user),
      customerId,
      dto.optOut,
    );
  }
}
