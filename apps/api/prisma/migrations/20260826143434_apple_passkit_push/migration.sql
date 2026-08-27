-- AlterTable
ALTER TABLE "Pass" ADD COLUMN     "authenticationToken" TEXT,
ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AppleDeviceRegistration" (
    "id" TEXT NOT NULL,
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "passTypeIdentifier" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "passId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleDeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppleDeviceRegistration_passId_idx" ON "AppleDeviceRegistration"("passId");

-- CreateIndex
CREATE INDEX "AppleDeviceRegistration_deviceLibraryIdentifier_passTypeIde_idx" ON "AppleDeviceRegistration"("deviceLibraryIdentifier", "passTypeIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "AppleDeviceRegistration_deviceLibraryIdentifier_passId_key" ON "AppleDeviceRegistration"("deviceLibraryIdentifier", "passId");

-- AddForeignKey
ALTER TABLE "AppleDeviceRegistration" ADD CONSTRAINT "AppleDeviceRegistration_passId_fkey" FOREIGN KEY ("passId") REFERENCES "Pass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
