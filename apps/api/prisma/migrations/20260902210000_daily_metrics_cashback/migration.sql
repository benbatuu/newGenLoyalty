-- AlterTable
ALTER TABLE "DailyTenantMetrics" ADD COLUMN "cashbackEarnKurus" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DailyTenantMetrics" ADD COLUMN "cashbackRedeemKurus" INTEGER NOT NULL DEFAULT 0;
