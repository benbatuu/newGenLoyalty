-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "passNotice" TEXT,
ADD COLUMN "passNoticeAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BroadcastLog" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN "audienceLabel" TEXT,
ADD COLUMN "targetCount" INTEGER;
