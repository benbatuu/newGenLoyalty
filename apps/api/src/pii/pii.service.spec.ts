import { PiiService, type PackedEmail, type PackedPhone } from './pii.service';

describe('PiiService', () => {
  const env = process.env;
  let pii: PiiService;

  beforeEach(() => {
    process.env = {
      ...env,
      PII_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      PII_HASH_KEY: Buffer.alloc(32, 3).toString('base64'),
    };
    pii = new PiiService({
      get: (key: string) => process.env[key],
    } as never);
  });

  afterAll(() => {
    process.env = env;
  });

  it('packs and decrypts phone', () => {
    const packed: PackedPhone = pii.packPhone('0532 123 45 67');
    expect(packed.normalized).toBe('5321234567');
    expect(packed.phoneLast4).toBe('4567');
    expect(packed.phoneMasked).toBe('5** *** ** 67');
    expect(pii.decrypt(packed.phoneEnc)).toBe('5321234567');
    expect(pii.hashPhone('5321234567')).toBe(packed.phoneHash);
  });

  it('masks email', () => {
    const packed: PackedEmail = pii.packEmail('Ali.Veli@Example.com');
    expect(packed.normalized).toBe('ali.veli@example.com');
    expect(packed.emailMasked).toBe('a***i@example.com');
    expect(pii.decrypt(packed.emailEnc)).toBe('ali.veli@example.com');
  });
});
