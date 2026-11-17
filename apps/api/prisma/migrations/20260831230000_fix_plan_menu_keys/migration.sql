-- Paket menuKeys — migration seed'deki eksik menüleri düzeltir (Growth+ kampanya, Business VIP vb.)

UPDATE "SubscriptionPlan"
SET "menuKeys" = '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb
WHERE "code" IN ('cafe', 'starter');

UPDATE "SubscriptionPlan"
SET "menuKeys" = '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers","reports","campaigns","table-tent"]'::jsonb
WHERE "code" = 'growth';

UPDATE "SubscriptionPlan"
SET "menuKeys" = '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers","reports","campaigns","table-tent","branches","segments"]'::jsonb
WHERE "code" = 'pro';

UPDATE "SubscriptionPlan"
SET "menuKeys" = '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers","reports","campaigns","table-tent","branches","segments","vip","referrals"]'::jsonb
WHERE "code" = 'business';

UPDATE "SubscriptionPlan"
SET "menuKeys" = '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers","reports","campaigns","table-tent","branches","segments","vip","referrals","pos"]'::jsonb
WHERE "code" = 'enterprise';
