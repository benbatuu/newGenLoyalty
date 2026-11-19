import { OtpPurpose } from '@prisma/client';
import { OtpService } from './otp.service';
import { OtpRequestDto, OtpVerifyDto, ResetPasswordOtpDto, SensitiveOtpRequestDto } from './dto/otp.dto';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  ResetPasswordDto,
  RevokeOthersDto,
  UpdateMeDto,
} from './dto/auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { assertHttpRateLimit } from '../common/rate-limit-http';
import type { RequestMeta } from './auth.service';

function requestMeta(req: Request): RequestMeta {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? undefined,
  };
}

@Controller('auth')
@ApiTags("auth")
@ApiBearerAuth()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    await assertHttpRateLimit(req, 'auth-login', 10, 60_000);
    return this.authService.login(dto, requestMeta(req));
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Body() dto: RefreshDto) {
    await assertHttpRateLimit(req, 'auth-refresh', 30, 60_000);
    return this.authService.refresh(dto.refreshToken, requestMeta(req));
  }

  @Post('forgot-password')
  async forgotPassword(@Req() req: Request, @Body() dto: ForgotPasswordDto) {
    await assertHttpRateLimit(req, 'auth-forgot', 5, 60_000);
    return this.authService.forgotPassword(dto.email);
  }

  @Post('otp/request')
  @HttpCode(200)
  async otpRequest(@Req() req: Request, @Body() dto: OtpRequestDto) {
    await assertHttpRateLimit(req, 'auth-otp-request', 5, 60_000);
    return this.otp.request(dto.email, dto.purpose);
  }

  /** Oturumlu kullanıcıya sensitive işlem kodu gönderir (şifre değişikliği, iptal, silme). */
  @UseGuards(JwtAuthGuard)
  @Post('sensitive/otp/request')
  @HttpCode(200)
  async sensitiveOtpRequest(
    @Req() req: Request,
    @CurrentUser() user: AuthUser,
    @Body() dto: SensitiveOtpRequestDto,
  ) {
    await assertHttpRateLimit(req, 'auth-sensitive-otp', 5, 60_000);
    if (
      dto.purpose !== OtpPurpose.PASSWORD_CHANGE &&
      dto.purpose !== OtpPurpose.ACCOUNT_CANCEL &&
      dto.purpose !== OtpPurpose.ACCOUNT_DELETE
    ) {
      throw new BadRequestException('Geçersiz işlem');
    }
    const me = await this.authService.me(user.id);
    return this.otp.request(me.email, dto.purpose);
  }

  @Post('otp/verify')
  @HttpCode(200)
  async otpVerify(@Req() req: Request, @Body() dto: OtpVerifyDto) {
    await assertHttpRateLimit(req, 'auth-otp-verify', 10, 60_000);
    return this.otp.verify(dto.email, dto.purpose, dto.code);
  }

  @Post('reset-password/otp')
  @HttpCode(200)
  async resetPasswordOtp(@Req() req: Request, @Body() dto: ResetPasswordOtpDto) {
    await assertHttpRateLimit(req, 'auth-reset-otp', 10, 60_000);
    return this.otp.resetPasswordWithProof(dto.verificationToken, dto.password);
  }

  @Post('reset-password')
  async resetPassword(@Req() req: Request, @Body() dto: ResetPasswordDto) {
    await assertHttpRateLimit(req, 'auth-reset', 5, 60_000);
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user.id, dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @Req() req: Request,
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await assertHttpRateLimit(req, 'auth-change-pw', 5, 60_000);
    await this.otp.assertProofForUser(dto.verificationToken, OtpPurpose.PASSWORD_CHANGE, user.id);
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      dto.refreshToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@Req() req: Request, @CurrentUser() user: AuthUser) {
    const token = req.headers['x-session-token'];
    return this.authService.listSessions(
      user.id,
      typeof token === 'string' ? token : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.authService.revokeSession(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-others')
  @HttpCode(200)
  revokeOthers(@CurrentUser() user: AuthUser, @Body() dto: RevokeOthersDto) {
    return this.authService.revokeOtherSessions(user.id, dto.refreshToken);
  }
}
