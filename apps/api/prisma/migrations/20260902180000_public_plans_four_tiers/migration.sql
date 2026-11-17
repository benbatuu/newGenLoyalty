-- Public pricing: starter, growth, pro, business (4 tiers side by side on marketing site)

UPDATE "SubscriptionPlan"
SET "isPublic" = false, "sortOrder" = 100
WHERE "code" = 'cafe';

UPDATE "SubscriptionPlan"
SET "isPublic" = false, "sortOrder" = 110
WHERE "code" = 'enterprise';

UPDATE "SubscriptionPlan"
SET
  "isPublic" = true,
  "sortOrder" = 10,
  "noteTr" = '1 sadakat kartı · 1 şube',
  "noteEn" = '1 loyalty card · 1 branch',
  "includesTr" = '["1 damga kartı","Apple + Google Wallet","Owner + kasiyer hesapları","Temel rapor özeti","1 şube"]'::jsonb,
  "includesEn" = '["1 stamp card","Apple + Google Wallet","Owner + cashier accounts","Basic report summary","1 branch"]'::jsonb
WHERE "code" = 'starter';

UPDATE "SubscriptionPlan"
SET
  "isPublic" = true,
  "sortOrder" = 20,
  "badgeTr" = 'Popüler',
  "badgeEn" = 'Popular',
  "noteTr" = '3 sadakat kartına kadar · 1 şube',
  "noteEn" = 'Up to 3 loyalty cards · 1 branch'
WHERE "code" = 'growth';

UPDATE "SubscriptionPlan"
SET
  "isPublic" = true,
  "sortOrder" = 30,
  "noteTr" = '5 sadakat kartı · 3 şubeye kadar',
  "noteEn" = '5 loyalty cards · up to 3 branches'
WHERE "code" = 'pro';

UPDATE "SubscriptionPlan"
SET
  "isPublic" = true,
  "sortOrder" = 40,
  "noteTr" = '8 sadakat kartı · 10 şubeye kadar',
  "noteEn" = '8 loyalty cards · up to 10 branches'
WHERE "code" = 'business';
