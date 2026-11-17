-- Menü etiket kataloğu (tenant bazlı, çok dilli)
CREATE TABLE "MenuTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "translations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MenuTag_tenantId_label_key" ON "MenuTag"("tenantId", "label");
CREATE INDEX "MenuTag_tenantId_idx" ON "MenuTag"("tenantId");

ALTER TABLE "MenuTag" ADD CONSTRAINT "MenuTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
