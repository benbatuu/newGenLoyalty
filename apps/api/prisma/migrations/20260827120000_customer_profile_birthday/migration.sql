-- AlterEnum
ALTER TYPE "PassNotifyKind" ADD VALUE IF NOT EXISTS 'BIRTHDAY';

-- AlterTable Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "collectCustomerName" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "collectCustomerBirthday" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "birthdayGiftEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "birthdayMessage" TEXT;

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthMonth" INTEGER;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthDay" INTEGER;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastBirthdayNotifyYear" INTEGER;

CREATE INDEX IF NOT EXISTS "Customer_tenantId_birthMonth_birthDay_idx" ON "Customer"("tenantId", "birthMonth", "birthDay");
