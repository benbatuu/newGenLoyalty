import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { googleSaJson } from './wallet-materials';

export type GooglePassInput = {
  tenantSlug: string;
  tenantName: string;
  primaryColor: string;
  logoUrl?: string | null;
  programName?: string | null;
  customerId: string;
  phone: string;
  stampCount: number;
  stampsRequired: number;
  rewardLabel: string;
  rewardReady: boolean;
  stampFieldLabel?: string | null;
  rewardFieldLabel?: string | null;
  statusFieldLabel?: string | null;
  rewardReadyText?: string | null;
  stampsRemainingTemplate?: string | null;
  passDescription?: string | null;
  passHowItWorks?: string | null;
  passTerms?: string | null;
  passLocations?: string | null;
  passHours?: string | null;
  passWebsiteUrl?: string | null;
  passPhone?: string | null;
};

const DEFAULT_LOGO =
  'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg';

@Injectable()
export class GoogleWalletService {
  private readonly logger = new Logger(GoogleWalletService.name);
  private auth: GoogleAuth | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    try {
      const issuerId = this.config.get<string>('GOOGLE_WALLET_ISSUER_ID')?.trim();
      const email = this.config
        .get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL')
        ?.trim();
      if (!issuerId || !email) return false;
      return googleSaJson(this.config) !== null;
    } catch {
      return false;
    }
  }

  private issuerId(): string {
    return this.config.getOrThrow<string>('GOOGLE_WALLET_ISSUER_ID');
  }

  private saCredentials(): {
    private_key: string;
    client_email: string;
  } {
    const raw = googleSaJson(this.config);
    if (!raw) {
      throw new Error('Google Wallet service account key yok');
    }
    return JSON.parse(raw.toString('utf8')) as {
      private_key: string;
      client_email: string;
    };
  }

  private saEmail(): string {
    return this.config.getOrThrow<string>(
      'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL',
    );
  }

  classId(tenantSlug: string): string {
    const safe = tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${this.issuerId()}.ngl_${safe}_loyalty`;
  }

  objectId(customerId: string): string {
    return `${this.issuerId()}.ngl_cust_${customerId}`;
  }

  private logoUri(input: GooglePassInput): string {
    const url = input.logoUrl?.trim();
    if (url?.startsWith('https://')) return url;
    return DEFAULT_LOGO;
  }

  private buildClass(input: GooglePassInput) {
    return {
      id: this.classId(input.tenantSlug),
      issuerName: input.tenantName,
      reviewStatus: 'UNDER_REVIEW',
      programName: input.programName?.trim() || 'Damga Kartı',
      hexBackgroundColor: input.primaryColor || '#1B4332',
      programLogo: {
        sourceUri: {
          uri: this.logoUri(input),
        },
        contentDescription: {
          defaultValue: {
            language: 'tr-TR',
            value: input.tenantName,
          },
        },
      },
    };
  }

  private buildObject(input: GooglePassInput) {
    const remaining = Math.max(input.stampsRequired - input.stampCount, 0);
    const status = input.rewardReady
      ? input.rewardReadyText?.trim() || 'Ödül hazır!'
      : (input.stampsRemainingTemplate?.trim() || '{remaining} damga kaldı').replace(
          /\{remaining\}/gi,
          String(remaining),
        );

    const textModulesData: { id: string; header: string; body: string }[] = [
      {
        id: 'reward',
        header: input.rewardFieldLabel?.trim() || 'Ödül',
        body: input.rewardLabel,
      },
      {
        id: 'status',
        header: input.statusFieldLabel?.trim() || 'Durum',
        body: status,
      },
    ];

    const extras: [string, string, string | null | undefined][] = [
      ['about', 'Hakkında', input.passDescription],
      ['how', 'Nasıl çalışır?', input.passHowItWorks],
      ['terms', 'Koşullar', input.passTerms],
      ['locations', 'Şubeler', input.passLocations],
      ['hours', 'Saatler', input.passHours],
      ['phone', 'Telefon', input.passPhone],
      ['web', 'Web', input.passWebsiteUrl],
    ];
    for (const [id, header, body] of extras) {
      const v = body?.trim();
      if (v) textModulesData.push({ id, header, body: v });
    }

    const linksModuleData = input.passWebsiteUrl?.trim().startsWith('http')
      ? {
          uris: [
            {
              uri: input.passWebsiteUrl.trim(),
              description: 'Web sitesi',
            },
          ],
        }
      : undefined;

    return {
      id: this.objectId(input.customerId),
      classId: this.classId(input.tenantSlug),
      state: 'ACTIVE',
      accountId: input.phone,
      accountName: `Müşteri · ${input.phone.slice(-4)}`,
      loyaltyPoints: {
        label: input.stampFieldLabel?.trim() || 'Damga',
        balance: { int: input.stampCount },
      },
      secondaryLoyaltyPoints: {
        label: 'Hedef',
        balance: { string: `${input.stampsRequired} · ${input.rewardLabel}` },
      },
      barcode: {
        type: 'QR_CODE',
        value: input.customerId,
        alternateText: status,
      },
      hexBackgroundColor: input.primaryColor || '#1B4332',
      textModulesData,
      ...(linksModuleData ? { linksModuleData } : {}),
    };
  }

  private getAuth(): GoogleAuth {
    if (!this.auth) {
      this.auth = new GoogleAuth({
        credentials: this.saCredentials(),
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });
    }
    return this.auth;
  }

  /** Best-effort REST upsert; JWT save link works even if this fails in demo. */
  async upsertClassAndObject(input: GooglePassInput): Promise<void> {
    if (!this.isConfigured()) return;

    const client = await this.getAuth().getClient();
    const classBody = this.buildClass(input);
    const objectBody = this.buildObject(input);
    const base = 'https://walletobjects.googleapis.com/walletobjects/v1';

    try {
      await client.request({
        url: `${base}/loyaltyClass/${classBody.id}`,
        method: 'GET',
      });
      await client.request({
        url: `${base}/loyaltyClass/${classBody.id}`,
        method: 'PUT',
        data: classBody,
      });
    } catch {
      try {
        await client.request({
          url: `${base}/loyaltyClass`,
          method: 'POST',
          data: classBody,
        });
      } catch (err) {
        this.logger.warn(
          `Google loyaltyClass upsert atlandı: ${(err as Error).message}`,
        );
      }
    }

    try {
      await client.request({
        url: `${base}/loyaltyObject/${objectBody.id}`,
        method: 'GET',
      });
      await client.request({
        url: `${base}/loyaltyObject/${objectBody.id}`,
        method: 'PUT',
        data: objectBody,
      });
    } catch {
      try {
        await client.request({
          url: `${base}/loyaltyObject`,
          method: 'POST',
          data: objectBody,
        });
      } catch (err) {
        this.logger.warn(
          `Google loyaltyObject upsert atlandı: ${(err as Error).message}`,
        );
      }
    }
  }

  createSaveUrl(input: GooglePassInput): string {
    if (!this.isConfigured()) {
      throw new Error('Google Wallet yapılandırılmamış');
    }

    const keyJson = this.saCredentials();

    const claims = {
      iss: keyJson.client_email || this.saEmail(),
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyClasses: [this.buildClass(input)],
        loyaltyObjects: [this.buildObject(input)],
      },
    };

    const token = jwt.sign(claims, keyJson.private_key, {
      algorithm: 'RS256',
    });

    return `https://pay.google.com/gp/v/save/${token}`;
  }
}
