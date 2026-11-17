/**
 * Mevcut müşteri telefon/e-posta kayıtlarını şifreler.
 * Kullanım: cd apps/api && npx ts-node scripts/backfill-customer-pii.ts
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PiiService } from '../src/pii/pii.service';
import {
  customerCreateEmailData,
  customerCreatePhoneData,
} from '../src/pii/customer-pii';

/** Prisma CLI gibi kök + apps/api .env dosyalarını yükle */
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

  if (!process.env.PII_ENCRYPTION_KEY?.trim()) {
    console.error(
      'PII_ENCRYPTION_KEY tanımlı değil. Kök .env dosyasına ekleyin (openssl rand -base64 32).',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const pii = new PiiService(new ConfigService());
  const batch = 200;
  let cursor: string | undefined;
  let updated = 0;
  let cleared = 0;

  const [total, withPlainPhone, withEnc] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { phone: { not: null } } }),
    prisma.customer.count({ where: { phoneEnc: { not: null } } }),
  ]);
  console.log(
    `Başlangıç: ${total} müşteri · ${withPlainPhone} düz telefon · ${withEnc} şifreli`,
  );

  for (;;) {
    const rows = await prisma.customer.findMany({
      take: batch,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        phone: true,
        phoneEnc: true,
        email: true,
        emailEnc: true,
      },
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const data: Record<string, string | null> = {};

      // Düz telefon varsa kaynak olarak onu kullan (yanlış anahtarla şifrelenmiş kayıtları düzeltir)
      if (row.phone?.trim()) {
        const packed = customerCreatePhoneData(pii, row.phone);
        Object.assign(data, packed);
        data.phone = null;
        updated += 1;
      } else if (row.phoneEnc) {
        cleared += 1;
      }

      if (!row.emailEnc && row.email?.trim()) {
        Object.assign(data, customerCreateEmailData(pii, row.email));
        if (!data.phone) updated += 1;
      }

      if (Object.keys(data).length > 0) {
        await prisma.customer.update({ where: { id: row.id }, data });
      }
    }

    cursor = rows[rows.length - 1]!.id;
  }

  console.log(
    `Tamam: ${updated} kayıt şifrelendi/güncellendi · ${cleared} zaten yalnızca şifreli`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
