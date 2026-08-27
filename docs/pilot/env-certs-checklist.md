# Pilot env & sertifika kontrol listesi

`.env` kök dizinde; sertifikalar `certs/` altında. **Secret’ları commit etmeyin.**

## Veritabanı & API

- [ ] `DATABASE_URL` — Neon / Postgres (sslmode=require)
- [ ] `API_PORT=3001`
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — güçlü, üretimde benzersiz
- [ ] `API_URL` — dışarıdan erişilebilir API tabanı (Wallet invite linkleri için)
- [ ] `WEB_URL` / `ADMIN_URL` — CORS / CTA linkleri

## SMS

- [ ] Pilot’ta `SMS_PROVIDER=mock` ise API log’undan link kopyalanır
- [ ] Gerçek SMS: provider + `SMS_API_USER` / `SMS_API_PASS` / `SMS_SENDER` dolu
- [ ] Gönderen adı (header) operatör onaylı

## Apple Wallet / PassKit

- [ ] `APPLE_PASS_TYPE_ID` (örn. `pass.loyalty.…`) Apple Developer’da kayıtlı
- [ ] `APPLE_TEAM_ID`
- [ ] `APPLE_PASS_CERT_PATH` → Pass Type ID sertifikası (PEM)
- [ ] `APPLE_PASS_KEY_PATH` + opsiyonel `APPLE_PASS_KEY_PASSPHRASE`
- [ ] `APPLE_WWDR_CERT_PATH` → Apple WWDR G4 (veya güncel) PEM
- [ ] Gerçek cihazda `.pkpass` ekleme denendi

## Google Wallet

- [ ] Google Wallet API / Issuer hesabı açık
- [ ] `GOOGLE_WALLET_ISSUER_ID`
- [ ] `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH` → SA JSON
- [ ] Issuer’da service account yetkili (Wallet Objects)
- [ ] Loyalty class/object oluşturma + “Add to Google Wallet” linki denendi

## Admin / mobil

- [ ] Admin: `NEXT_PUBLIC_API_URL` (gerekirse)
- [ ] Flutter: `--dart-define=API_URL=…` (Android emülatörde `10.0.2.2`)
- [ ] Seed çalıştırıldı: `pnpm --filter @ngl/api prisma:seed`

## Güvenlik

- [ ] `.env` ve `certs/*.json` / `*.pem` `.gitignore`’da
- [ ] Pilot owner/kasiyer şifreleri değiştirildi (demo `Password123!` değil)
- [ ] HTTPS terminasyonu (prod API_URL `https://…`)
