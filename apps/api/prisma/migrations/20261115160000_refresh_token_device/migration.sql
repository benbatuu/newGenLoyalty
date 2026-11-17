-- Cihaz bazlı oturumlar: aynı IP + tarayıcı tek satır olur.
ALTER TABLE "RefreshToken"
  ADD COLUMN "deviceKey" TEXT,
  ADD COLUMN "ip" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "RefreshToken_userId_deviceKey_key" ON "RefreshToken"("userId", "deviceKey");
