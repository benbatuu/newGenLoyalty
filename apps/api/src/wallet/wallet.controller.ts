import {
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

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('invite/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async invitePage(
    @Param('token') token: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('user-agent') userAgent?: string,
    @Query('lang') lang?: string,
  ) {
    const locale = resolveInviteLocale(acceptLanguage, lang);
    const platform = resolveInvitePlatform(userAgent);
    const data = await this.wallet.getInvitePageData(token);
    return renderInviteHtml({ ...data, locale, platform });
  }

  @Get('invite-preview/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async invitePreview(
    @Param('token') token: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('user-agent') userAgent?: string,
    @Query('lang') lang?: string,
  ) {
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
    return this.wallet.updateInviteProfile(token, body, locale);
  }

  @Get('apple/:token')
  async applePass(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buf = await this.wallet.buildApplePkPass(token);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="stamp.pkpass"',
    });
    return new StreamableFile(buf);
  }
}
