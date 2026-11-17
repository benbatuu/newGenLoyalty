import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SubscriptionModule } from '../tenants/subscription.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SuperAdminBootstrapService } from './super-admin-bootstrap.service';
import { JwtStrategy } from './jwt.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { TenantSubscriptionGuard } from './guards/tenant-subscription.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    SubscriptionModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SuperAdminBootstrapService,
    OtpService,
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
    TenantGuard,
    TenantSubscriptionGuard,
    { provide: APP_GUARD, useClass: TenantSubscriptionGuard },
  ],
  exports: [
    AuthService,
    OtpService,
    RolesGuard,
    PermissionsGuard,
    TenantGuard,
    TenantSubscriptionGuard,
    JwtModule,
  ],
})
export class AuthModule {}
