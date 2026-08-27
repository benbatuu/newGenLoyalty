import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  appleMaterialStatus,
  googleMaterialStatus,
} from './wallet/wallet-materials';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getHealth() {
    const apple = appleMaterialStatus(this.config);
    const google = googleMaterialStatus(this.config);
    return {
      status: 'ok' as const,
      service: 'ngl-api',
      appleWallet: apple.ready,
      googleWallet: google.ready,
      wallet: { apple, google },
      storage: {
        r2: Boolean(
          process.env.R2_ACCOUNT_ID?.trim() &&
            process.env.R2_ACCESS_KEY_ID?.trim() &&
            process.env.R2_SECRET_ACCESS_KEY?.trim() &&
            process.env.R2_BUCKET?.trim() &&
            process.env.R2_PUBLIC_BASE_URL?.trim(),
        ),
      },
    };
  }
}
