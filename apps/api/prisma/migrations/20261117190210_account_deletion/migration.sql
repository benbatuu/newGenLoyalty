-- Hesap silme talebi alanları (veri silmez, yalnızca kolon ekler)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletionScheduledAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletionReason" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletionNote" TEXT;
