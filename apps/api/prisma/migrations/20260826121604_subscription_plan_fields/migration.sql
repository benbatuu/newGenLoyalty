-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "planCode" TEXT NOT NULL DEFAULT 'cafe',
ADD COLUMN     "planPriceTry" INTEGER NOT NULL DEFAULT 990,
ADD COLUMN     "subscriptionActivatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");
