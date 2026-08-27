import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';

export type AssetSlot = 'stampFilled' | 'stampEmpty' | 'logo' | 'icon';

const SLOT_FILE: Record<AssetSlot, string> = {
  stampFilled: 'stamp-filled.png',
  stampEmpty: 'stamp-empty.png',
  logo: 'logo.png',
  icon: 'notify-icon.png',
};

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  readonly uploadsRoot = path.join(process.cwd(), 'uploads');

  constructor(private readonly config: ConfigService) {}

  /** Absolute public URL base for stored assets (admin preview + optional fetch). */
  publicBaseUrl(): string {
    const raw =
      this.config.get<string>('API_URL') ||
      this.config.get<string>('APPLE_WEB_SERVICE_URL') ||
      `http://localhost:${this.config.get('API_PORT') ?? 3001}`;
    return raw.replace(/\/$/, '');
  }

  tenantDir(tenantId: string): string {
    return path.join(this.uploadsRoot, 'tenants', tenantId);
  }

  /**
   * Resolve a stored asset URL to a local file path under uploads/, if any.
   * Accepts absolute http(s) URLs containing /uploads/ or relative /uploads/… paths.
   */
  resolveLocalPath(url: string | null | undefined): string | null {
    if (!url) return null;
    const marker = '/uploads/';
    const idx = url.indexOf(marker);
    if (idx < 0) return null;
    const rel = url.slice(idx + marker.length).split('?')[0]!;
    if (!rel || rel.includes('..')) return null;
    return path.join(this.uploadsRoot, ...rel.split('/').filter(Boolean));
  }

  async saveTenantImage(
    tenantId: string,
    slot: AssetSlot,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Sadece PNG, JPEG, WebP, GIF veya SVG yükleyin',
      );
    }
    if (file.size > 2.5 * 1024 * 1024) {
      throw new BadRequestException('Dosya en fazla 2.5 MB olabilir');
    }

    const dir = this.tenantDir(tenantId);
    await fs.mkdir(dir, { recursive: true });
    const filename = SLOT_FILE[slot];
    const dest = path.join(dir, filename);

    try {
      // Bildirim ikonu: kenarları kırpıp kareye oturt (geniş logo sorununu azalt)
      if (slot === 'icon') {
        const prepared = await this.prepareNotifyIconSquare(file.buffer);
        await sharp(prepared).png().toFile(dest);
      } else {
        const size = slot === 'logo' ? 640 : 256;
        await sharp(file.buffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(dest);
      }
    } catch (err) {
      this.logger.warn(`Görsel işlenemedi: ${(err as Error).message}`);
      throw new BadRequestException('Görsel işlenemedi — geçerli bir resim seçin');
    }

    const url = `${this.publicBaseUrl()}/uploads/tenants/${tenantId}/${filename}?v=${Date.now()}`;
    return { url };
  }

  /** Koyu kenar kırp + geniş logoda sol marka → 180² opak kare */
  private async prepareNotifyIconSquare(buf: Buffer): Promise<Buffer> {
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const thr = 18;
    let minX = info.width;
    let minY = info.height;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;
        if (a > 20 && (r > thr || g > thr || b > thr)) {
          count++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    let content = buf;
    if (count > 40 && maxX > minX && maxY > minY) {
      content = await sharp(buf)
        .extract({
          left: minX,
          top: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        })
        .png()
        .toBuffer();
    }
    const meta = await sharp(content).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const mark =
      w > h * 1.25
        ? await sharp(content)
            .extract({
              left: 0,
              top: 0,
              width: Math.min(h, w),
              height: h,
            })
            .png()
            .toBuffer()
        : content;
    // Marka karesindeki koyu boşluğu tekrar kırp
    const { data: d2, info: i2 } = await sharp(mark)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let x0 = i2.width;
    let y0 = i2.height;
    let x1 = 0;
    let y1 = 0;
    let n2 = 0;
    for (let y = 0; y < i2.height; y++) {
      for (let x = 0; x < i2.width; x++) {
        const i = (y * i2.width + x) * 4;
        if (d2[i + 3]! > 20 && (d2[i]! > thr || d2[i + 1]! > thr || d2[i + 2]! > thr)) {
          n2++;
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    let tight = mark;
    if (n2 > 20 && x1 > x0 && y1 > y0) {
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      const pad = Math.max(2, Math.floor(Math.max(bw, bh) * 0.06));
      const left = Math.max(0, x0 - pad);
      const top = Math.max(0, y0 - pad);
      tight = await sharp(mark)
        .extract({
          left,
          top,
          width: Math.min(i2.width - left, bw + pad * 2),
          height: Math.min(i2.height - top, bh + pad * 2),
        })
        .png()
        .toBuffer();
    }
    // Siyah zemini şeffaflaştır, krem plakaya oturt (kilit ekranı görünürlüğü)
    const { data: d3, info: i3 } = await sharp(tight)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const knocked = Buffer.from(d3);
    for (let i = 0; i < knocked.length; i += 4) {
      if (knocked[i]! <= 28 && knocked[i + 1]! <= 28 && knocked[i + 2]! <= 28) {
        knocked[i + 3] = 0;
      }
    }
    const transparent = await sharp(knocked, {
      raw: { width: i3.width, height: i3.height, channels: 4 },
    })
      .png()
      .toBuffer();
    return sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 245, g: 236, b: 220, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(transparent)
            .resize(156, 156, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer(),
          gravity: 'centre',
        },
      ])
      .png()
      .toBuffer();
  }
}
