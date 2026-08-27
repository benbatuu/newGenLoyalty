-- CreateTable
CREATE TABLE IF NOT EXISTS "SmsMessage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'iletimerkezi',
    "orderId" TEXT,
    "reportId" TEXT,
    "toPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "providerRaw" JSONB,
    "sentAt" TIMESTAMP(3),
    "statusAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmsMessage_reportId_key" ON "SmsMessage"("reportId");
CREATE INDEX IF NOT EXISTS "SmsMessage_orderId_idx" ON "SmsMessage"("orderId");
CREATE INDEX IF NOT EXISTS "SmsMessage_toPhone_idx" ON "SmsMessage"("toPhone");
CREATE INDEX IF NOT EXISTS "SmsMessage_status_idx" ON "SmsMessage"("status");
CREATE INDEX IF NOT EXISTS "SmsMessage_createdAt_idx" ON "SmsMessage"("createdAt");
