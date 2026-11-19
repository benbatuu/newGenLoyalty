-- Kod ile doğrulanan e-posta akışları (kayıt, şifre sıfırlama, şifre değişikliği,
-- abonelik iptali, hesap silme). Şema daha önce migration olmadan eklenmişti;
-- bu dosya hem sıfır veritabanında hem mevcut veritabanında güvenle çalışır.

DO $$ BEGIN
  CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'RESET_PASSWORD', 'PASSWORD_CHANGE', 'ACCOUNT_CANCEL', 'ACCOUNT_DELETE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'REGISTER';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'RESET_PASSWORD';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'ACCOUNT_CANCEL';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'ACCOUNT_DELETE';

CREATE TABLE IF NOT EXISTS "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailOtp_email_purpose_createdAt_idx" ON "EmailOtp"("email", "purpose", "createdAt");

-- Deneme bitişi hatırlatması: son gönderilen eşik (3, 1, 0 gün kala)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialReminderDay" INTEGER;
