import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PlansService } from './plans.service';

@Controller('platform/plans')
@ApiTags("platform-plans")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('tenant:manage')
export class PlatformPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list() {
    return this.plans.listAdmin();
  }

  @Get(':code')
  get(@Param('code') code: string) {
    return this.plans.getByCode(code);
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(code, dto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.plans.remove(code);
  }
}
