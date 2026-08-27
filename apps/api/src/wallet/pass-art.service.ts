import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export type StampTheme =
  | 'COFFEE'
  | 'DESSERT'
  | 'STAR'
  | 'HEART'
  | 'DONUT'
  | 'CUSTOM';

export type StampInset = 'TIGHT' | 'NORMAL' | 'WIDE';

export type StampArtInput = {
  theme: StampTheme | string;
  stampCount: number;
  stampsRequired: number;
  backgroundColor: string;
  foregroundColor?: string;
  stampIconFilledUrl?: string | null;
  stampIconEmptyUrl?: string | null;
  /** Kenar boşluğu — owner ayarı */
  inset?: StampInset | string | null;
};

const STRIP_W = 750;
/** Apple storeCard strip @2x — enough height for 2–3 icon rows */
const STRIP_H = 246;
const LOGO_W = 320;
const LOGO_H = 100;
/** PassKit notification icon @1x / @2x / @3x */
const ICON_1X = 29;
const ICON_2X = 58;
const ICON_3X = 87;

const INSET_LAYOUT: Record<
  StampInset,
  { padX: number; padY: number; gapX: number; gapY: number; iconFill: number }
> = {
  TIGHT: { padX: 40, padY: 18, gapX: 10, gapY: 10, iconFill: 0.82 },
  NORMAL: { padX: 72, padY: 26, gapX: 18, gapY: 14, iconFill: 0.7 },
  WIDE: { padX: 108, padY: 30, gapX: 22, gapY: 16, iconFill: 0.6 },
};

export function normalizeStampInset(
  inset: string | null | undefined,
): StampInset {
  const t = (inset || 'NORMAL').toUpperCase();
  if (t === 'TIGHT' || t === 'NORMAL' || t === 'WIDE') return t;
  return 'NORMAL';
}

/**
 * Damga ikonlarını satır/sütun ızgarasına böler.
 * Örn. 10 → 2×5, 8 → 2×4, 9 → 3×3, ≤5 → tek satır.
 * Admin önizleme ile aynı mantık tutulmalı.
 */
export function computeStampGrid(stampsRequired: number): {
  cols: number;
  rows: number;
} {
  const n = Math.max(1, Math.min(Math.floor(stampsRequired) || 1, 16));
  if (n <= 5) return { cols: n, rows: 1 };

  // Tam bölünen, strip için geniş (çok sütun) tercih
  for (const cols of [5, 4, 3] as const) {
    if (n % cols === 0) {
      const rows = n / cols;
      if (rows <= 4) return { cols, rows };
    }
  }

  if (n <= 8) return { cols: 4, rows: Math.ceil(n / 4) };
  return { cols: 5, rows: Math.ceil(n / 5) };
}

@Injectable()
export class PassArtService {
  private readonly logger = new Logger(PassArtService.name);

  normalizeTheme(theme: string | undefined | null): StampTheme {
    const t = (theme || 'COFFEE').toUpperCase();
    if (
      t === 'COFFEE' ||
      t === 'DESSERT' ||
      t === 'STAR' ||
      t === 'HEART' ||
      t === 'DONUT' ||
      t === 'CUSTOM'
    ) {
      return t;
    }
    return 'COFFEE';
  }

