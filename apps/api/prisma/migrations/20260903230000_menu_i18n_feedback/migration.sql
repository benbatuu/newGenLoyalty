-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN IF NOT EXISTS "translations" JSONB;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "translations" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "message" TEXT NOT NULL,
    "tableLabel" TEXT,
    "lang" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MenuFeedback_tenantId_createdAt_idx" ON "MenuFeedback"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "MenuFeedback_tenantId_status_idx" ON "MenuFeedback"("tenantId", "status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MenuFeedback" ADD CONSTRAINT "MenuFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
