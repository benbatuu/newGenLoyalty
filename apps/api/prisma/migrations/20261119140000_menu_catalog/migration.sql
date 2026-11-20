-- Alerjen ve ekstra kataloğu (tenant bazlı, çok dilli). Idempotent.
CREATE TABLE IF NOT EXISTS "MenuCatalogEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "translations" JSONB,
    "defaultPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCatalogEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuCatalogEntry_tenantId_kind_label_key" ON "MenuCatalogEntry"("tenantId", "kind", "label");
CREATE INDEX IF NOT EXISTS "MenuCatalogEntry_tenantId_idx" ON "MenuCatalogEntry"("tenantId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MenuCatalogEntry_tenantId_fkey'
    ) THEN
        ALTER TABLE "MenuCatalogEntry" ADD CONSTRAINT "MenuCatalogEntry_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
