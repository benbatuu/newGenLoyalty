import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Service-to-service auth for Marketplace API → StampWell bridge routes.
 * Header: x-marketplace-bridge-secret
 * Env: MARKETPLACE_BRIDGE_SECRET
 */
@Injectable()
export class MarketplaceBridgeGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      (req.headers['x-marketplace-bridge-secret'] as string | undefined) ||
      (req.headers['x-bridge-secret'] as string | undefined) ||
      '';
    const expected = this.config.get<string>('MARKETPLACE_BRIDGE_SECRET') ?? '';

    if (!expected) {
      // Misconfiguration — refuse rather than open the bridge
      throw new UnauthorizedException({
        code: 'BRIDGE_SECRET_NOT_CONFIGURED',
        message: {
          tr: 'Köprü anahtarı yapılandırılmamış',
          en: 'Bridge secret is not configured',
          ru: 'Секрет моста не настроен',
        },
      });
    }
    if (!provided || provided !== expected) {
      throw new UnauthorizedException({
        code: 'BRIDGE_SECRET_INVALID',
        message: {
          tr: 'Köprü anahtarı geçersiz',
          en: 'Invalid bridge secret',
          ru: 'Неверный секрет моста',
        },
      });
    }
    return true;
  }
}
