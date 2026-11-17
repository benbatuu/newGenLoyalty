-- Kısa davet linkleri (additive)
CREATE TABLE "WalletShortLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programIds" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletShortLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletShortLink_code_key" ON "WalletShortLink"("code");
CREATE INDEX "WalletShortLink_tenantId_idx" ON "WalletShortLink"("tenantId");
CREATE INDEX "WalletShortLink_customerId_idx" ON "WalletShortLink"("customerId");
