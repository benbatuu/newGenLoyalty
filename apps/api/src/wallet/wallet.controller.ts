import {
  HttpException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { Response } from 'express';
import { renderInviteHtml, resolveInviteLocale, resolveInvitePlatform } from './invite-page';
import { WalletService } from './wallet.service';

class InviteProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  birthMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  birthDay?: number;
}

/**
 * Davet sayfası: satır içi betik/stil ve dış görseller (Wallet damga görselleri, marka logosu)
 * için CSP. Genel API CSP'si bunları engellediği için bu sayfalarda ayrı politika kullanılır.
 */
const INVITE_PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https: data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors *",
  "base-uri 'self'",
].join('; ');

@Controller('wallet')
@ApiTags("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  /** Kısa davet linki: adres çubuğunda kısa kalır, sayfa doğrudan açılır */
  @Get('i/:code')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async shortInvitePage(
    @Res({ passthrough: true }) res: Response,
    @Param('code') code: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('user-agent') userAgent?: string,
    @Query('lang') lang?: string,
) {
    res.setHeader('Content-Security-Policy', INVITE_PAGE_CSP);
    const token = await this.wallet.tokenForShortCode(code);
    const locale = resolveInviteLocale(acceptLanguage, lang);
    const platform = resolveInvitePlatform(userAgent);
    const data = await this.wallet.getInvitePageData(token);
    return renderInviteHtml({ ...data, locale, platform });
  }

  @Get('invite/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async invitePage(
    @Res({ passthrough: true }) res: Response,
    @Param('token') token: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('user-agent') userAgent?: string,
    @Query('lang') lang?: string,
) {
    res.setHeader('Content-Security-Policy', INVITE_PAGE_CSP);
    const locale = resolveInviteLocale(acceptLanguage, lang);
    const platform = resolveInvitePlatform(userAgent);
    const data = await this.wallet.getInvitePageData(token);
    return renderInviteHtml({ ...data, locale, platform });
  }

  @Get('invite-preview/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async invitePreview(
    @Res({ passthrough: true }) res: Response,
    @Param('token') token: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('user-agent') userAgent?: string,
    @Query('lang') lang?: string,
) {
    res.setHeader('Content-Security-Policy', INVITE_PAGE_CSP);
    const locale = resolveInviteLocale(acceptLanguage, lang);
    const platform = resolveInvitePlatform(userAgent);
    const data = await this.wallet.getInvitePreviewPageData(token);
    return renderInviteHtml({ ...data, locale, platform });
  }

  @Post('invite/:token/profile')
  async inviteProfile(
    @Param('token') token: string,
    @Body() body: InviteProfileDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = resolveInviteLocale(acceptLanguage);
    try {
      await this.wallet.updateInviteProfile(token, body, locale);
    } catch (err) {
      // Beklenmeyen hata: nedenini API terminaline yaz (500 yerine gerçek sebep izlenebilsin)
      if (!(err instanceof HttpException)) {
        console.error('[invite-profile] güncelleme hatası:', err);
      }
      throw err;
    }
    // Sayfa yenilenecek; kayıt sonrası sayfa verisini yeniden hesaplamaya gerek yok
    return { ok: true };
  }

  @Get('apple/:token/:programId')
  async applePassForProgram(
    @Res({ passthrough: true }) res: Response,
    @Param('token') token: string,
    @Param('programId') programId: string,
  ) {
    const buf = await this.wallet.buildApplePkPass(token, programId);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="card-${programId}.pkpass"`,
    });
    return new StreamableFile(buf);
  }

  @Get('apple/:token')
  async applePass(
    @Res({ passthrough: true }) res: Response,
    @Param('token') token: string,
  ) {
    const buf = await this.wallet.buildApplePkPass(token);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="stamp.pkpass"',
    });
    return new StreamableFile(buf);
  }
}
