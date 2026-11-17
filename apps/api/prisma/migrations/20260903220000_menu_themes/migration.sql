-- Kaydedilebilir QR menü temaları
CREATE TABLE "MenuTheme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preset" TEXT NOT NULL DEFAULT 'editorial',
    "document" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuTheme_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MenuTheme_tenantId_idx" ON "MenuTheme"("tenantId");
CREATE INDEX "MenuTheme_tenantId_isActive_idx" ON "MenuTheme"("tenantId", "isActive");

ALTER TABLE "MenuTheme" ADD CONSTRAINT "MenuTheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
