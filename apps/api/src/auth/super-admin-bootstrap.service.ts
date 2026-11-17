import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Ürün sahibinin süper admin hesabını .env'den (SUPER_ADMIN_EMAIL /
 * SUPER_ADMIN_PASSWORD) her açılışta eşitler. Şifre veritabanına düz metin
 * olarak yazılmaz; bcrypt hash'i kullanılır.
 */
@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD tanımlı değil; süper admin eşitlenmedi');
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: Role.SUPER_ADMIN, tenantId: null, name: 'Platform Yöneticisi' },
      create: { email, passwordHash, role: Role.SUPER_ADMIN, tenantId: null, name: 'Platform Yöneticisi' },
    });
    this.logger.log('Süper admin hesabı eşitlendi');
  }
}
