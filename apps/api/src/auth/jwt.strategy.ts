import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionLifecycleService } from '../tenants/subscription-lifecycle.service';
import type { AuthUser } from './decorators/current-user.decorator';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscription: SubscriptionLifecycleService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı geçersiz');
    }
    if (user.tenantId && user.role !== Role.SUPER_ADMIN) {
      await this.subscription.assertCanAuthenticate(
        user.tenantId,
        user.role,
      );
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
    };
  }
}
