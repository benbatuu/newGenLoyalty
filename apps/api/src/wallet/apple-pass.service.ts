import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PKPass } from 'passkit-generator';
import { appleMaterialStatus, applePassMaterials } from './wallet-materials';

export type PassUpdateKind = 'stamp' | 'redeem' | 'birthday' | 'sync';

export type ApplePassBackField = {
  key: string;
  label: string;
  value: string;
  changeMessage?: string;
};

export type ApplePassInput = {
  serialNumber: string;
  organizationName: string;
  description: string;
  logoText: string;
  backgroundColor: string;
  foregroundColor?: string;
  labelColor?: string;
  stampCount: number;
  stampsRequired: number;
  rewardLabel: string;
  rewardReady: boolean;
  barcodeMessage: string;
  /** QR | PDF417 | AZTEC | CODE128 */
  barcodeFormat?: string;
  stampFieldLabel?: string;
  rewardFieldLabel?: string;
  statusFieldLabel?: string;
  broadcastFieldLabel?: string;
  broadcastEmptyText?: string;
  showStampField?: boolean;
  showRewardField?: boolean;
  showStatusField?: boolean;
  showBroadcastField?: boolean;
  rewardReadyText?: string;
  stampsRemainingTemplate?: string;
  headerFieldLabel?: string;
  stampChangeMessage?: string;
  rewardChangeMessage?: string;
  statusChangeMessage?: string;
  headerChangeMessage?: string;
  redeemChangeMessage?: string;
  birthdayMessage?: string;
  customerDisplayName?: string | null;
  /** Hangi olay için kilit ekranı bildirimi üretilecek */
  updateKind?: PassUpdateKind;
  /** Owner broadcast — ön yüz duyuru alanı */
  broadcastMessage?: string | null;
  backFields?: ApplePassBackField[];
  stripPng?: Buffer;
  strip2xPng?: Buffer;
  logoPng?: Buffer;
  logo2xPng?: Buffer;
  iconPng?: Buffer;
  icon2xPng?: Buffer;
  icon3xPng?: Buffer;
  authenticationToken?: string;
  webServiceURL?: string;
};

@Injectable()
export class ApplePassService implements OnModuleInit {
  private readonly logger = new Logger(ApplePassService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const s = appleMaterialStatus(this.config);
    if (s.ready) {
      this.logger.log('Apple Wallet materials OK');
      return;
    }
    const missing: string[] = [];
    if (!s.passTypeId) missing.push('APPLE_PASS_TYPE_ID');
    if (!s.teamId) missing.push('APPLE_TEAM_ID');
    if (!s.cert) missing.push('cert (B64/path/secret file)');
    if (!s.key) missing.push('key (B64/path/secret file)');
    if (!s.wwdr) missing.push('wwdr (B64/path/secret file)');
    this.logger.warn(
      `Apple Wallet NOT ready — missing: ${missing.join(', ')} | env=${JSON.stringify(s.env)}`,
    );
  }

  isConfigured(): boolean {
    return appleMaterialStatus(this.config).ready;
  }

