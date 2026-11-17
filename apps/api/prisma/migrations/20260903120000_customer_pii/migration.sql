-- Customer PII: encrypted phone/email at rest

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phoneHash" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phoneEnc" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phoneLast4" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "emailHash" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "emailEnc" TEXT;

ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;

DROP INDEX IF EXISTS "Customer_tenantId_phone_key";
DROP INDEX IF EXISTS "Customer_phone_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_phoneHash_key"
  ON "Customer"("tenantId", "phoneHash")
  WHERE "phoneHash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Customer_phoneHash_idx" ON "Customer"("phoneHash");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_phoneLast4_idx" ON "Customer"("tenantId", "phoneLast4");
