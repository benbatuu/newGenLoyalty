import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/** Kullanıcı hesabı gerektiren amaçlar (kayıt dışında). */
const EXISTING_USER_PURPOSES: OtpPurpose[] = [
  OtpPurpose.RESET_PASSWORD,
  OtpPurpose.PASSWORD_CHANGE,
  OtpPurpose.ACCOUNT_CANCEL,
  OtpPurpose.ACCOUNT_DELETE,
];

const PURPOSE_COPY: Record<OtpPurpose, { subject: string; action: string }> = {
  [OtpPurpose.REGISTER]: { subject: 'Doğrulama kodunuz', action: 'Hesabınızı doğrulamak için kodunuz' },
  [OtpPurpose.RESET_PASSWORD]: { subject: 'Şifre sıfırlama kodunuz', action: 'Şifrenizi sıfırlamak için kodunuz' },
  [OtpPurpose.PASSWORD_CHANGE]: { subject: 'Şifre değişikliği onay kodunuz', action: 'Şifrenizi değiştirmek için onay kodunuz' },
  [OtpPurpose.ACCOUNT_CANCEL]: { subject: 'Abonelik iptali onay kodunuz', action: 'Aboneliğinizi iptal etmek için onay kodunuz' },
  [OtpPurpose.ACCOUNT_DELETE]: { subject: 'Hesap silme onay kodunuz', action: 'Hesabınızı silme talebini onaylamak için kodunuz' },
};

const CODE_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;
const PROOF_TTL = '15m';
const PROOF_TYP = 'otp-proof';

export type OtpProof = { email: string; purpose: OtpPurpose };

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private hashCode(email: string, purpose: OtpPurpose, code: string): string {
    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    return createHmac('sha256', secret)
      .update(`${email}|${purpose}|${code}`)
      .digest('hex');
  }

  /**
   * Kod üretir ve e-posta ile gönderir.
   * E-posta enumeration'ı önlemek için kullanıcı yoksa da aynı yanıt döner.
   */
  async request(
    rawEmail: string,
    purpose: OtpPurpose,
  ): Promise<{ ok: true; devCode?: string }> {
    const email = rawEmail.toLowerCase().trim();

    if (EXISTING_USER_PURPOSES.includes(purpose)) {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) return { ok: true };
    } else {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) return { ok: true };
    }

    const last = await this.prisma.emailOtp.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException(
        'Kod kısa süre önce gönderildi. Lütfen bir dakika sonra tekrar deneyin.',
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.emailOtp.create({
      data: {
        email,
        purpose,
        codeHash: this.hashCode(email, purpose, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    await this.sendCode(email, purpose, code);

    const exposeCode = !this.isProduction();
    return exposeCode ? { ok: true, devCode: code } : { ok: true };
  }

  /** Doğru kodda kısa ömürlü kanıt (proof) token'ı döner. */
  async verify(
    rawEmail: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<{ verificationToken: string }> {
    const email = rawEmail.toLowerCase().trim();
    const row = await this.prisma.emailOtp.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Kod geçersiz veya süresi dolmuş');
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Çok fazla hatalı deneme. Yeni bir kod isteyin.',
      );
    }

    const expected = Buffer.from(row.codeHash, 'hex');
    const given = Buffer.from(this.hashCode(email, purpose, code.trim()), 'hex');
    const match =
      expected.length === given.length && timingSafeEqual(expected, given);

    if (!match) {
      await this.prisma.emailOtp.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Kod hatalı');
    }

    await this.prisma.emailOtp.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    const verificationToken = await this.jwt.signAsync(
      { sub: email, purpose, typ: PROOF_TYP },
      { expiresIn: PROOF_TTL },
    );
    return { verificationToken };
  }

  /** Kayıt kanıtını doğrular; e-posta eşleşmezse reddeder. */
  async assertRegisterProof(token: string, email: string): Promise<void> {
    const proof = await this.readProof(token, OtpPurpose.REGISTER);
    if (proof.email !== email.toLowerCase().trim()) {
      throw new BadRequestException('Doğrulama e-postası eşleşmiyor');
    }
  }

  /** Şifre sıfırlama: OTP kanıtı ile şifreyi değiştirir ve oturumları kapatır. */
  async resetPasswordWithProof(token: string, password: string) {
    if (password.trim().length < 8) {
      throw new BadRequestException('Şifre en az 8 karakter olmalı');
    }
    const proof = await this.readProof(token, OtpPurpose.RESET_PASSWORD);
    const user = await this.prisma.user.findUnique({
      where: { email: proof.email },
    });
    if (!user || !user.isActive) {
      throw new BadRequestException('Hesap bulunamadı veya pasif');
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return { ok: true as const };
  }

  private async readProof(token: string, purpose: OtpPurpose): Promise<OtpProof> {
    let payload: { sub?: string; purpose?: OtpPurpose; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new BadRequestException('Doğrulama süresi doldu. Kodu yeniden isteyin.');
    }
    if (
      payload.typ !== PROOF_TYP ||
      payload.purpose !== purpose ||
      !payload.sub
    ) {
      throw new BadRequestException('Geçersiz doğrulama');
    }
    return { email: payload.sub, purpose };
  }

  /** Oturumdaki kullanıcının e-postası için sensitive işlem kanıtını doğrular. */
  async assertProofForUser(token: string, purpose: OtpPurpose, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new BadRequestException('Hesap bulunamadı');
    await this.assertProof(token, purpose, user.email);
  }

  /** Sensitive işlem kanıtı: e-posta ve amaç eşleşmeli. */
  async assertProof(token: string, purpose: OtpPurpose, email: string): Promise<void> {
    const proof = await this.readProof(token, purpose);
    if (proof.email !== email.toLowerCase().trim()) {
      throw new BadRequestException('Doğrulama e-postası eşleşmiyor');
    }
  }

  private async sendCode(email: string, purpose: OtpPurpose, code: string) {
    const copy = PURPOSE_COPY[purpose];
    const text = `${copy.action}: ${code}\nKod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın.`;
    const html = `<p>${copy.action}: <strong style="font-size:20px;letter-spacing:2px">${code}</strong></p><p>Kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın.</p>`;

    if (this.mail.isLive()) {
      const result = await this.mail.send({ to: email, subject: copy.subject, text, html });
      if (!result.ok) {
        this.logger.warn(`OTP e-postası gönderilemedi (${result.provider})`);
        throw new ServiceUnavailableException(
          'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.',
        );
      }
      return;
    }

    if (this.isProduction()) {
      throw new ServiceUnavailableException(
        'E-posta sağlayıcısı yapılandırılmamış; doğrulama kodu gönderilemiyor.',
      );
    }
    this.logger.log(`[dev otp] ${purpose} ${email} → ${code}`);
  }
}
