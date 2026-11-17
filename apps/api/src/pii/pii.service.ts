import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PackedPhone = {
  normalized: string;
  phoneHash: string;
  phoneEnc: string;
  phoneLast4: string;
  phoneMasked: string;
};

export type PackedEmail = {
  normalized: string;
  emailHash: string;
  emailEnc: string;
  emailMasked: string;
};

@Injectable()
export class PiiService {
  private readonly logger = new Logger(PiiService.name);
  private readonly encKey: Buffer;
  private readonly hashKey: Buffer;

  constructor(private readonly config: ConfigService) {
    const encRaw =
      this.config.get<string>('PII_ENCRYPTION_KEY')?.trim() ||
      process.env.PII_ENCRYPTION_KEY?.trim();
    const hashRaw =
      this.config.get<string>('PII_HASH_KEY')?.trim() ||
      process.env.PII_HASH_KEY?.trim();

    if (encRaw) {
      this.encKey = Buffer.from(encRaw, 'base64');
    } else {
      const fallback =
        this.config.get<string>('JWT_ACCESS_SECRET')?.trim() ||
        'dev-only-pii-key-not-for-production';
      this.logger.warn(
        'PII_ENCRYPTION_KEY missing — deriving dev key from JWT secret',
      );
      this.encKey = createHmac('sha256', 'pii-enc').update(fallback).digest();
    }

    if (this.encKey.length !== 32) {
      throw new InternalServerErrorException(
        'PII_ENCRYPTION_KEY must be 32 bytes (base64-encoded)',
      );
    }

    this.hashKey = hashRaw
      ? Buffer.from(hashRaw, 'base64')
      : createHmac('sha256', 'pii-hash').update(this.encKey).digest();
  }

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length === 12) {
      return digits.slice(2);
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return digits.slice(1);
    }
    return digits;
  }

  maskPhone(normalized: string): string {
    const d = normalized.replace(/\D/g, '');
    if (d.length < 4) return '***';
    const first = d[0] ?? '*';
    const last2 = d.slice(-2);
    return `${first}** *** ** ${last2}`;
  }

  maskEmail(raw: string): string {
    const email = raw.trim().toLowerCase();
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (!domain) return '***';
    let maskedLocal: string;
    if (local.length <= 2) {
      maskedLocal = `${local[0] ?? '*'}***`;
    } else {
      maskedLocal = `${local[0]}***${local.slice(-1)}`;
    }
    return `${maskedLocal}@${domain}`;
  }

  hashPhone(normalized: string): string {
    return createHmac('sha256', this.hashKey)
      .update(`phone:${normalized}`)
      .digest('hex');
  }

  hashEmail(normalized: string): string {
    return createHmac('sha256', this.hashKey)
      .update(`email:${normalized}`)
      .digest('hex');
  }

  packPhone(phoneRaw: string): PackedPhone {
    const normalized = this.normalizePhone(phoneRaw);
    if (normalized.length !== 10 || !normalized.startsWith('5')) {
      throw new Error('Invalid TR mobile phone');
    }
    return {
      normalized,
      phoneHash: this.hashPhone(normalized),
      phoneEnc: this.encrypt(normalized),
      phoneLast4: normalized.slice(-4),
      phoneMasked: this.maskPhone(normalized),
    };
  }

  packEmail(emailRaw: string): PackedEmail {
    const normalized = emailRaw.trim().toLowerCase();
    if (!normalized.includes('@')) {
      throw new Error('Invalid email');
    }
    return {
      normalized,
      emailHash: this.hashEmail(normalized),
      emailEnc: this.encrypt(normalized),
      emailMasked: this.maskEmail(normalized),
    };
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext');
    }
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64!, 'base64url');
    const tag = Buffer.from(tagB64!, 'base64url');
    const data = Buffer.from(dataB64!, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  decryptPhone(record: {
    phoneEnc?: string | null;
    phone?: string | null;
  }): string {
    if (record.phoneEnc) {
      return this.decrypt(record.phoneEnc);
    }
    if (record.phone) {
      return this.normalizePhone(record.phone);
    }
    throw new Error('Phone unavailable');
  }

  phoneMasked(record: {
    phoneEnc?: string | null;
    phone?: string | null;
    phoneLast4?: string | null;
  }): string {
    if (record.phoneEnc) {
      try {
        return this.maskPhone(this.decrypt(record.phoneEnc));
      } catch {
        /* fall through */
      }
    }
    if (record.phone) {
      return this.maskPhone(this.normalizePhone(record.phone));
    }
    if (record.phoneLast4) {
      return `*** *** ** ${record.phoneLast4.slice(-2)}`;
    }
    return '***';
  }

  decryptEmail(record: {
    emailEnc?: string | null;
    email?: string | null;
  }): string | null {
    if (record.emailEnc) {
      return this.decrypt(record.emailEnc);
    }
    return record.email?.trim() || null;
  }

  emailMasked(record: {
    emailEnc?: string | null;
    email?: string | null;
  }): string | null {
    if (record.emailEnc) {
      try {
        return this.maskEmail(this.decrypt(record.emailEnc));
      } catch {
        return '***';
      }
    }
    if (record.email) {
      return this.maskEmail(record.email);
    }
    return null;
  }

  /** Lookup filter for tenant customer search by phone digits. */
  phoneLookupFilter(
    tenantId: string,
    phoneQuery: string,
  ): {
    tenantId: string;
    phoneHash?: string;
    OR?: Array<Record<string, unknown>>;
  } {
    const normalized = this.normalizePhone(phoneQuery);
    if (normalized.length === 10) {
      return { tenantId, phoneHash: this.hashPhone(normalized) };
    }
    if (normalized.length >= 2) {
      const last4 = normalized.slice(-4);
      return {
        tenantId,
        OR: [
          { phoneLast4: { endsWith: last4 } },
          { phone: { contains: normalized } },
        ],
      };
    }
    return { tenantId };
  }
}
