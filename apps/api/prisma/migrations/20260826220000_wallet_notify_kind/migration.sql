-- CreateEnum
CREATE TYPE "PassNotifyKind" AS ENUM ('STAMP', 'REDEEM');

-- AlterTable
ALTER TABLE "Pass" ADD COLUMN "pendingNotifyKind" "PassNotifyKind";

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "redeemChangeMessage" TEXT;
