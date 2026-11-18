import { presetIconSvg } from './stamp-presets';
import { Injectable, Logger } from '@nestjs/common';
import {
  MAX_WALLET_STAMP_SLOTS,
  computeStampGrid,
  computeWalletStampPositions,
  getStampThemeIconUrls,
  resolveWalletStampGrid,
  type GroupStampStyle,
  type WalletStampLayoutOptions,
} from '@ngl/shared';
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
  /** Satır sayısı (1–4). Boş/0 = otomatik ızgara. */
  stampRows?: number | null;
  stampLayout?: string | null;
  stampGapX?: number | null;
  stampGapY?: number | null;
  /** Ölçek / kayma / ofset / elle konum (düzenleyiciden) */
  stampLayoutOpts?: Pick<
    WalletStampLayoutOptions,
    'iconScale' | 'staggerRatio' | 'offsetX' | 'offsetY' | 'manual' | 'rowAdjust'
  >;
  /** Multi-stamp: grup bazlı dolu/boş slot dizisi */
  slotFilled?: boolean[];
  /** Multi-stamp: slot başına tema / ikon */
  slotStyles?: GroupStampStyle[];
  /** Özel tam şerit görseli — varsa damga kompoziti yerine kullanılır */
  customStripUrl?: string | null;
};

const STRIP_W = 750;
/** Apple storeCard strip @2x — PassKit [750×246](https://developer.apple.com/documentation/walletpasses) */
const STRIP_H = 246;
const STRIP_3X_W = 1125;
const STRIP_3X_H = 369;
const BG_1X_W = 180;
const BG_1X_H = 220;
const BG_2X_W = 360;
const BG_2X_H = 440;
const BG_3X_W = 540;
const BG_3X_H = 660;
const LOGO_W = 320;
const LOGO_H = 100;
/** PassKit notification icon @1x / @2x / @3x */
const ICON_1X = 29;
const ICON_2X = 58;
const ICON_3X = 87;

export function normalizeStampInset(
  inset: string | null | undefined,
): StampInset {
  const t = (inset || 'NORMAL').toUpperCase();
  if (t === 'TIGHT' || t === 'NORMAL' || t === 'WIDE') return t;
  return 'NORMAL';
}

/**
 * Re-export — admin önizleme ile aynı mantık (@ngl/shared).
 */
export { computeStampGrid, MAX_WALLET_STAMP_SLOTS };

