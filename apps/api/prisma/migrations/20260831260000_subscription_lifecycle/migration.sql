-- Abonelik iptali / askıya alma yaşam döngüsü
ALTER TABLE "Tenant"
  ADD COLUMN "subscriptionPeriodEndsAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionCancelledAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionAccessEndsAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionSuspendedAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionSuspendUntil" TIMESTAMP(3),
  ADD COLUMN "subscriptionFrozenDaysRemaining" INTEGER;

-- Aktif abonelikler: dönem bitişi = aktivasyon + 1 ay
UPDATE "Tenant"
SET "subscriptionPeriodEndsAt" = "subscriptionActivatedAt" + INTERVAL '30 days'
WHERE "subscriptionActivatedAt" IS NOT NULL
  AND "subscriptionPeriodEndsAt" IS NULL;

-- Deneme: 14 gün
UPDATE "Tenant"
SET "subscriptionPeriodEndsAt" = "createdAt" + INTERVAL '14 days'
WHERE "subscriptionStatus" = 'TRIAL'
  AND "subscriptionActivatedAt" IS NULL
  AND "subscriptionPeriodEndsAt" IS NULL;
