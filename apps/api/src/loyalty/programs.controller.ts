import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Body,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { LoyaltyProgramService } from './loyalty-program.service';

@Controller('programs')
@ApiTags("programs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ProgramsController {
  constructor(private readonly programs: LoyaltyProgramService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Bu işlem için bir kafeye bağlı hesap gerekli',
      );
    }
    return user.tenantId;
  }

  private resolveTenantId(user: AuthUser): string {
    const tenantId =
      user.role === Role.SUPER_ADMIN ? user.tenantId : this.tenantIdOf(user);
    if (!tenantId) {
      throw new ForbiddenException('Tenant gerekli');
    }
    return tenantId;
  }

  /** Paket kotası + kartlar (kasiyer: kendi şubesine ait) */
  @Get()
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  listHub(@CurrentUser() user: AuthUser) {
    const tenantId = this.resolveTenantId(user);
    const branchId =
      user.role === Role.CASHIER ? (user.branchId ?? null) : undefined;
    return this.programs.getProgramsHub(tenantId, { branchId });
  }

  /** Birincil kart (tezgâh / V1 uyumu) */
  @Get('me')
  @Roles(Role.STORE_OWNER, Role.CASHIER, Role.SUPER_ADMIN)
  getMyProgram(@CurrentUser() user: AuthUser) {
    return this.programs.getPrimaryProgramDto(this.resolveTenantId(user));
  }

  /** Tek kart detayı */
  @Get(':id')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  getProgram(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.programs.getProgramDto(this.resolveTenantId(user), id);
  }

  /** Yeni kart oluştur — paket limitine tabi */
  @Post()
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  createProgram(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProgramDto,
  ) {
    return this.programs.createProgram(this.resolveTenantId(user), dto);
  }

  /** Birincil kart güncelle (tip değişmez) */
  @Patch('me')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  updateMyProgram(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programs.updatePrimaryProgram(
      this.resolveTenantId(user),
      dto,
    );
  }

  /** Belirli kartı güncelle (tip değişmez) */
  @Patch(':id')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  updateProgram(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programs.updateProgramById(
      this.resolveTenantId(user),
      id,
      dto,
    );
  }

  /** Kart sil — ledger kaydı varsa engellenir; arşiv için PATCH isActive:false */
  @Delete(':id')
  @Roles(Role.STORE_OWNER, Role.SUPER_ADMIN)
  deleteProgram(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.programs.deleteProgram(this.resolveTenantId(user), id);
  }
}
