import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { WalletService } from './wallet.service';

class RegisterDeviceDto {
  @IsString()
  @MinLength(8)
  pushToken!: string;
}

/**
 * Apple PassKit Web Service (https://developer.apple.com/documentation/walletpasses)
 * Paths are fixed under /v1 — webServiceURL on the pass points at the API root.
 */
@Controller('v1')
export class PassKitController {
  private readonly logger = new Logger(PassKitController.name);

  constructor(private readonly wallet: WalletService) {}

  @Post(
    'devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  )
  @HttpCode(201)
  async registerDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: RegisterDeviceDto,
  ) {
    this.logger.log(
      `PassKit REGISTER device=${deviceLibraryIdentifier} serial=${serialNumber}`,
    );
    await this.wallet.registerAppleDevice({
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber,
      pushToken: body.pushToken,
      authorization,
    });
    return;
  }

  @Delete(
    'devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  )
  @HttpCode(200)
  async unregisterDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    await this.wallet.unregisterAppleDevice({
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber,
      authorization,
    });
    return;
  }

  @Get(
    'devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier',
  )
  async listUpdatablePasses(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Query('passesUpdatedSince') passesUpdatedSince: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.wallet.listUpdatableApplePasses({
      deviceLibraryIdentifier,
      passTypeIdentifier,
      passesUpdatedSince,
    });
    if (!result) {
      this.logger.log(
        `PassKit listUpdatable device=${deviceLibraryIdentifier} → 204`,
      );
      res.status(204);
      return;
    }
    this.logger.log(
      `PassKit listUpdatable device=${deviceLibraryIdentifier} serials=${result.serialNumbers?.length ?? 0}`,
    );
    return result;
  }

  @Get('passes/:passTypeIdentifier/:serialNumber')
  async getLatestPass(
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('if-modified-since') ifModifiedSince: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(
      `PassKit GET pass serial=${serialNumber} ifModifiedSince=${ifModifiedSince ?? '-'}`,
    );
    const built = await this.wallet.buildApplePkPassForSerial({
      passTypeIdentifier,
      serialNumber,
      authorization,
    });

    if (
      ifModifiedSince &&
      built.updatedAt.getTime() <= new Date(ifModifiedSince).getTime()
    ) {
      this.logger.log(`PassKit GET pass serial=${serialNumber} → 304`);
      res.status(304);
      return;
    }

    this.logger.log(`PassKit GET pass serial=${serialNumber} → 200`);
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Last-Modified': built.updatedAt.toUTCString(),
      'Content-Disposition': `attachment; filename="${serialNumber}.pkpass"`,
    });
    return new StreamableFile(built.buffer);
  }

  @Post('log')
  @HttpCode(200)
  logFromDevices(@Body() body: unknown) {
    this.logger.debug(`PassKit log: ${JSON.stringify(body)}`);
    return {};
  }
}

/** Thrown as 401 when ApplePass token mismatches */
export function assertApplePassAuth(
  authorization: string | undefined,
  expectedToken: string | null | undefined,
): void {
  const expected = expectedToken?.trim();
  if (!expected) {
    throw new UnauthorizedException();
  }
  const header = (authorization ?? '').trim();
  const prefix = 'ApplePass ';
  if (!header.startsWith(prefix) || header.slice(prefix.length) !== expected) {
    throw new UnauthorizedException();
  }
}
