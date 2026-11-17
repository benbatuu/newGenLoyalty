-- E-posta builder: yapılandırılmış içerik + HTML anlık görüntüsü
ALTER TABLE "EmailTemplate" ADD COLUMN "bodyJson" JSONB;
ALTER TABLE "EmailTemplate" ADD COLUMN "bodyHtml" TEXT;

-- Eski markdown alanı opsiyonel (yeni şablonlar bodyJson kullanır)
ALTER TABLE "EmailTemplate" ALTER COLUMN "bodyMd" SET DEFAULT '';
