import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RequestMeta = { ip?: string; userAgent?: string };
const MAX_SESSIONS_PER_USER = 10;
import { SubscriptionLifecycleService } from '../tenants/subscription-lifecycle.service';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly subscription: SubscriptionLifecycleService,
  ) {}

  async login(dto: LoginDto, meta?: RequestMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    let subscription = null;
    if (user.tenantId && user.role !== Role.SUPER_ADMIN) {
      subscription = await this.subscription.assertCanAuthenticate(
        user.tenantId,
        user.role,
      );
    }

    const tokens = await this.issueTokens(user, meta);
    return { ...tokens, subscription };
  }

  async refresh(refreshToken: string, meta?: RequestMeta) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Oturum süresi doldu');
    }

    let subscription = null;
    if (stored.user.tenantId && stored.user.role !== Role.SUPER_ADMIN) {
      subscription = await this.subscription.assertCanAuthenticate(
        stored.user.tenantId,
        stored.user.role,
      );
    }
    const tokens = await this.issueTokens(stored.user, meta);
    return { ...tokens, subscription };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    return user;
  }

  /**
   * E-posta enumeration sızdırmamak için her zaman aynı mesaj.
   * Reset URL ADMIN_URL/reset-password?token=…
   */
  async forgotPassword(email: string): Promise<{ ok: true; resetUrl?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) {
      return { ok: true };
    }
    const { resetUrl } = await this.createPasswordReset(user.id);
    // E-posta sağlayıcı yok — URL’yi response’ta döndür (dev/pilot).
    // Prod’da SMTP eklenince sadece e-posta ile gönderilir.
    const expose =
      this.config.get<string>('EXPOSE_RESET_URL') === 'true' ||
      this.config.get<string>('NODE_ENV') !== 'production';
    return expose ? { ok: true, resetUrl } : { ok: true };
  }

  async resetPassword(token: string, password: string) {
    if (password.trim().length < 8) {
      throw new BadRequestException('Şifre en az 8 karakter olmalı');
    }
    const tokenHash = this.hashToken(token);
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş bağlantı');
    }
    if (!row.user.isActive) {
      throw new BadRequestException('Hesap pasif');
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: row.userId } }),
    ]);

    return { ok: true };
  }

  /** Owner / SuperAdmin için personel reset linki üretir */
  async createPasswordReset(userId: string): Promise<{
    token: string;
    resetUrl: string;
    expiresAt: Date;
  }> {
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    });
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });
    const adminBase = this.config.get<string>('ADMIN_URL')?.trim();
    if (!adminBase) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ADMIN_URL is required in production');
      }
    }
    const base = (adminBase || 'http://localhost:3002').replace(/\/$/, '');
    return {
      token,
      resetUrl: `${base}/reset-password?token=${token}`,
      expiresAt,
    };
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      role: string;
      tenantId: string | null;
      name: string;
    },
    meta?: RequestMeta,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') as `${number}m`,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const days = this.parseRefreshDays(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.saveSession(user.id, refreshToken, expiresAt, meta);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseRefreshDays(value: string): number {
    const match = /^(\d+)d$/.exec(value);
    return match ? Number(match[1]) : 7;
  }

  /** Kendi adını günceller. */
  async updateMe(userId: string, name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new BadRequestException('Ad en az 2 karakter olmalı');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: trimmed },
      select: { id: true, name: true, email: true },
    });
  }

  /** Giriş yapmış kullanıcı şifresini değiştirir; diğer oturumlar kapanır. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    keepRefreshToken?: string,
  ) {
    if (newPassword.trim().length < 8) {
      throw new BadRequestException('Yeni şifre en az 8 karakter olmalı');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Mevcut şifre yanlış');
    }
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          ...(keepRefreshToken
            ? { tokenHash: { not: this.hashToken(keepRefreshToken) } }
            : {}),
        },
      }),
    ]);
    return { ok: true };
  }

  /** Açık oturumlar (refresh token kayıtları). Token değeri dönmez. */
  async listSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        tokenHash: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
    // "Bu oturum" = gönderilen refresh token'ın satırı. IP/tarayıcı değişse de doğru kalır.
    return rows.map(({ tokenHash, ...r }) => ({
      ...r,
      current: currentHash !== null && tokenHash === currentHash,
    }));
  }

  /** Tek bir oturumu kapatır (yalnızca kendi kaydı). */
  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { id: sessionId, userId },
    });
    return { ok: true };
  }

  /** Verilen cihaz hariç tüm oturumları kapatır. */
  async revokeOtherSessions(userId: string, keepRefreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, tokenHash: { not: this.hashToken(keepRefreshToken) } },
    });
    return { ok: true };
  }

  /** Cihaz başına tek oturum: aynı IP + tarayıcı yeniden giriş yapınca satır güncellenir. */
  private async saveSession(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    meta?: RequestMeta,
  ) {
    const ip = meta?.ip ?? null;
    const userAgent = meta?.userAgent?.slice(0, 300) ?? null;
    const deviceKey = this.hashToken(`${ip ?? ''}|${userAgent ?? ''}`);
    const data = {
      tokenHash: this.hashToken(refreshToken),
      expiresAt,
      ip,
      userAgent,
      lastUsedAt: new Date(),
    };
    await this.prisma.refreshToken.upsert({
      where: { userId_deviceKey: { userId, deviceKey } },
      create: { userId, deviceKey, ...data },
      update: data,
    });
    // En fazla 10 oturum: en eski kullanılanlar kapanır.
    const stale = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      skip: MAX_SESSIONS_PER_USER,
      select: { id: true },
    });
    if (stale.length) {
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: stale.map((r) => r.id) } },
      });
    }
  }
}
