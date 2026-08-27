-- CreateTable
CREATE TABLE "BroadcastLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "synced" INTEGER NOT NULL DEFAULT 0,
    "devices" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BroadcastLog_tenantId_createdAt_idx" ON "BroadcastLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "BroadcastLog" ADD CONSTRAINT "BroadcastLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from current tenant broadcast fields
INSERT INTO "BroadcastLog" ("id", "tenantId", "message", "synced", "devices", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  t."id",
  t."passBroadcastMessage",
  0,
  0,
  COALESCE(t."passBroadcastAt", t."updatedAt")
FROM "Tenant" t
WHERE t."passBroadcastMessage" IS NOT NULL
  AND LENGTH(TRIM(t."passBroadcastMessage")) > 0;
