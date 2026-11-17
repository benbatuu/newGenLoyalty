-- AlterTable
ALTER TABLE "Pass" ADD COLUMN "programId" TEXT;

-- CreateIndex
CREATE INDEX "Pass_programId_idx" ON "Pass"("programId");

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