  private hexToRgb(hex: string): string {
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean;
    const n = Number.parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgb(${r}, ${g}, ${b})`;
  }

  private changeMessage(template: string | undefined, fallback: string): string {
    const t = (template?.trim() || fallback).trim();
    return t.includes('%@') ? t : `${t} %@`;
  }

  /** Tek bir arka yüz alanı — Apple aynı anda birden fazla changeMessage gösterince karışıyor. */
  private buildWalletNotifyField(
    input: ApplePassInput,
  ): ApplePassBackField | null {
    const kind = input.updateKind ?? 'sync';
    if (kind === 'sync') return null;

    const stampDisplay = `${input.stampCount} / ${input.stampsRequired}`;

    if (kind === 'redeem') {
      return {
        key: 'walletNotify',
        label: ' ',
        value: stampDisplay,
        changeMessage: this.changeMessage(
          input.redeemChangeMessage,
          'Ödül kullanıldı: %@',
        ),
      };
    }

    if (kind === 'stamp' && input.rewardReady) {
      const ready = input.rewardReadyText?.trim() || 'Ödül hazır!';
      return {
        key: 'walletNotify',
        label: ' ',
        value: ready,
        changeMessage: this.changeMessage(
          input.rewardChangeMessage,
          'Ödül hazır: %@',
        ),
      };
    }

    if (kind === 'stamp') {
      return {
        key: 'walletNotify',
        label: ' ',
        value: stampDisplay,
        changeMessage: this.changeMessage(
          input.stampChangeMessage,
          'Damga güncellendi: %@',
        ),
      };
    }

    if (kind === 'birthday') {
      const name = input.customerDisplayName?.trim() || '🎉';
      const tpl =
        input.birthdayMessage?.trim() ||
        'İyi ki doğdun {name}! Bugün hediye kahven bizden.';
      const text = tpl.replace(/\{name\}/gi, name).slice(0, 120);
      return {
        key: 'walletNotify',
        label: ' ',
        value: text,
        changeMessage: '%@',
      };
    }

    return null;
  }

  private pkBarcodeFormat(raw: string | undefined): string {
    switch ((raw || 'QR').toUpperCase()) {
      case 'PDF417':
        return 'PKBarcodeFormatPDF417';
      case 'AZTEC':
        return 'PKBarcodeFormatAztec';
      case 'CODE128':
        return 'PKBarcodeFormatCode128';
      case 'QR':
      default:
        return 'PKBarcodeFormatQR';
    }
  }

  private loadAssets(): Record<string, Buffer> {
    const dir = path.join(__dirname, 'assets');
    const candidates = [
      dir,
      path.join(process.cwd(), 'src/wallet/assets'),
      path.join(process.cwd(), 'dist/wallet/assets'),
    ];
    const assetDir = candidates.find((d) =>
      fs.existsSync(path.join(d, 'icon.png')),
    );
    if (!assetDir) {
      throw new Error('Wallet PNG assets bulunamadı (icon.png)');
    }
    const at2x = '@' + '2x.png';
    return {
      'icon.png': fs.readFileSync(path.join(assetDir, 'icon.png')),
      ['icon' + at2x]: fs.readFileSync(path.join(assetDir, 'icon-2x.png')),
      'logo.png': fs.readFileSync(path.join(assetDir, 'logo.png')),
      ['logo' + at2x]: fs.readFileSync(path.join(assetDir, 'logo-2x.png')),
    };
  }

  async createPkPass(input: ApplePassInput): Promise<Buffer> {
    const materials = applePassMaterials(this.config);
    if (!materials) {
      throw new Error('Apple Wallet sertifikaları yapılandırılmamış');
    }

    const passTypeIdentifier = this.config.getOrThrow<string>(
      'APPLE_PASS_TYPE_ID',
    );
    const teamIdentifier = this.config.getOrThrow<string>('APPLE_TEAM_ID');
    const { cert: signerCert, key: signerKey, wwdr, passphrase } = materials;

    const bg = this.hexToRgb(input.backgroundColor || '#1B4332');
    const fg = this.hexToRgb(input.foregroundColor || '#FFFFFF');
    const label = this.hexToRgb(input.labelColor || '#DCDCDC');
    const remaining = Math.max(input.stampsRequired - input.stampCount, 0);
    const status = input.rewardReady
      ? input.rewardReadyText?.trim() || 'Ödül hazır!'
      : (
          input.stampsRemainingTemplate?.trim() || '{remaining} damga kaldı'
        ).replace(/\{remaining\}/gi, String(remaining));

    const stampLabel = (input.stampFieldLabel || 'DAMGA').toUpperCase();
    const rewardLabel = (input.rewardFieldLabel || 'ÖDÜL').toUpperCase();
    const statusLabel = (input.statusFieldLabel || 'DURUM').toUpperCase();
    const headerLabel = input.headerFieldLabel?.trim();
    const showStamp = input.showStampField !== false;
    const showReward = input.showRewardField !== false;
    const showStatus = input.showStatusField !== false;
    const showBroadcast = input.showBroadcastField !== false;

    const secondaryFields: Record<string, unknown>[] = [];
    if (showStamp) {
      secondaryFields.push({
        key: 'stamps',
        label: stampLabel,
        value: `${input.stampCount} / ${input.stampsRequired}`,
      });
    }
    if (showReward) {
      secondaryFields.push({
        key: 'reward',
        label: rewardLabel,
        value: input.rewardReady
          ? input.rewardReadyText?.trim() || 'Ödül hazır!'
          : input.rewardLabel,
      });
    }
    if (showStatus) {
      secondaryFields.push({
        key: 'status',
        label: statusLabel,
        value: status,
      });
    }

    const auxiliaryFields: Record<string, unknown>[] = [];
    const broadcastLabel = (
      input.broadcastFieldLabel?.trim() || 'NOTICE'
    ).toUpperCase();
    const broadcast =
      input.broadcastMessage?.trim() ||
      input.broadcastEmptyText?.trim() ||
      'No announcement';

    // Ön yüzde gizli olsa bile changeMessage için arka yüze koy (push çalışsın)
    const backFields = [...(input.backFields ?? [])].filter(
      (f) => f.value?.trim().length && f.key !== 'walletNotify',
    );
    const walletNotify = this.buildWalletNotifyField(input);
    if (walletNotify) {
      backFields.unshift(walletNotify);
    }
    if (showBroadcast) {
      auxiliaryFields.push({
        key: 'broadcast',
        label: broadcastLabel,
        value: broadcast.slice(0, 120),
        changeMessage: '%@',
      });
    } else {
      // Ön yüzde yok → push için arka yüze al (aynı key ile changeMessage)
      const withoutDup = backFields.filter(
        (f) => f.key !== 'broadcast' && f.key !== 'broadcastDetail',
      );
      withoutDup.unshift({
        key: 'broadcast',
        label: broadcastLabel,
        value: broadcast.slice(0, 120),
        changeMessage: '%@',
      });
      backFields.length = 0;
      backFields.push(...withoutDup);
    }

    const storeCard: Record<string, unknown> = {
      primaryFields: [],
      secondaryFields,
      auxiliaryFields,
    };

    if (headerLabel) {
      storeCard.headerFields = [
        {
          key: 'header',
          label: headerLabel.toUpperCase(),
          value: `${input.stampCount}/${input.stampsRequired}`,
        },
      ];
    }

    if (backFields.length > 0) {
      storeCard.backFields = backFields.map((f) => ({
        key: f.key,
        label: f.label,
        value: f.value.trim(),
        ...(f.changeMessage
          ? { changeMessage: this.changeMessage(f.changeMessage, '%@') }
          : {}),
      }));
    }

    const passJson: Record<string, unknown> = {
      formatVersion: 1,
      passTypeIdentifier,
      serialNumber: input.serialNumber,
      teamIdentifier,
      organizationName: input.organizationName,
      description: input.description,
      backgroundColor: bg,
      foregroundColor: fg,
      labelColor: label,
      barcodes: [
        {
          message: input.barcodeMessage,
          format: this.pkBarcodeFormat(input.barcodeFormat),
          messageEncoding: 'iso-8859-1',
          altText: input.barcodeMessage.slice(0, 20),
        },
      ],
      storeCard,
    };
    const logoText = input.logoText?.trim();
    if (logoText) {
      passJson.logoText = logoText;
    }

    if (input.webServiceURL && input.authenticationToken) {
      passJson.webServiceURL = input.webServiceURL.replace(/\/$/, '');
      passJson.authenticationToken = input.authenticationToken;
    } else {
      this.logger.warn(
        'Apple pass webServiceURL/authToken yok — Wallet canlı güncelleme yapamaz (HTTPS API_URL gerekir)',
      );
    }

    const at2x = '@' + '2x.png';
    const at3x = '@' + '3x.png';
    const defaults = this.loadAssets();

    // passkit-generator constructor buffers'ı TERS sırada ekler; aynı
    // isimde son eklenen kazanır. Bu yüzden her dosya için tek kaynak seçiyoruz
    // (özel ikon/logo varsayılanı ezer).
    const assets: Record<string, Buffer> = {
      'pass.json': Buffer.from(JSON.stringify(passJson)),
      'icon.png': input.iconPng ?? defaults['icon.png']!,
      ['icon' + at2x]: input.icon2xPng ?? defaults['icon' + at2x]!,
      'logo.png': input.logoPng ?? defaults['logo.png']!,
      ['logo' + at2x]: input.logo2xPng ?? defaults['logo' + at2x]!,
    };
    if (input.icon3xPng) {
      assets['icon' + at3x] = input.icon3xPng;
    }
    if (input.stripPng) assets['strip.png'] = input.stripPng;
    if (input.strip2xPng) assets['strip' + at2x] = input.strip2xPng;

    if (input.iconPng) {
      this.logger.log(
        `Apple pass özel bildirim ikonu kullanılıyor (${input.serialNumber})`,
      );
    }

    const pass = new PKPass(assets, {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase: passphrase,
    });

    // Generator ters sırada eklediği için ikonları bir kez daha zorla yaz
    if (input.iconPng) pass.addBuffer('icon.png', input.iconPng);
    if (input.icon2xPng) pass.addBuffer('icon' + at2x, input.icon2xPng);
    if (input.icon3xPng) pass.addBuffer('icon' + at3x, input.icon3xPng);

    // Güvenlik ağı: zip içinde hâlâ varsayılan (çok küçük) ikon varsa üzerine yaz
    if (input.iconPng && input.iconPng.length > 300) {
      pass.addBuffer('icon.png', input.iconPng);
      if (input.icon2xPng) pass.addBuffer('icon' + at2x, input.icon2xPng);
      if (input.icon3xPng) pass.addBuffer('icon' + at3x, input.icon3xPng);
    }

    const buf = pass.getAsBuffer();
    this.logger.debug(`Apple .pkpass üretildi: ${input.serialNumber}`);
    return buf;
  }
}
