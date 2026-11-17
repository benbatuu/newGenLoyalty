# Pilot env & sertifika kontrol listesi

`.env` kök dizinde; sertifikalar `certs/` altında. **Secret’ları commit etmeyin.**

Otomatik kontrol (değer yazdırmaz):

```bash
node scripts/verify-prod-env.mjs
node scripts/verify-prod-env.mjs --strict   # eksikte exit 1 (CI/deploy)
```

## Veritabanı & API

- [ ] `DATABASE_URL` — Neon / Postgres (sslmode=require)
- [ ] `API_PORT=3001`
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — güçlü, üretimde benzersiz
- [ ] `PII_ENCRYPTION_KEY` — `openssl rand -base64 32` (KVKK müşteri telefon/e-posta)
- [ ] Opsiyonel: `PII_HASH_KEY` (telefon arama hash override)
- [ ] Migration: `20260903120000_customer_pii` + `pnpm pii:backfill` + `pnpm pii:verify`
- [ ] `API_URL` — dışarıdan erişilebilir **https** tabanı (Wallet invite linkleri)
- [ ] `WEB_URL` / `ADMIN_URL` — CORS / CTA linkleri
- [ ] Migration: `cd apps/api && pnpm prisma migrate deploy`

## Veritabanı

- [ ] Migration uygulandı (additive)

## SMS & İYS

- [ ] Pilot’ta `SMS_PROVIDER=mock` ise API log’undan link kopyalanır
- [ ] Prod: `SMS_PROVIDER=iletimerkezi` veya `twilio`
- [ ] `SMS_API_USER` / `SMS_API_PASS` / `SMS_SENDER` dolu (iletimerkezi)
- [ ] `SMS_IYS=1` — ticari ileti (iletimerkezi payload)
- [ ] `IYS_API_URL` + `IYS_API_KEY` + `IYS_BRAND_CODE` (canlı rıza senkronu)
- [ ] `SMS_WEBHOOK_TOKEN` — DLR webhook güvenliği
- [ ] Gönderen adı (header) operatör onaylı

## Apple Wallet / PassKit & APNs

- [ ] `APPLE_PASS_TYPE_ID` Apple Developer’da kayıtlı
- [ ] `APPLE_TEAM_ID`
- [ ] `APPLE_PASS_CERT_PATH` veya `APPLE_PASS_CERT_B64` (Render)
- [ ] `APPLE_PASS_KEY_PATH` + opsiyonel `APPLE_PASS_KEY_PASSPHRASE`
- [ ] `APPLE_WWDR_CERT_PATH` veya `APPLE_WWDR_CERT_B64`
- [ ] `APPLE_WEB_SERVICE_URL` — **https** (pass güncelleme)
- [ ] Gerçek cihazda `.pkpass` ekleme + push güncelleme denendi
- [ ] Prod APNs: [`materialize-certs.sh`](../../apps/api/scripts/materialize-certs.sh) veya Secret Files

## Google Wallet

- [ ] Google Wallet API / Issuer hesabı açık
- [ ] `GOOGLE_WALLET_ISSUER_ID`
- [ ] `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH` veya `GOOGLE_WALLET_SA_B64`
- [ ] Issuer’da service account yetkili (Wallet Objects)
- [ ] Loyalty class/object + “Add to Google Wallet” linki denendi

## R2 / medya depolama

- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- [ ] Logo / ikon yükleme admin’den test edildi (`/media/tenants/...`)
- [ ] İsteğe bağlı: `R2_PUBLIC_BASE_URL` + `R2_USE_PUBLIC_URL=true`

## Owner push (FCM)

- [ ] `FCM_SERVICE_ACCOUNT_JSON` veya `_PATH` veya `_B64`
- [ ] Owner mobil uygulamada kampanya / win-back bildirimi test edildi

## Redis (opsiyonel)

- [ ] `REDIS_URL` — BullMQ kampanya kuyruğu (yoksa in-process fallback)

## Admin / mobil / web

- [ ] Admin: `API_URL` runtime (Vercel `/backend` proxy)
- [ ] Flutter: `--dart-define=API_URL=…` (Android emülatörde `10.0.2.2`)
- [ ] Web: `API_URL` build + runtime
- [ ] Seed: `pnpm --filter @ngl/api prisma:seed` (pilot tenant)

## CI / kalite

- [ ] GitHub Actions `ci.yml` — API jest + web i18n + admin Playwright
- [ ] Lokal: `pnpm --filter @ngl/api test` + `pnpm --filter @ngl/admin test:e2e`

## Güvenlik

- [ ] `.env` ve `certs/*.json` / `*.pem` `.gitignore`’da
- [ ] Pilot owner/kasiyer şifreleri değiştirildi (demo `Password123!` değil)
- [ ] HTTPS terminasyonu (prod API_URL `https://…`)
