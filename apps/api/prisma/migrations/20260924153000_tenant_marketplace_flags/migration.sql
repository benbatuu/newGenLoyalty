-- AlterTable: PassMarket listing flags on Tenant (additive, safe defaults)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "marketplaceListingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "marketplacePlanSlug" TEXT;
