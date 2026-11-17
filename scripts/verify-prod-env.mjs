#!/usr/bin/env node
/**
 * Prod ortam değişkenlerini doğrular (secret değerlerini yazdırmaz).
 * Kullanım: node scripts/verify-prod-env.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnvFile(path.join(root, '.env'));
const env = { ...fileEnv, ...process.env };

function has(key) {
  const v = env[key]?.trim();
  return Boolean(v && v !== 'change-me-access-secret-min-32-chars');
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
}

const checks = [];

// PII / KVKK
checks.push(['PII encryption key', has('PII_ENCRYPTION_KEY')]);
if (has('PII_HASH_KEY')) {
  ok('PII hash key (optional override)');
} else {
  warn('PII_HASH_KEY yok — HMAC türetilmiş anahtar kullanılacak');
}

// Redis (kampanya kuyruğu + rate limit)
if (has('REDIS_URL')) {
  ok('REDIS_URL (queue / rate limit)');
} else {
  warn('REDIS_URL yok — in-memory rate limit (tek instance)');
}

// Email prod
const emailMock =
  (env.EMAIL_PROVIDER ?? 'mock').toLowerCase() === 'mock' ||
  !env.EMAIL_PROVIDER;
if (emailMock) {
  checks.push(['EMAIL_PROVIDER (mock OK)', true]);
} else {
  checks.push([
    'Resend API key',
    has('RESEND_API_KEY') || has('EMAIL_API_KEY'),
  ]);
}

// Email prod
const emailMock =
  (env.EMAIL_PROVIDER ?? 'mock').toLowerCase() === 'mock' ||
  !env.EMAIL_PROVIDER;
if (emailMock) {
  checks.push(['EMAIL_PROVIDER (mock OK)', true]);
} else {
  checks.push([
    'Resend API key',
    has('RESEND_API_KEY') || has('EMAIL_API_KEY'),
  ]);
}

// Core
checks.push(['DATABASE_URL', has('DATABASE_URL')]);
checks.push(['JWT secrets', has('JWT_ACCESS_SECRET') && has('JWT_REFRESH_SECRET')]);
checks.push(['API_URL (https)', /^https:\/\//.test(env.API_URL ?? '')]);
checks.push(['ADMIN_URL', has('ADMIN_URL')]);
checks.push(['WEB_URL', has('WEB_URL')]);

// SMS prod
const smsMock = (env.SMS_PROVIDER ?? 'mock').toLowerCase() === 'mock';
if (smsMock) {
  checks.push(['SMS_PROVIDER (pilot mock OK)', true]);
} else {
  checks.push([
    'SMS credentials',
    has('SMS_API_USER') && has('SMS_API_PASS') && has('SMS_SENDER'),
  ]);
}
checks.push([
  'SMS webhook token',
  has('SMS_WEBHOOK_TOKEN') || smsMock,
]);

// İYS (SMS prod + IYS flag)
const iysRequired = env.SMS_IYS === '1' || env.SMS_IYS === 'true';
if (iysRequired) {
  checks.push([
    'İYS API',
    has('IYS_API_URL') && has('IYS_API_KEY') && has('IYS_BRAND_CODE'),
  ]);
} else if (!smsMock) {
  warn('SMS_IYS=1 değil — İYS canlı entegrasyon atlanabilir');
}

// Apple Wallet
checks.push([
  'Apple PassKit',
  has('APPLE_PASS_TYPE_ID') &&
    has('APPLE_TEAM_ID') &&
    (has('APPLE_PASS_CERT_PATH') || has('APPLE_PASS_CERT_B64')),
]);

// Google Wallet
checks.push([
  'Google Wallet SA',
  has('GOOGLE_WALLET_ISSUER_ID') &&
    (has('GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH') ||
      has('GOOGLE_WALLET_SA_B64')),
]);

// R2 / media
checks.push([
  'R2 storage',
  has('R2_ACCOUNT_ID') &&
    has('R2_ACCESS_KEY_ID') &&
    has('R2_SECRET_ACCESS_KEY') &&
    has('R2_BUCKET'),
]);

// Owner push
checks.push([
  'FCM (owner push)',
  has('FCM_SERVICE_ACCOUNT_JSON') ||
    has('FCM_SERVICE_ACCOUNT_PATH') ||
    has('FCM_SERVICE_ACCOUNT_B64'),
]);

let failed = 0;
for (const [label, pass] of checks) {
  if (pass) ok(label);
  else {
    fail(label);
    failed += 1;
  }
}

console.log('');
if (failed === 0) {
  console.log('Tüm zorunlu prod kontrolleri geçti.');
  process.exit(0);
}

console.log(`${failed} kontrol eksik. Bkz. docs/pilot/env-certs-checklist.md`);
process.exit(strict ? 1 : 0);
