-- Business+ paketlerde eksik kalan devralınmış özellikleri düzeltir (campaigns vb.)

UPDATE "SubscriptionPlan"
SET "features" = '["wallet","basic_reports","branches:1","multistamp","point_card","campaigns","win_back","birthday"]'::jsonb
WHERE "code" = 'growth';

UPDATE "SubscriptionPlan"
SET "features" = '["wallet","basic_reports","branches:1","multistamp","point_card","campaigns","win_back","birthday","reports","discount_card","event_card","nfc","branches:3","segments_basic"]'::jsonb
WHERE "code" = 'pro';

UPDATE "SubscriptionPlan"
SET "features" = '["wallet","basic_reports","branches:1","multistamp","point_card","campaigns","win_back","birthday","reports","discount_card","event_card","nfc","branches:3","segments_basic","crm","email","sms_segment","vip","referral","branches:10"]'::jsonb
WHERE "code" = 'business';