  private iconSvg(theme: StampTheme, filled: boolean, color: string): string {
    const stroke = color;
    const fill = filled ? color : 'none';
    const opacity = filled ? '1' : '0.32';

    switch (theme) {
      case 'DESSERT':
        return `<g opacity="${opacity}">
          <ellipse cx="32" cy="48" rx="22" ry="8" fill="${filled ? color : 'none'}" stroke="${stroke}" stroke-width="3"/>
          <path d="M14 48 C14 28 50 28 50 48" fill="${filled ? color : 'none'}" stroke="${stroke}" stroke-width="3"/>
          <circle cx="24" cy="30" r="3" fill="${stroke}"/>
          <circle cx="32" cy="26" r="3" fill="${stroke}"/>
          <circle cx="40" cy="30" r="3" fill="${stroke}"/>
        </g>`;
      case 'STAR':
        return `<g opacity="${opacity}">
          <path d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>
        </g>`;
      case 'HEART':
        return `<g opacity="${opacity}">
          <path d="M32 50 C32 50 12 36 12 24 C12 16 18 12 24 12 C28 12 31 14 32 18 C33 14 36 12 40 12 C46 12 52 16 52 24 C52 36 32 50 32 50 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
        </g>`;
      case 'DONUT':
        return `<g opacity="${opacity}">
          <circle cx="32" cy="32" r="20" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
          <circle cx="32" cy="32" r="8" fill="none" stroke="${stroke}" stroke-width="3"/>
          <circle cx="22" cy="22" r="2.5" fill="${stroke}"/>
          <circle cx="40" cy="20" r="2.5" fill="${stroke}"/>
          <circle cx="44" cy="34" r="2.5" fill="${stroke}"/>
        </g>`;
      case 'COFFEE':
      default:
        return `<g opacity="${opacity}">
          <path d="M18 22 h28 v22 c0 10 -8 16 -14 16 s-14 -6 -14 -16 z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
          <path d="M46 28 h6 c6 0 10 4 10 10 s-4 10 -10 10 h-6" fill="none" stroke="${stroke}" stroke-width="3"/>
          <path d="M26 12 c0 6 4 6 4 12" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
          <path d="M34 10 c0 6 4 6 4 12" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
        </g>`;
    }
  }

