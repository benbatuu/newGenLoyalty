import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  applePassMaterials,
  googleSaJson,
} from './wallet/wallet-materials';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getHealth() {
    const appleIds = Boolean(
      this.config.get<string>('APPLE_PASS_TYPE_ID')?.trim() &&
        this.config.get<string>('APPLE_TEAM_ID')?.trim(),
    );
    const googleIds = Boolean(
      this.config.get<string>('GOOGLE_WALLET_ISSUER_ID')?.trim() &&
        this.config
          .get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL')
          ?.trim(),
    );
    return {
      status: 'ok' as const,
      service: 'ngl-api',
      appleWallet: appleIds && applePassMaterials(this.config) !== null,
      googleWallet: googleIds && googleSaJson(this.config) !== null,
    };
  }
}
