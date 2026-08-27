-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "stampIconEmptyUrl" TEXT,
ADD COLUMN     "stampIconFilledUrl" TEXT,
ADD COLUMN     "stampTheme" TEXT NOT NULL DEFAULT 'COFFEE';
