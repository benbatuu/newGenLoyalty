-- SocialRewardClaim genişletme
ALTER TABLE "SocialRewardClaim" ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;
ALTER TABLE "SocialRewardClaim" ADD COLUMN IF NOT EXISTS "actionType" TEXT;
ALTER TABLE "SocialRewardClaim" ADD COLUMN IF NOT EXISTS "rewardStamps" INTEGER NOT NULL DEFAULT 1;

-- Şube bazlı günlük metrikler
CREATE TABLE IF NOT EXISTS "BranchDailyMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "stamps" INTEGER NOT NULL DEFAULT 0,
    "redeems" INTEGER NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "pointEarned" INTEGER NOT NULL DEFAULT 0,
    "cashbackEarnKurus" INTEGER NOT NULL DEFAULT 0,
    "cashbackRedeemKurus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchDailyMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchDailyMetrics_tenantId_branchId_date_key"
    ON "BranchDailyMetrics"("tenantId", "branchId", "date");
CREATE INDEX IF NOT EXISTS "BranchDailyMetrics_tenantId_date_idx"
    ON "BranchDailyMetrics"("tenantId", "date");

ALTER TABLE "BranchDailyMetrics" ADD CONSTRAINT "BranchDailyMetrics_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchDailyMetrics" ADD CONSTRAINT "BranchDailyMetrics_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enterprise API keys
CREATE TABLE IF NOT EXISTS "TenantApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantApiKey_keyHash_key" ON "TenantApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "TenantApiKey_tenantId_idx" ON "TenantApiKey"("tenantId");

ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gift credit
CREATE TABLE IF NOT EXISTS "GiftCredit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amountKurus" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "redeemedByCustomerId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCredit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GiftCredit_tenantId_code_key" ON "GiftCredit"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "GiftCredit_tenantId_status_idx" ON "GiftCredit"("tenantId", "status");

ALTER TABLE "GiftCredit" ADD CONSTRAINT "GiftCredit_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
