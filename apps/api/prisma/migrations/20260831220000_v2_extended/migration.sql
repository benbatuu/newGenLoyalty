-- V2 extended: ledger types, branches, NFC, CRM, VIP, referrals, POS, email, metrics

ALTER TYPE "StampLedgerType" ADD VALUE IF NOT EXISTS 'DISCOUNT_USE';
ALTER TYPE "StampLedgerType" ADD VALUE IF NOT EXISTS 'EVENT_CHECKIN';
ALTER TYPE "StampLedgerType" ADD VALUE IF NOT EXISTS 'STAFF_REDEEM';
ALTER TYPE "StampLedgerType" ADD VALUE IF NOT EXISTS 'REFERRAL';
ALTER TYPE "StampLedgerType" ADD VALUE IF NOT EXISTS 'MEMBERSHIP_USE';

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isStaff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "vipTierId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lifecycleStage" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "smsOptOut" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "StampLedger" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NfcDevice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "label" TEXT NOT NULL,
  "tagUrl" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NfcDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NfcTapEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "deviceId" TEXT,
  "customerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NfcTapEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Segment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rules" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerTag" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerNote" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VipTier" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minVisits" INTEGER NOT NULL DEFAULT 0,
  "minSpendKurus" INTEGER NOT NULL DEFAULT 0,
  "rateMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VipTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralCode" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "rewardStamps" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralRedemption" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "referralCodeId" TEXT NOT NULL,
  "refereeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PosIntegration" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PosWebhookEvent" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "externalId" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyMd" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailCampaign" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "segmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyTenantMetrics" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "stamps" INTEGER NOT NULL DEFAULT 0,
  "redeems" INTEGER NOT NULL DEFAULT 0,
  "newCustomers" INTEGER NOT NULL DEFAULT 0,
  "pointEarned" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyTenantMetrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SocialRewardClaim" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialRewardClaim_pkey" PRIMARY KEY ("id")
);

-- FKs
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_vipTierId_fkey" FOREIGN KEY ("vipTierId") REFERENCES "VipTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StampLedger" ADD CONSTRAINT "StampLedger_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NfcDevice" ADD CONSTRAINT "NfcDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NfcDevice" ADD CONSTRAINT "NfcDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NfcTapEvent" ADD CONSTRAINT "NfcTapEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "NfcDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VipTier" ADD CONSTRAINT "VipTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralRedemption" ADD CONSTRAINT "ReferralRedemption_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralRedemption" ADD CONSTRAINT "ReferralRedemption_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosIntegration" ADD CONSTRAINT "PosIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosWebhookEvent" ADD CONSTRAINT "PosWebhookEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "PosIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyTenantMetrics" ADD CONSTRAINT "DailyTenantMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerTag_customerId_tag_key" ON "CustomerTag"("customerId", "tag");
CREATE INDEX IF NOT EXISTS "CustomerTag_tenantId_tag_idx" ON "CustomerTag"("tenantId", "tag");
CREATE INDEX IF NOT EXISTS "CustomerNote_customerId_createdAt_idx" ON "CustomerNote"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Branch_tenantId_idx" ON "Branch"("tenantId");
CREATE INDEX IF NOT EXISTS "Branch_tenantId_isActive_idx" ON "Branch"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "NfcDevice_tenantId_idx" ON "NfcDevice"("tenantId");
CREATE INDEX IF NOT EXISTS "NfcTapEvent_tenantId_createdAt_idx" ON "NfcTapEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Segment_tenantId_idx" ON "Segment"("tenantId");
CREATE INDEX IF NOT EXISTS "VipTier_tenantId_sortOrder_idx" ON "VipTier"("tenantId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_tenantId_code_key" ON "ReferralCode"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "ReferralCode_customerId_idx" ON "ReferralCode"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralRedemption_referralCodeId_refereeId_key" ON "ReferralRedemption"("referralCodeId", "refereeId");
CREATE INDEX IF NOT EXISTS "PosIntegration_tenantId_provider_idx" ON "PosIntegration"("tenantId", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "PosWebhookEvent_integrationId_externalId_key" ON "PosWebhookEvent"("integrationId", "externalId");
CREATE INDEX IF NOT EXISTS "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "EmailCampaign_tenantId_status_idx" ON "EmailCampaign"("tenantId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyTenantMetrics_tenantId_date_key" ON "DailyTenantMetrics"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "SocialRewardClaim_tenantId_status_idx" ON "SocialRewardClaim"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_lifecycleStage_idx" ON "Customer"("tenantId", "lifecycleStage");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_isStaff_idx" ON "Customer"("tenantId", "isStaff");
CREATE INDEX IF NOT EXISTS "User_branchId_idx" ON "User"("branchId");
CREATE INDEX IF NOT EXISTS "StampLedger_branchId_createdAt_idx" ON "StampLedger"("branchId", "createdAt");