@Injectable()
export class PassArtService {
  private readonly logger = new Logger(PassArtService.name);
  /** Aynı Thiings URL'sini strip başına tekrar indirmeyi önler */
  private readonly remotePngCache = new Map<string, Promise<Buffer | null>>();

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
    return presetIconSvg(theme, filled, color);
  }

  private async loadRemotePng(
    url: string | null | undefined,
    size: number,
  ): Promise<Buffer | null> {
    if (!url) return null;
    const cacheKey = `${url}@${size}`;
    const cached = this.remotePngCache.get(cacheKey);
    if (cached) return cached;

    const task = this.fetchRemotePng(url, size);
    this.remotePngCache.set(cacheKey, task);
    return task;
  }

  private async fetchRemotePng(
    url: string,
    size: number,
  ): Promise<Buffer | null> {
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
        let fetchUrl = url;
        try {
          const u = new URL(url);
          if (u.hostname.endsWith('.r2.cloudflarestorage.com')) {
            let key = u.pathname.replace(/^\//, '');
            if (!key.startsWith('tenants/')) {
              const parts = key.split('/');
              if (parts.length >= 2 && parts[1] === 'tenants') {
                key = parts.slice(1).join('/');
              }
            }
            if (key.startsWith('tenants/')) {
              const api =
                process.env.API_URL?.replace(/\/$/, '') ||
                process.env.APPLE_WEB_SERVICE_URL?.replace(/\/$/, '');
              if (api) fetchUrl = `${api}/media/${key}`;
            }
          }
        } catch {
          /* keep url */
        }
        if (!/^https?:\/\//i.test(fetchUrl)) return null;
        const res = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          this.logger.warn(`İkon HTTP ${res.status}: ${fetchUrl.slice(0, 80)}`);
          return null;
        }
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

  /** Strip üretiminden önce tüm benzersiz ikon URL'lerini paralel indir */
  private async prefetchStripIcons(
    total: number,
    slotFilled: boolean[] | null,
    filled: number,
    defaultTheme: StampTheme,
    defaultFilledUrl?: string | null,
    defaultEmptyUrl?: string | null,
    slotStyles?: GroupStampStyle[],
  ): Promise<void> {
    const urls = new Set<string>();
    for (let i = 0; i < total; i++) {
      const style = slotStyles?.[i];
      const slotTheme = this.normalizeTheme(style?.stampTheme ?? defaultTheme);
      const isFilled = slotFilled ? slotFilled[i]! : i < filled;
      const themeIcons =
        slotTheme !== 'CUSTOM' ? getStampThemeIconUrls(slotTheme) : null;
      const filledUrl =
        slotTheme === 'CUSTOM'
          ? style?.stampIconFilledUrl ?? defaultFilledUrl
          : themeIcons?.filledUrl;
      const emptyUrl =
        slotTheme === 'CUSTOM'
          ? style?.stampIconEmptyUrl ?? defaultEmptyUrl
          : themeIcons?.emptyUrl;
      const pick = isFilled
        ? filledUrl || emptyUrl
        : emptyUrl || filledUrl;
      if (pick) urls.add(pick);
      if (filledUrl) urls.add(filledUrl);
      if (emptyUrl) urls.add(emptyUrl);
    }
    await Promise.all(
      [...urls].map((url) => this.loadRemotePng(url, 256)),
    );
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

  private async renderSlotIconBuffer(
    theme: StampTheme,
    filled: boolean,
    fg: string,
    iconSize: number,
    filledUrl?: string | null,
    emptyUrl?: string | null,
  ): Promise<Buffer> {
    const themeIcons = theme !== 'CUSTOM' ? getStampThemeIconUrls(theme) : null;
    const resolvedFilled =
      theme === 'CUSTOM'
        ? filledUrl || themeIcons?.filledUrl
        : themeIcons?.filledUrl;
    const resolvedEmpty =
      theme === 'CUSTOM'
        ? emptyUrl || themeIcons?.emptyUrl
        : themeIcons?.emptyUrl;

    if (resolvedFilled || resolvedEmpty) {
      const customFilled = await this.loadRemotePng(resolvedFilled, 256);
      const customEmpty = await this.loadRemotePng(resolvedEmpty, 256);
      if (customFilled || customEmpty) {
        let icon = filled
          ? customFilled || customEmpty!
          : customEmpty || customFilled!;
        icon = await sharp(icon)
          .resize(iconSize, iconSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
        if (
          !filled &&
          !customEmpty &&
          customFilled &&
          !themeIcons?.emptyUrl
        ) {
          icon = await this.withOpacity(icon, 0.35);
        }
        return icon;
      }
    }

    const drawTheme = theme === 'CUSTOM' ? 'COFFEE' : theme;
    const scale = iconSize / 64;
    const svg = `<svg width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(${scale})">${this.iconSvg(drawTheme, filled, fg)}</g>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  private async buildStripComposite(
    total: number,
    positions: { x: number; y: number; iconSize: number; z?: number }[],
    slotFilled: boolean[] | null,
    filled: number,
    fg: string,
    bg: string,
    defaultTheme: StampTheme,
    defaultFilledUrl?: string | null,
    defaultEmptyUrl?: string | null,
    slotStyles?: GroupStampStyle[],
  ): Promise<{ strip: Buffer; strip2x: Buffer; strip3x: Buffer }> {
    this.remotePngCache.clear();
    await this.prefetchStripIcons(
      total,
      slotFilled,
      filled,
      defaultTheme,
      defaultFilledUrl,
      defaultEmptyUrl,
      slotStyles,
    );

    const layers: sharp.OverlayOptions[] = [];
    // Katman sırası: z küçükten büyüğe (büyük olan üstte çizilir)
    const order = Array.from({ length: total }, (_, i) => i).sort(
      (a, b) => (positions[a]!.z ?? a) - (positions[b]!.z ?? b) || a - b,
    );
    for (const i of order) {
      const style = slotStyles?.[i];
      const slotTheme = this.normalizeTheme(
        style?.stampTheme ?? defaultTheme,
      );
      const isFilled = slotFilled ? slotFilled[i]! : i < filled;
      const { x, y, iconSize } = positions[i]!;
      const useCustomIcons = slotTheme === 'CUSTOM';
      const icon = await this.renderSlotIconBuffer(
        slotTheme,
        isFilled,
        fg,
        iconSize,
        useCustomIcons
          ? style?.stampIconFilledUrl ?? defaultFilledUrl
          : null,
        useCustomIcons ? style?.stampIconEmptyUrl ?? defaultEmptyUrl : null,
      );
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
    const strip3x = await sharp(strip2x)
      .resize(STRIP_3X_W, STRIP_3X_H, { fit: 'fill' })
      .png()
      .toBuffer();
    return { strip, strip2x, strip3x };
  }

  /** Özel strip görselini Apple boyutlarına sığdır */
  async buildCustomStripAssets(
    stripUrl: string | null | undefined,
  ): Promise<{ strip: Buffer; strip2x: Buffer; strip3x: Buffer } | null> {
    const buf = await this.loadImageBuffer(stripUrl);
    if (!buf) return null;
    try {
      const strip2x = await sharp(buf)
        .resize(STRIP_W, STRIP_H, {
          fit: 'cover',
          position: 'centre',
        })
        .png()
        .toBuffer();
      const strip = await sharp(strip2x)
        .resize(Math.floor(STRIP_W / 2), Math.floor(STRIP_H / 2))
        .png()
        .toBuffer();
      const strip3x = await sharp(strip2x)
        .resize(STRIP_3X_W, STRIP_3X_H, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
      return { strip, strip2x, strip3x };
    } catch (err) {
      this.logger.warn(`Özel strip işlenemedi: ${(err as Error).message}`);
      return null;
    }
  }

  /** storeCard background @1x/@2x/@3x */
  async buildBackgroundAssets(
    backgroundUrl: string | null | undefined,
  ): Promise<{ background: Buffer; background2x: Buffer; background3x: Buffer } | null> {
    const buf = await this.loadImageBuffer(backgroundUrl);
    if (!buf) return null;
    try {
      const background3x = await sharp(buf)
        .resize(BG_3X_W, BG_3X_H, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
      const background2x = await sharp(background3x)
        .resize(BG_2X_W, BG_2X_H)
        .png()
        .toBuffer();
      const background = await sharp(background3x)
        .resize(BG_1X_W, BG_1X_H)
        .png()
        .toBuffer();
      return { background, background2x, background3x };
    } catch (err) {
      this.logger.warn(`Arka plan işlenemedi: ${(err as Error).message}`);
      return null;
    }
  }

  async buildStampStrip(input: StampArtInput): Promise<{
    strip: Buffer;
    strip2x: Buffer;
    strip3x: Buffer;
  }> {
    if (input.customStripUrl?.trim()) {
      const custom = await this.buildCustomStripAssets(input.customStripUrl);
      if (custom) return custom;
    }

    const theme = this.normalizeTheme(input.theme);
    const slotFilled = input.slotFilled?.length
      ? input.slotFilled.slice(0, MAX_WALLET_STAMP_SLOTS)
      : null;
    const total = slotFilled
      ? slotFilled.length
      : Math.max(
          1,
          Math.min(input.stampsRequired || 1, MAX_WALLET_STAMP_SLOTS),
        );
    const filled = slotFilled
      ? slotFilled.filter(Boolean).length
      : Math.max(0, Math.min(input.stampCount || 0, total));
    const fg = input.foregroundColor || '#FFFFFF';
    const bg = input.backgroundColor || '#1B4332';
    const inset = normalizeStampInset(input.inset);
    const { cols, rows } = resolveWalletStampGrid(
      total,
      computeStampGrid(total),
      input.stampRows,
    );
    const positions = computeWalletStampPositions(
      total,
      cols,
      rows,
      inset,
      undefined,
      undefined,
      {
        layout: input.stampLayout === 'STAGGERED' ? 'STAGGERED' : 'GRID',
        gapX: input.stampGapX,
        gapY: input.stampGapY,
        ...input.stampLayoutOpts,
      },
    );

    const perSlotStyles = input.slotStyles?.length
      ? input.slotStyles.slice(0, total)
      : undefined;

    return this.buildStripComposite(
      total,
      positions,
      slotFilled,
      filled,
      fg,
      bg,
      theme,
      theme === 'CUSTOM' ? input.stampIconFilledUrl : null,
      theme === 'CUSTOM' ? input.stampIconEmptyUrl : null,
      perSlotStyles,
    );
  }

  /**
   * Pass header logo (@1x / @2x).
   * Apple slot ≈ 160×50 pt (320×100 @2x). Square uploads must be LEFT-aligned
   * and height-maximized — `fit:contain` centering leaves empty gap on the left
   * (looks like reserved logoText space even when logoText is omitted).
   */
  async buildLogoAssets(
    logoUrl: string | null | undefined,
  ): Promise<{ logo: Buffer; logo2x: Buffer } | null> {
    const buf = await this.loadImageBuffer(logoUrl);
    if (!buf) return null;
    try {
      const trimmed = await sharp(buf).trim({ threshold: 4 }).png().toBuffer();
      const source = trimmed.length > 64 ? trimmed : buf;

      const fitted2x = await sharp(source)
        .resize({
          width: LOGO_W,
          height: LOGO_H,
          fit: 'inside',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .png()
        .toBuffer();

      const meta = await sharp(fitted2x).metadata();
      const w = meta.width ?? LOGO_W;
      const h = meta.height ?? LOGO_H;
      const top = Math.max(0, Math.floor((LOGO_H - h) / 2));

      const logo2x = await sharp({
        create: {
          width: LOGO_W,
          height: LOGO_H,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: fitted2x, left: 0, top }])
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
      const { promises: fs } = await import('fs');
      const { join } = await import('path');

      const tryLocalKey = async (key: string): Promise<Buffer | null> => {
        if (!key || key.includes('..')) return null;
        const local = join(
          process.cwd(),
          'uploads',
          ...key.split('/').filter(Boolean),
        );
        try {
          return await fs.readFile(local);
        } catch {
          return null;
        }
      };

      const mediaIdx = url.indexOf('/media/');
      if (mediaIdx >= 0) {
        const key = url.slice(mediaIdx + '/media/'.length).split('?')[0]!;
        const local = await tryLocalKey(key);
        if (local) return local;
      }

      const uploadsIdx = url.indexOf('/uploads/');
      if (uploadsIdx >= 0) {
        const rel = url.slice(uploadsIdx + '/uploads/'.length).split('?')[0]!;
        const local = await tryLocalKey(rel);
        if (local) return local;
      }

      let fetchUrl = url;
      try {
        const u = new URL(url);
        if (u.hostname.endsWith('.r2.cloudflarestorage.com')) {
          let key = u.pathname.replace(/^\//, '');
          if (!key.startsWith('tenants/')) {
            const parts = key.split('/');
            if (parts.length >= 2 && parts[1] === 'tenants') {
              key = parts.slice(1).join('/');
            }
          }
          if (key.startsWith('tenants/')) {
            const api =
              process.env.API_URL?.replace(/\/$/, '') ||
              process.env.APPLE_WEB_SERVICE_URL?.replace(/\/$/, '');
            if (api) fetchUrl = `${api}/media/${key}`;
          }
        }
      } catch {
        /* keep url */
      }

      if (!/^https?:\/\//i.test(fetchUrl)) return null;
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
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
