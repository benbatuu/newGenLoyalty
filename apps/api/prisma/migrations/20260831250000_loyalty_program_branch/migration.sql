-- LoyaltyProgram → şube bağlantısı (çok şubeli paketlerde kart başına şube)

ALTER TABLE "LoyaltyProgram" ADD COLUMN "branchId" TEXT;

ALTER TABLE "LoyaltyProgram"
  ADD CONSTRAINT "LoyaltyProgram_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LoyaltyProgram_tenantId_branchId_idx" ON "LoyaltyProgram"("tenantId", "branchId");
