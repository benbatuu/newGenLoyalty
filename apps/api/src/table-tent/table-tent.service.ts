import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class TableTentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async exportPng(tenantId: string): Promise<Buffer> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, isActive: true },
    });
    if (!tenant) throw new NotFoundException('İşletme bulunamadı');

    const inviteUrl = this.wallet.enrollUrl(tenant.slug);
    const qrPng = await QRCode.toBuffer(inviteUrl, {
      type: 'png',
      width: 280,
      margin: 1,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });

    const width = 420;
    const height = 595;
    const primary = tenant.primaryColor ?? '#2d5016';
    const name = tenant.name.slice(0, 48);
    const cta = 'Telefonunuzla okutun — sadakat kartınızı cüzdanınıza ekleyin';

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#faf9f7"/>
        <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="16" fill="${primary}" opacity="0.08"/>
        <text x="50%" y="72" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#1a1a1a">${escapeXml(name)}</text>
        <text x="50%" y="108" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#555">${escapeXml(cta)}</text>
      </svg>
    `;

    const base = await sharp(Buffer.from(svg)).png().toBuffer();
    const qrResized = await sharp(qrPng)
      .resize(240, 240)
      .png()
      .toBuffer();

    return sharp(base)
      .composite([{ input: qrResized, top: 160, left: Math.floor((width - 240) / 2) }])
      .png()
      .toBuffer();
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
