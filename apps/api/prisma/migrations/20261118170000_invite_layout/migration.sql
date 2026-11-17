-- Davet sayfası blok düzeni (additive)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "inviteLayout" JSONB;
