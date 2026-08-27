# Dokun & Kazan

Türkiye’deki küçük kafeler için Wallet tabanlı dijital damga kartı SaaS.

Müşteriye app yok — kart Apple/Google Wallet’ta. Personel web admin + Flutter kullanır.

## Monorepo

| Paket | Port | Açıklama |
|-------|------|----------|
| `apps/api` | 3001 | NestJS + Prisma API |
| `apps/web` | 3000 | Marketing site (Next.js) |
| `apps/admin` | 3002 | RBAC admin panel (Next.js) |
| `apps/mobile` | — | Flutter personel uygulaması |
| `packages/shared` | — | Ortak tipler / sözleşmeler |
| `packages/config` | — | Shared TS config |

Görev sırası: [`task.md`](./task.md)

## Gereksinimler

- Node.js 20+
- [pnpm](https://pnpm.io) 9+
- PostgreSQL (API için)
- Flutter SDK (mobil için)

## Kurulum

```bash
cp .env.example .env
pnpm install
pnpm --filter @ngl/shared build
```

### Yerel PostgreSQL (geliştirme)

Proje `.data/postgres` altında port **5433** kullanır:

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .data/postgres -o "-p 5433" -l .data/postgres.log start
# İlk kurulumda DB zaten oluşturulduysa:
# /opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 5433 -U ngl -d postgres -c "CREATE DATABASE ngl;"
```

```bash
cd apps/api
pnpm prisma:migrate
pnpm prisma:seed
```

Seed hesapları (şifre: `Password123!`):
- `admin@dokunkazan.local` — SuperAdmin
- `owner@demo-kafe.local` — Store Owner
- `cashier@demo-kafe.local` — Cashier

## Geliştirme

```bash
# API (http://localhost:3001)
pnpm dev:api

# Marketing site (http://localhost:3000)
pnpm dev:web

# Admin panel (http://localhost:3002)
pnpm dev:admin

# Flutter (ayrı terminal)
cd apps/mobile && flutter run
```

## Notlar

- MVP’de NFC yok; damga kaynağı `cashier` (API’de `nfc` extension noktası hazırlanacak).
- Detaylı ürün kapsamı: [`project.md`](./project.md)
- Pilot: [`docs/pilot/onboarding-checklist.md`](./docs/pilot/onboarding-checklist.md) · [`smoke-test.md`](./docs/pilot/smoke-test.md) · [`env-certs-checklist.md`](./docs/pilot/env-certs-checklist.md)
