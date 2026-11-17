/**
 * PII backfill sonrası düz metin telefon/e-posta kalmadığını doğrular.
 * Kullanım: cd apps/api && npx ts-node scripts/verify-pii-backfill.ts
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

function loadEnvFiles() {
  const candidates = [
    resolve(__dirname, '../.env'),
    resolve(__dirname, '../../../.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  loadEnvFiles();
  const prisma = new PrismaClient();

  const [plainPhone, plainEmail, encryptedPhone, total] = await Promise.all([
    prisma.customer.count({ where: { phone: { not: null } } }),
    prisma.customer.count({ where: { email: { not: null } } }),
    prisma.customer.count({ where: { phoneEnc: { not: null } } }),
    prisma.customer.count(),
  ]);

  console.log(`Toplam müşteri: ${total}`);
  console.log(`Düz telefon kalan: ${plainPhone}`);
  console.log(`Düz e-posta kalan: ${plainEmail}`);
  console.log(`Şifreli telefon: ${encryptedPhone}`);

  await prisma.$disconnect();

  if (plainPhone > 0 || plainEmail > 0) {
    console.error('✗ Backfill tamamlanmamış — düz metin PII var.');
    process.exit(1);
  }

  console.log('✓ PII backfill doğrulandı.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
