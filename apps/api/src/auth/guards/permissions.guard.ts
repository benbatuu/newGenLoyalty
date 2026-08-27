import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const allowed = await this.prisma.rolePermission.findMany({
      where: {
        role: user.role as Role,
        permission: { code: { in: required } },
      },
      include: { permission: true },
    });

    const codes = new Set(allowed.map((row) => row.permission.code));
    const missing = required.filter((code) => !codes.has(code));
    if (missing.length) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }
    return true;
  }
}
