import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ObjectStorageService } from './object-storage.service';

/**
 * Public media proxy for private R2 objects.
 * GET /media/tenants/{tenantId}/logo.png
 */
@Controller('media')
export class MediaController {
  constructor(private readonly objects: ObjectStorageService) {}

  @Get('*path')
  @Header('Cache-Control', 'public, max-age=86400')
  async get(
    @Param('path') path: string | string[],
    @Res({ passthrough: true }) res: Response,
  ) {
    const segments = Array.isArray(path) ? path : [path];
    const key = segments
      .join('/')
      .replace(/^\/+/, '')
      .split('?')[0]!
      .replace(/\.\./g, '');
    if (!key || !key.startsWith('tenants/')) {
      throw new NotFoundException();
    }
    if (!this.objects.isConfigured()) {
      throw new NotFoundException('Object storage not configured');
    }
    const obj = await this.objects.getObject(key);
    if (!obj) throw new NotFoundException();
    res.setHeader('Content-Type', obj.contentType);
    return new StreamableFile(obj.body);
  }
}
