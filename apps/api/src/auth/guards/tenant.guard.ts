import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Ensures non–super-admin users only act within their tenant.
 * Expects optional `tenantId` on body/query/params when present.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      body?: { tenantId?: string };
      query?: { tenantId?: string };
      params?: { tenantId?: string };
      tenantId?: string;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Oturum gerekli');
    }

    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Tenant atanmamış');
    }

    const requested =
      request.params?.tenantId ||
      request.body?.tenantId ||
      request.query?.tenantId;

    if (requested && requested !== user.tenantId) {
      throw new ForbiddenException('Başka bir kafeye erişim yok');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
