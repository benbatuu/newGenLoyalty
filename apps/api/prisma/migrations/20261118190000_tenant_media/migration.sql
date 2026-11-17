-- Tenant görsel kütüphanesi (additive)
CREATE TABLE "TenantMedia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantMedia_tenantId_createdAt_idx" ON "TenantMedia"("tenantId", "createdAt");
