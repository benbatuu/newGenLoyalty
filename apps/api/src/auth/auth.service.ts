import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
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

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Oturum süresi doldu');
    }

    await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    return this.issueTokens(stored.user);
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
    const adminBase = (
      this.config.get<string>('ADMIN_URL') ?? 'http://localhost:3002'
    ).replace(/\/$/, '');
    return {
      token,
      resetUrl: `${adminBase}/reset-password?token=${token}`,
      expiresAt,
    };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
    name: string;
  }) {
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

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

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
}
