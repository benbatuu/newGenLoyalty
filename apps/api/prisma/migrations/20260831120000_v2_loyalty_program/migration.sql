-- V2: LoyaltyProgram soyutlaması (V1 RewardRule korunur — additive migration)

CREATE TYPE "ProgramType" AS ENUM (
  'STAMP_CARD',
  'MULTI_STAMP',
  'POINT_CARD',
  'DISCOUNT_CARD',
  'EVENT_CARD',
  'STAFF_CARD',
  'MEMBERSHIP_CARD'
);

CREATE TABLE "LoyaltyProgram" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "ProgramType" NOT NULL DEFAULT 'STAMP_CARD',
  "name" TEXT NOT NULL DEFAULT 'Sadakat kartı',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB NOT NULL DEFAULT '{}',
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramTier" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "threshold" INTEGER NOT NULL,
  "rewardLabel" TEXT NOT NULL,
  "redeemCost" INTEGER NOT NULL,
  "laneId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProgramTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerProgram" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "balances" JSONB,
  "rewardReady" BOOLEAN NOT NULL DEFAULT false,
  "eligibleTierIds" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerProgram_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StampLedger" ADD COLUMN "programId" TEXT;
ALTER TABLE "StampLedger" ADD COLUMN "amount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StampLedger" ADD COLUMN "metadata" JSONB;

CREATE INDEX "LoyaltyProgram_tenantId_idx" ON "LoyaltyProgram"("tenantId");
CREATE INDEX "LoyaltyProgram_tenantId_isPrimary_idx" ON "LoyaltyProgram"("tenantId", "isPrimary");
CREATE INDEX "LoyaltyProgram_tenantId_isActive_idx" ON "LoyaltyProgram"("tenantId", "isActive");

CREATE INDEX "ProgramTier_programId_idx" ON "ProgramTier"("programId");

CREATE UNIQUE INDEX "CustomerProgram_customerId_programId_key" ON "CustomerProgram"("customerId", "programId");
CREATE INDEX "CustomerProgram_tenantId_idx" ON "CustomerProgram"("tenantId");
CREATE INDEX "CustomerProgram_programId_idx" ON "CustomerProgram"("programId");
CREATE INDEX "CustomerProgram_tenantId_rewardReady_idx" ON "CustomerProgram"("tenantId", "rewardReady");

ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramTier" ADD CONSTRAINT "ProgramTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerProgram" ADD CONSTRAINT "CustomerProgram_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerProgram" ADD CONSTRAINT "CustomerProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StampLedger" ADD CONSTRAINT "StampLedger_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: mevcut RewardRule → LoyaltyProgram + ProgramTier
INSERT INTO "LoyaltyProgram" ("id", "tenantId", "type", "name", "isActive", "isPrimary", "config", "createdAt", "updatedAt")
SELECT
  'lp_' || rr."tenantId",
  rr."tenantId",
  'STAMP_CARD'::"ProgramType",
  'Sadakat kartı',
  true,
  true,
  jsonb_build_object(
    'earnRule', 'PER_VISIT',
    'stampsPerEarn', 1,
    'maxStampsPerDay', 1,
    'blockStampWhenRewardReady', true,
    'resetOnRedeem', 'ZERO'
  ),
  rr."createdAt",
  rr."updatedAt"
FROM "RewardRule" rr;

INSERT INTO "ProgramTier" ("id", "programId", "sortOrder", "threshold", "rewardLabel", "redeemCost", "createdAt", "updatedAt")
SELECT
  'pt_' || rr."tenantId",
  'lp_' || rr."tenantId",
  0,
  rr."stampsRequired",
  rr."rewardLabel",
  rr."stampsRequired",
  rr."createdAt",
  rr."updatedAt"
FROM "RewardRule" rr;

-- Backfill: müşteri kayıtları → CustomerProgram
INSERT INTO "CustomerProgram" ("id", "tenantId", "customerId", "programId", "balance", "rewardReady", "createdAt", "updatedAt")
SELECT
  'cp_' || c."id",
  c."tenantId",
  c."id",
  'lp_' || c."tenantId",
  c."stampCount",
  c."rewardReady",
  c."createdAt",
  c."updatedAt"
FROM "Customer" c
INNER JOIN "RewardRule" rr ON rr."tenantId" = c."tenantId";
