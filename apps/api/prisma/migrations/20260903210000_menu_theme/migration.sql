-- QR menü tasarım sistemi: tenant varsayılan preset + özelleştirme JSON
ALTER TABLE "Tenant" ADD COLUMN "menuThemePreset" TEXT NOT NULL DEFAULT 'editorial';
ALTER TABLE "Tenant" ADD COLUMN "menuThemeConfig" JSONB;
