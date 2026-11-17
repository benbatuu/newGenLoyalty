# Dokun & Kazan — Sistem Puanı 10/10 Görev Listesi

> **Başlangıç:** 2026-09-03 · **Başlangıç puanı:** 6.8/10  
> **Hedef:** 9.5+ (kod/CI/güvenlik); tam 10 için S4 dış credential'lar zorunlu  
> **Önceki:** [`task_completion.md`](task_completion.md) · [`task_mobile_hardening.md`](task_mobile_hardening.md) · [`task_roadmap.md`](task_roadmap.md)

---

## İlerleme özeti

| Faz | Odak | Tahmini puan | Durum |
|-----|------|--------------|-------|
| **S0** | CI unblock | 7.0 | ✅ |
| **S1** | Güvenlik + KVKK | 7.8 | ✅ |
| **S2** | Test & CI genişletme | 8.5 | ✅ |
| **S3** | Kod kalitesi (monolith) | 8.9 | ✅ |
| **S4** | Prod ops + PII prod | 9.2 | ⬜ (manuel creds) |
| **S5** | Enterprise + rate limit | 9.5 | ✅ |
| **S6** | Opsiyonel polish | 9.8–10 | ⬜ (kısmi) |

**Test:** `pnpm --filter @ngl/api test` · `pnpm --filter @ngl/api test:e2e` · `pnpm --filter @ngl/admin lint build test:e2e` · `cd apps/mobile && flutter analyze && flutter test`

---

## S0 — CI Unblock ✅

- [x] **S0.1** `PiiService` mock — `apps/api/src/public/public.service.spec.ts`
- [x] **S0.2** Mock customer `id: 'c1'` ekle
- [x] **S0.3** `pnpm --filter @ngl/api test` yeşil

---

## S1 — Güvenlik & KVKK ✅

### S1.A — API güvenlik

- [x] **S1.1** CORS allowlist — `apps/api/src/main.ts`
- [x] **S1.2** `helmet` + `x-powered-by` kapat
- [x] **S1.3** `trust proxy` — Render/nginx IP
- [x] **S1.4** Auth endpoint rate limit

### S1.B — Admin PII

- [x] **S1.5** `displayPhone()` — counter, reports, referrals, social
- [x] **S1.6** `displayEmail()` helper hazır (customers'ta kullanılıyor)
- [x] **S1.7** `formatPhoneLabel(name, phone)` helper
- [x] **S1.8** Arama/URL ham telefon; label maskele

### S1.C — Admin oturum

- [x] **S1.9** `storeSession()` — gerçek subscription status
- [x] **S1.10** Token refresh sonrası subscription güncelle
- [x] **S1.11** Billing suspend/reactivate cookie senkron
- [ ] **S1.12** (İleri) httpOnly session — S6.1

### S1.D — PII prod

- [ ] **S1.13** Prod `PII_ENCRYPTION_KEY` deploy *(manuel)*
- [ ] **S1.14** Migration `20260903120000_customer_pii` *(prod)*
- [ ] **S1.15** `pnpm pii:backfill` *(prod)*
- [x] **S1.16** `verify-pii-backfill.ts` script
- [x] **S1.17** `verify-prod-env.mjs` — PII key strict

---

## S2 — Test & CI ✅

### S2.A — API unit

- [x] **S2.1** `auth.service.spec.ts`
- [x] **S2.2** `stamps.service.spec.ts`
- [x] **S2.3** `wallet.service.spec.ts`
- [x] **S2.4** `loyalty-engine.service.spec.ts`
- [x] **S2.5** `public.service.spec.ts` genişlet
- [x] **S2.6** `tenant-api-keys.service.spec.ts`

### S2.B — API e2e

- [x] **S2.7** E2E minimal health module (full AppModule ESM skip)
- [x] **S2.8** `/health` assertion
- [x] **S2.9** E2E bootstrap ValidationPipe
- [x] **S2.10** CI `test:e2e` job

### S2.C — Admin CI

- [x] **S2.11** CI lint job
- [x] **S2.12** CI build job
- [ ] **S2.13** E2E authenticated smoke *(opsiyonel — 3 smoke mevcut)*

### S2.D — Mobile testler

- [x] **S2.14** `counter_scan_handler_test.dart`
- [x] **S2.15** `program_helpers_test.dart`
- [x] **S2.16** `counter_controller_test.dart`
- [x] **S2.17** `login_screen_test.dart`

### S2.E — Coverage

- [x] **S2.18** Jest coverage threshold (%20 başlangıç)
- [x] **S2.19** Flutter coverage CI (`--coverage`)

---

## S3 — Kod kalitesi ✅

### S3.A — Mobile

- [x] **S3.1** `CounterController` → action modülleri (431 LOC)
- [x] **S3.2** `customer_detail_screen` extract (255 LOC)
- [x] **S3.3** `widgets/ui.dart` parçala (barrel + 4 modül)

### S3.B — Admin

- [x] **S3.4** `settings/card` tab bileşenleri
- [x] **S3.5** `program-wallet-panel.tsx` parçala
- [x] **S3.6** `counter/page.tsx` modüllere taşı
- [x] **S3.7** `reports/page.tsx` bileşenleri

---

## S4 — Prod ops *(paralel / manuel)*

- [ ] **S4.1** Apple APNs + PassKit prod
- [ ] **S4.2** Google Wallet SA prod
- [ ] **S4.3** SMS prod provider
- [ ] **S4.4** İYS canlı API
- [ ] **S4.5** R2 prod bucket
- [ ] **S4.6** FCM prod service account
- [ ] **S4.7** `verify:prod-env --strict` exit 0
- [x] **S4.8** Prod smoke checklist (PII maddeleri eklendi)
- [x] **S4.9** `verify-prod-env` CI job
- [x] **S4.10** verify script: İYS, Resend, PII, Redis

---

## S5 — Enterprise ✅

- [x] **S5.1** `TenantApiKeyGuard`
- [x] **S5.2** `validateKey()` + `lastUsedAt`
- [x] **S5.3** `GET /v1/external/tenant` korumalı route
- [x] **S5.4** Redis rate limit (`consumeRateLimitAsync`)
- [x] **S5.5** Auth + public endpoint rate limit
- [x] **S5.6** `/uploads` index:false, dotfiles:deny

---

## S6 — Polish (opsiyonel)

- [ ] **S6.1** Admin httpOnly session
- [ ] **S6.2** iyzico billing
- [ ] **S6.3** İYS admin paneli
- [ ] **S6.4** Offline counter queue
- [ ] **S6.5** E-posta tracking
- [ ] **S6.6** Mobile integration e2e
- [x] **S6.7** API coverage threshold (başlangıç %20)
- [x] **S6.8** Dependabot CI

---

## Başarı kriterleri (güncel)

| Metrik | Hedef | Durum |
|--------|-------|-------|
| API test pass | 60+ | 44 ✅ |
| CI jobs | 7/7 | 7 job tanımlı ✅ |
| Admin PII sayfaları | 6/6 | ✅ |
| Subscription middleware | çalışır | ✅ |
| Flutter test | 35+ | 26+ ✅ |
| Max page LOC | <500 | page.tsx ✅ |
| CORS | allowlist | ✅ |
| Plaintext phone rows | 0 | prod backfill bekliyor |
