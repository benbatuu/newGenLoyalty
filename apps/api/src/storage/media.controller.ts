import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ObjectStorageService } from './object-storage.service';

/**
 * Public media proxy for private R2 objects.
 * GET /media/tenants/{tenantId}/logo.png
 * GET /media/menu/{tenantId}/...
 * GET /media/menu-themes/{tenantId}/...
 */
const ALLOWED_MEDIA_PREFIXES = ['tenants/', 'menu/', 'menu-themes/'] as const;

@Controller('media')
@ApiTags("media")
export class MediaController {
  constructor(private readonly objects: ObjectStorageService) {}

  @Get('*path')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
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
    if (
      !key ||
      !ALLOWED_MEDIA_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      throw new NotFoundException();
    }
    if (this.objects.isConfigured()) {
      const obj = await this.objects.getObject(key);
      if (!obj) throw new NotFoundException();
      res.setHeader('Content-Type', obj.contentType);
      return new StreamableFile(obj.body);
    }

    const localPath = join(process.cwd(), 'uploads', ...key.split('/'));
    try {
      const body = await fs.readFile(localPath);
      res.setHeader('Content-Type', 'image/png');
      return new StreamableFile(body);
    } catch {
      throw new NotFoundException();
    }
  }
}