  private async loadRemotePng(
    url: string | null | undefined,
    size: number,
  ): Promise<Buffer | null> {
    if (!url) return null;
    try {
      let buf: Buffer | null = null;
      const uploadsIdx = url.indexOf('/uploads/');
      if (uploadsIdx >= 0) {
        const rel = url.slice(uploadsIdx + '/uploads/'.length).split('?')[0]!;
        if (rel && !rel.includes('..')) {
          const { promises: fs } = await import('fs');
          const { join } = await import('path');
          const local = join(process.cwd(), 'uploads', ...rel.split('/').filter(Boolean));
          try {
            buf = await fs.readFile(local);
          } catch {
            /* fall through to HTTP */
          }
        }
      }
      if (!buf) {
        if (!/^https?:\/\//i.test(url)) return null;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        buf = Buffer.from(await res.arrayBuffer());
      }
      return sharp(buf)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    } catch (err) {
      this.logger.warn(`İkon indirilemedi: ${(err as Error).message}`);
      return null;
    }
  }

  private async withOpacity(png: Buffer, opacity: number): Promise<Buffer> {
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) {
      data[i] = Math.round(data[i] * opacity);
    }
    return sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  private stampPositions(
    total: number,
    cols: number,
    rows: number,
    inset: StampInset,
  ): { x: number; y: number; iconSize: number }[] {
    const { padX, padY, gapX, gapY, iconFill } = INSET_LAYOUT[inset];
    const usableW = STRIP_W - padX * 2;
    const usableH = STRIP_H - padY * 2;
    const cellW = Math.floor((usableW - gapX * Math.max(cols - 1, 0)) / cols);
    const cellH = Math.floor((usableH - gapY * Math.max(rows - 1, 0)) / rows);
    const iconSize = Math.max(
      24,
      Math.min(80, Math.floor(Math.min(cellW, cellH) * iconFill)),
    );
    const gridW = cols * cellW + Math.max(cols - 1, 0) * gapX;
    const gridH = rows * cellH + Math.max(rows - 1, 0) * gapY;
    const originX = padX + Math.floor((usableW - gridW) / 2);
    const originY = padY + Math.floor((usableH - gridH) / 2);

    const positions: { x: number; y: number; iconSize: number }[] = [];
    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / cols);
      const colInRow = i % cols;
      const itemsInRow = Math.min(cols, total - row * cols);
      const startCol = Math.floor((cols - itemsInRow) / 2);
      const col = startCol + colInRow;
      positions.push({
        x: originX + col * (cellW + gapX) + Math.floor((cellW - iconSize) / 2),
        y: originY + row * (cellH + gapY) + Math.floor((cellH - iconSize) / 2),
        iconSize,
      });
    }
    return positions;
  }

  async buildStampStrip(input: StampArtInput): Promise<{
    strip: Buffer;
    strip2x: Buffer;
  }> {
    const theme = this.normalizeTheme(input.theme);
    const total = Math.max(1, Math.min(input.stampsRequired || 1, 16));
    const filled = Math.max(0, Math.min(input.stampCount || 0, total));
    const fg = input.foregroundColor || '#FFFFFF';
    const bg = input.backgroundColor || '#1B4332';
    const inset = normalizeStampInset(input.inset);
    const { cols, rows } = computeStampGrid(total);
    const positions = this.stampPositions(total, cols, rows, inset);

    if (theme === 'CUSTOM') {
      const customFilled = await this.loadRemotePng(
        input.stampIconFilledUrl,
        128,
      );
      const customEmpty = await this.loadRemotePng(
        input.stampIconEmptyUrl,
        128,
      );
      if (customFilled || customEmpty) {
        const layers: sharp.OverlayOptions[] = [];
        for (let i = 0; i < total; i++) {
          const isFilled = i < filled;
          const { x, y, iconSize } = positions[i]!;
          let icon = isFilled
            ? customFilled || customEmpty!
            : customEmpty || customFilled!;
          icon = await sharp(icon)
            .resize(iconSize, iconSize, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();
          if (!isFilled && !customEmpty && customFilled) {
            icon = await this.withOpacity(icon, 0.35);
          }
          layers.push({ input: icon, left: x, top: y });
        }
        const strip2x = await sharp({
          create: {
            width: STRIP_W,
            height: STRIP_H,
            channels: 4,
            background: this.hexToRgba(bg),
          },
        })
          .composite(layers)
          .png()
          .toBuffer();
        const strip = await sharp(strip2x)
          .resize(Math.floor(STRIP_W / 2), Math.floor(STRIP_H / 2))
          .png()
          .toBuffer();
        return { strip, strip2x };
      }
    }

    const drawTheme = theme === 'CUSTOM' ? 'COFFEE' : theme;
    const icons: string[] = [];
    for (let i = 0; i < total; i++) {
      const isFilled = i < filled;
      const { x, y, iconSize } = positions[i]!;
      const scale = iconSize / 64;
      icons.push(
        `<g transform="translate(${x} ${y}) scale(${scale})">${this.iconSvg(drawTheme, isFilled, fg)}</g>`,
      );
    }
    const svg = `<svg width="${STRIP_W}" height="${STRIP_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bg}"/>
      ${icons.join('\n')}
    </svg>`;
    const strip2x = await sharp(Buffer.from(svg)).png().toBuffer();
    const strip = await sharp(strip2x)
      .resize(Math.floor(STRIP_W / 2), Math.floor(STRIP_H / 2))
      .png()
      .toBuffer();
    return { strip, strip2x };
  }

  async buildLogoAssets(
    logoUrl: string | null | undefined,
  ): Promise<{ logo: Buffer; logo2x: Buffer } | null> {
    const buf = await this.loadImageBuffer(logoUrl);
    if (!buf) return null;
    try {
      const logo2x = await sharp(buf)
        .resize(LOGO_W, LOGO_H, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      const logo = await sharp(logo2x)
        .resize(Math.floor(LOGO_W / 2), Math.floor(LOGO_H / 2))
        .png()
        .toBuffer();
      return { logo, logo2x };
    } catch (err) {
      this.logger.warn(`Logo indirilemedi: ${(err as Error).message}`);
      return null;
    }
  }

  /** Lock-screen / Wallet bildirim ikonu — koyu zemin şeffaflaştırılır, açık plaka */
  async buildNotifyIconAssets(
    iconUrl: string | null | undefined,
    _backgroundColor?: string | null,
  ): Promise<{ icon: Buffer; icon2x: Buffer; icon3x: Buffer } | null> {
    const buf = await this.loadImageBuffer(iconUrl);
    if (!buf) {
      this.logger.warn(`Bildirim ikonu yüklenemedi: ${iconUrl ?? '(yok)'}`);
      return null;
    }
    try {
      // Kilit ekranında koyu primary renk ikonu yutar — her zaman açık plaka
      const plate = { r: 245, g: 236, b: 220, alpha: 1 };
      const prepared = await this.toSquareIconSource(buf);
      const knocked = await this.knockOutNearBlack(prepared);

      const render = async (size: number) => {
        const pad = Math.max(1, Math.floor(size * 0.06));
        const inner = size - pad * 2;
        const content = await sharp(knocked)
          .resize(inner, inner, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
        // Apple kilit ekranı: alfa sorun çıkarıyor — tamamen opak PNG
        return sharp({
          create: {
            width: size,
            height: size,
            channels: 3,
            background: { r: plate.r, g: plate.g, b: plate.b },
          },
        })
          .composite([{ input: content, gravity: 'centre' }])
          .flatten({ background: { r: plate.r, g: plate.g, b: plate.b } })
          .removeAlpha()
          .png()
          .toBuffer();
      };

      const [icon, icon2x, icon3x] = await Promise.all([
        render(ICON_1X),
        render(ICON_2X),
        render(ICON_3X),
      ]);
      return { icon, icon2x, icon3x };
    } catch (err) {
      this.logger.warn(`Bildirim ikonu işlenemedi: ${(err as Error).message}`);
      return null;
    }
  }

  private async loadImageBuffer(
    url: string | null | undefined,
  ): Promise<Buffer | null> {
    if (!url) return null;
    try {
      const uploadsIdx = url.indexOf('/uploads/');
      if (uploadsIdx >= 0) {
        const rel = url.slice(uploadsIdx + '/uploads/'.length).split('?')[0]!;
        if (rel && !rel.includes('..')) {
          const { promises: fs } = await import('fs');
          const { join } = await import('path');
          const local = join(
            process.cwd(),
            'uploads',
            ...rel.split('/').filter(Boolean),
          );
          try {
            return await fs.readFile(local);
          } catch {
            /* fall through */
          }
        }
      }
      if (!/^https?:\/\//i.test(url)) return null;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      this.logger.warn(`Görsel yüklenemedi: ${(err as Error).message}`);
      return null;
    }
  }

  /** Siyah/çok koyu pikselleri şeffaf yap — logo açık plakada görünsün */
  private async knockOutNearBlack(buf: Buffer, threshold = 28): Promise<Buffer> {
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const out = Buffer.from(data);
    for (let i = 0; i < out.length; i += 4) {
      const r = out[i]!;
      const g = out[i + 1]!;
      const b = out[i + 2]!;
      if (r <= threshold && g <= threshold && b <= threshold) {
        out[i + 3] = 0;
      }
    }
    return sharp(out, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();
  }

  /**
   * Koyu/şeffaf kenarları içerik kutusuna kırp; çok yataysa sol markayı kare al.
   * Geniş kafe logolarının 29px ikonda kaybolmasını önler.
   */
  private async toSquareIconSource(buf: Buffer): Promise<Buffer> {
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
    if (w <= h * 1.25) {
      return sharp(content)
        .resize(180, 180, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
    }
    // Sol marka (fincan / amblem) — metin satırını ikona sıkıştırmayıp okunur bırak
    const side = h;
    let mark = await sharp(content)
      .extract({ left: 0, top: 0, width: Math.min(side, w), height: side })
      .png()
      .toBuffer();
    // Marka karesindeki koyu boşluğu tekrar kırp ki fincan dolsun
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
    if (n2 > 20 && x1 > x0 && y1 > y0) {
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      const pad = Math.max(2, Math.floor(Math.max(bw, bh) * 0.06));
      const left = Math.max(0, x0 - pad);
      const top = Math.max(0, y0 - pad);
      const width = Math.min(i2.width - left, bw + pad * 2);
      const height = Math.min(i2.height - top, bh + pad * 2);
      mark = await sharp(mark)
        .extract({ left, top, width, height })
        .png()
        .toBuffer();
    }
    return sharp(mark)
      .resize(180, 180, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  }

  private hexToRgba(hex: string): {
    r: number;
    g: number;
    b: number;
    alpha: number;
  } {
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean;
    const n = Number.parseInt(full, 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      alpha: 1,
    };
  }
}
