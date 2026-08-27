-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "barcodeFormat" TEXT NOT NULL DEFAULT 'QR',
ADD COLUMN     "headerChangeMessage" TEXT,
ADD COLUMN     "notifyIconUrl" TEXT,
ADD COLUMN     "rewardChangeMessage" TEXT,
ADD COLUMN     "stampChangeMessage" TEXT,
ADD COLUMN     "statusChangeMessage" TEXT;
