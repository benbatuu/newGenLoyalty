-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "OwnerPushKind" AS ENUM ('ACCOUNT', 'DAILY_SUMMARY', 'WEEKLY_SUMMARY');

-- CreateTable
CREATE TABLE "OwnerPushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerPushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerPushPref" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerPushPref_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "OwnerPushLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "OwnerPushKind" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerPushLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerPushDevice_fcmToken_key" ON "OwnerPushDevice"("fcmToken");

-- CreateIndex
CREATE INDEX "OwnerPushDevice_userId_idx" ON "OwnerPushDevice"("userId");

-- CreateIndex
CREATE INDEX "OwnerPushLog_userId_createdAt_idx" ON "OwnerPushLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerPushLog_userId_kind_dedupeKey_key" ON "OwnerPushLog"("userId", "kind", "dedupeKey");

-- AddForeignKey
ALTER TABLE "OwnerPushDevice" ADD CONSTRAINT "OwnerPushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerPushPref" ADD CONSTRAINT "OwnerPushPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerPushLog" ADD CONSTRAINT "OwnerPushLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
