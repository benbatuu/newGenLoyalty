import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MenuService } from './menu.service';
import {
  BulkCreateTablesDto,
  CreateCategoryDto,
  CreateItemDto,
  CreateMenuFeedbackDto,
  CreateSavedMenuThemeDto,
  CreateTableDto,
  ReorderDto,
  UpdateCategoryDto,
  UpdateItemDto,
  UpdateMenuFeedbackDto,
  UpdateTableDto,
  UpdateMenuThemeDto,
} from './dto/menu.dto';

@Controller('menu')
@ApiTags("menu")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Roles(Role.STORE_OWNER)
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  private tenantIdOf(user: AuthUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant gerekli');
    }
    return user.tenantId;
  }

  @Get('context')
  @RequirePermissions('tenant:update')
  getContext(@CurrentUser() user: AuthUser) {
    return this.menu.getContext(this.tenantIdOf(user));
  }

  @Get('theme')
  @RequirePermissions('tenant:update')
  getTheme(@CurrentUser() user: AuthUser) {
    return this.menu.getTheme(this.tenantIdOf(user));
  }

  @Patch('theme')
  @RequirePermissions('tenant:update')
  updateTheme(@CurrentUser() user: AuthUser, @Body() dto: UpdateMenuThemeDto) {
    return this.menu.updateTheme(this.tenantIdOf(user), dto);
  }

  @Get('themes')
  @RequirePermissions('tenant:update')
  listThemes(@CurrentUser() user: AuthUser) {
    return this.menu.listSavedThemes(this.tenantIdOf(user));
  }

  @Post('themes')
  @RequirePermissions('tenant:update')
  createTheme(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSavedMenuThemeDto,
  ) {
    return this.menu.createSavedTheme(this.tenantIdOf(user), dto);
  }

  @Get('themes/:id')
  @RequirePermissions('tenant:update')
  getSavedTheme(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.getSavedTheme(this.tenantIdOf(user), id);
  }

  @Patch('themes/:id')
  @RequirePermissions('tenant:update')
  updateSavedTheme(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; preset?: string; document?: Record<string, unknown> },
  ) {
    return this.menu.updateSavedTheme(this.tenantIdOf(user), id, {
      name: typeof body?.name === 'string' ? body.name : undefined,
      preset: typeof body?.preset === 'string' ? body.preset : undefined,
      document:
        body?.document &&
        typeof body.document === 'object' &&
        Array.isArray(body.document.blocks)
          ? body.document
          : undefined,
    });
  }

  @Post('themes/:id/activate')
  @RequirePermissions('tenant:update')
  activateTheme(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.activateSavedTheme(this.tenantIdOf(user), id);
  }

  @Delete('themes/:id')
  @RequirePermissions('tenant:update')
  deleteTheme(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.deleteSavedTheme(this.tenantIdOf(user), id);
  }

  @Post('themes/:id/asset')
  @RequirePermissions('tenant:update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadThemeAsset(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menu.uploadThemeAsset(this.tenantIdOf(user), id, file);
  }

  // ── Categories ──────────────────────────────────────

  @Get('categories')
  @RequirePermissions('tenant:update')
  listCategories(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.menu.listCategories(this.tenantIdOf(user), branchId);
  }

  @Post('categories')
  @RequirePermissions('tenant:update')
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menu.createCategory(this.tenantIdOf(user), dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('tenant:update')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menu.updateCategory(this.tenantIdOf(user), id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('tenant:update')
  deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.deleteCategory(this.tenantIdOf(user), id);
  }

  @Post('categories/reorder')
  @RequirePermissions('tenant:update')
  reorderCategories(@CurrentUser() user: AuthUser, @Body() dto: ReorderDto) {
    return this.menu.reorderCategories(this.tenantIdOf(user), dto.ids);
  }

  @Post('categories/:id/image')
  @RequirePermissions('tenant:update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadCategoryImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menu.uploadCategoryImage(this.tenantIdOf(user), id, file);
  }

  // ── Items ───────────────────────────────────────────

  @Get('items')
  @RequirePermissions('tenant:update')
  listItems(
    @CurrentUser() user: AuthUser,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menu.listItems(this.tenantIdOf(user), categoryId);
  }

  @Post('items')
  @RequirePermissions('tenant:update')
  createItem(@CurrentUser() user: AuthUser, @Body() dto: CreateItemDto) {
    return this.menu.createItem(this.tenantIdOf(user), dto);
  }

  @Patch('items/:id')
  @RequirePermissions('tenant:update')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.menu.updateItem(this.tenantIdOf(user), id, dto);
  }

  @Delete('items/:id')
  @RequirePermissions('tenant:update')
  deleteItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.deleteItem(this.tenantIdOf(user), id);
  }

  @Post('items/:id/image')
  @RequirePermissions('tenant:update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadItemImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menu.uploadItemImage(this.tenantIdOf(user), id, file);
  }

  @Post('items/reorder')
  @RequirePermissions('tenant:update')
  reorderItems(@CurrentUser() user: AuthUser, @Body() dto: ReorderDto) {
    return this.menu.reorderItems(this.tenantIdOf(user), dto.ids);
  }

  // ── Tables ──────────────────────────────────────────

  @Get('tables')
  @RequirePermissions('tenant:update')
  listTables(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
  ) {
    return this.menu.listTables(this.tenantIdOf(user), branchId);
  }

  @Post('tables')
  @RequirePermissions('tenant:update')
  createTable(@CurrentUser() user: AuthUser, @Body() dto: CreateTableDto) {
    return this.menu.createTable(this.tenantIdOf(user), dto);
  }

  @Post('tables/bulk')
  @RequirePermissions('tenant:update')
  bulkCreateTables(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkCreateTablesDto,
  ) {
    return this.menu.bulkCreateTables(this.tenantIdOf(user), dto);
  }

  @Patch('tables/:id')
  @RequirePermissions('tenant:update')
  updateTable(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.menu.updateTable(this.tenantIdOf(user), id, dto);
  }

  @Delete('tables/:id')
  @RequirePermissions('tenant:update')
  deleteTable(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.deleteTable(this.tenantIdOf(user), id);
  }

  @Get('tags')
  @RequirePermissions('tenant:update')
  listTags(@CurrentUser() user: AuthUser) {
    return this.menu.listTags(this.tenantIdOf(user));
  }

  @Post('tags/seed-defaults')
  @RequirePermissions('tenant:update')
  seedTags(@CurrentUser() user: AuthUser) {
    return this.menu.seedDefaultTags(this.tenantIdOf(user));
  }

  @Post('tags')
  @RequirePermissions('tenant:update')
  createTag(@CurrentUser() user: AuthUser, @Body() dto: { label: string; translations?: Record<string, { name?: string }> }) {
    return this.menu.createTag(this.tenantIdOf(user), dto);
  }

  @Patch('tags/:id')
  @RequirePermissions('tenant:update')
  updateTag(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { label?: string; translations?: Record<string, { name?: string }> },
  ) {
    return this.menu.updateTag(this.tenantIdOf(user), id, dto);
  }

  @Delete('tags/:id')
  @RequirePermissions('tenant:update')
  deleteTag(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.menu.deleteTag(this.tenantIdOf(user), id);
  }

  @Get('feedback')
  @RequirePermissions('tenant:update')
  listFeedback(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    return this.menu.listFeedback(this.tenantIdOf(user), status);
  }

  @Patch('feedback/:id')
  @RequirePermissions('tenant:update')
  updateFeedback(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuFeedbackDto,
  ) {
    return this.menu.updateFeedback(this.tenantIdOf(user), id, dto);
  }
}
