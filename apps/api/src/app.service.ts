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
    };
  }
}
