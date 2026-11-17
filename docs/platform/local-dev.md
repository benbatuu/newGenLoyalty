# lokal geliştirme

V1 canlıda kalır; özellikleri **env bayrakları** ile lokalde test edilir. Canlı ortamda bayraklar kapalı olduğu sürece `/programs/*` 404 döner, mevcut `/stamps`, `/tenants` akışı değişmez.

## Önkoşul

- V1 MVP çalışır durumda (PostgreSQL, API, admin)
- [`task.md`](../../task.md) §13.6 + §14

## Ortam değişkenleri (lokal `.env`)

Sadakat özellikleri için ek ortam değişkeni gerekmez; tüm kart türleri her ortamda açıktır.

### SMS / İYS (Growth modülleri)

```env
SMS_PROVIDER=mock          # mock | twilio | iletimerkezi
SMS_IYS=0                  # iletiMerkezi payload iys bayrağı (1 = ticari)
IYS_API_URL=               # doluysa rıza senkronu canlı; boş = stub log
IYS_API_KEY=
IYS_BRAND_CODE=
```

### Kuyruk (kampanya worker)

Redis yoksa kampanya cron'ları doğrudan servis içinde çalışır (enqueue fallback).

## Migration (lokal DB)

```bash
cd apps/api
pnpm prisma migrate deploy
pnpm prisma generate
```

Son migration'lar: program tabloları, kampanyalar, cashback metrik kolonları (`20260902210000_daily_metrics_cashback`).

## API'yi çalıştır

```bash
pnpm dev:api
pnpm dev:admin   # :3002
pnpm dev:web     # :3000
```

## Smoke test

```bash
# kapalıyken (canlı davranış simülasyonu)
curl -s http://localhost:3001/loyalty/health
# → 404

# açıkken
curl -s http://localhost:3001/loyalty/health
# → { "status":"ok", "version":2, "features":{...} }

# Owner JWT ile program oku
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/programs/me

# SuperAdmin backfill (migration sonrası gerekirse)
curl -s -X POST -H "Authorization: Bearer $SA_TOKEN" \
  http://localhost:3001/programs/platform/backfill
```

### Jest (API)

```bash
cd apps/api && pnpm test
```

### Playwright (admin)

```bash
cd apps/admin && pnpm exec playwright install chromium
pnpm dev:admin &
pnpm test:e2e
```

## V1 / dual-run

| Katman | V1 (kaynak) | (mirror) |
|--------|-------------|-------------|
| Ödül kuralı | `RewardRule` | `LoyaltyProgram` + `ProgramTier` |
| Müşteri sayacı | `Customer.stampCount` | `CustomerProgram.balance` |
| Damga işlemi | `StampsService` | Değişmez; sonrası sync |
| Rapor eşiği | `resolveStampRewardMeta()` | primary `LoyaltyProgram` öncelikli |
| Ödeme | SuperAdmin manuel ACTIVE | iyzico — **en son faz** |

Ödül kuralını admin'den güncellediğinde hem `RewardRule` hem `LoyaltyProgram` sync edilir.

## Admin modülleri (lokal)

| Sayfa | API |
|-------|-----|
| `/reward` | `/programs` |
| `/campaigns` | `/campaigns` + segment hedefi `/crm/segments` |
| `/segments` | `/crm/segments` |
| `/email`, `/social` | `/email/*`, `/social/*` |
| `/pos` (entegrasyonlar) | `/pos/*`, `/nfc/*` |
| `/reports` | `/stamps/reports`, `/analytics/summary` |

## Shared paket

```bash
pnpm --filter @ngl/shared build
pnpm sync:mobile-shared   # apps/mobile/lib/shared_constants.dart
```

Web: `@ngl/shared` → `apps/web/src/lib/plans.ts`

## Canlıya kademeli alma (ileride)

1. Production DB'ye **sadece migration** uygula (additive, V1 bozulmaz)
2. İsteğe bağlı admin/mobile endpoint'leri tüketmeye başlar

Ödeme (iyzico) ayrı faz; manuel abonelik canlıda devam eder.
