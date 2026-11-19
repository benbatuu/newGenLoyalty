-- Hassas işlemler için e-posta kodu amaçları
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'ACCOUNT_CANCEL';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'ACCOUNT_DELETE';

-- Deneme hatırlatması: son gönderilen eşik
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialReminderDay" INTEGER;
