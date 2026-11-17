import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantApiKeysService } from '../../tenant-api/tenant-api-keys.service';

export type TenantApiRequest = {
  tenantId?: string;
  tenantApiKeyId?: string;
};

@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: TenantApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      tenantId?: string;
      tenantApiKeyId?: string;
    }>();

    const raw =
      extractBearer(req.headers.authorization) ??
      headerString(req.headers['x-api-key']);

    if (!raw?.startsWith('ngl_')) {
      throw new UnauthorizedException('Geçersiz API anahtarı');
    }

    const validated = await this.apiKeys.validateKey(raw);
    req.tenantId = validated.tenantId;
    req.tenantApiKeyId = validated.keyId;
    return true;
  }
}

function extractBearer(value: string | string[] | undefined): string | null {
  const header = headerString(value);
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function headerString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() ?? null;
  return value?.trim() ?? null;
}
