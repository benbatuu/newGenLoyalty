import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';
import { SubscriptionLifecycleService } from '../../tenants/subscription-lifecycle.service';
import { SKIP_SUBSCRIPTION_CHECK } from '../decorators/skip-subscription-check.decorator';

@Injectable()
export class TenantSubscriptionGuard implements CanActivate {
  constructor(
    private readonly lifecycle: SubscriptionLifecycleService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user?.tenantId || user.role === Role.SUPER_ADMIN) {
      return true;
    }

    await this.lifecycle.assertOperational(user.tenantId, user.role as Role);
    return true;
  }
}
