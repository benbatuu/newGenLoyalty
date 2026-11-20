-- Marka düzeyi kart varsayılanları (Alanlar + Kilit ekranı)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "walletDefaults" JSONB;
