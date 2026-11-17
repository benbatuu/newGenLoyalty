-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelTr" TEXT NOT NULL,
    "labelEn" TEXT,
    "priceTry" INTEGER NOT NULL DEFAULT 0,
    "maxPrograms" INTEGER NOT NULL DEFAULT 1,
    "allowedProgramTypes" JSONB NOT NULL,
    "maxByType" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL,
    "menuKeys" JSONB NOT NULL,
    "maxBranches" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "badgeTr" TEXT,
    "badgeEn" TEXT,
    "noteTr" TEXT,
    "noteEn" TEXT,
    "includesTr" JSONB NOT NULL DEFAULT '[]',
    "includesEn" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_isPublic_sortOrder_idx" ON "SubscriptionPlan"("isActive", "isPublic", "sortOrder");

-- Seed default plans (task_v2.md matrisi)
INSERT INTO "SubscriptionPlan" (
    "id", "code", "labelTr", "labelEn", "priceTry", "maxPrograms",
    "allowedProgramTypes", "maxByType", "features", "menuKeys", "maxBranches",
    "sortOrder", "isActive", "isPublic", "badgeTr", "badgeEn", "noteTr", "noteEn",
    "includesTr", "includesEn", "updatedAt"
) VALUES
(
    'plan_cafe', 'cafe', 'Kafe paketi', 'Cafe plan', 990, 1,
    '["STAMP_CARD"]'::jsonb,
    '{"STAMP_CARD": 1}'::jsonb,
    '["wallet","basic_reports","branches:1"]'::jsonb,
    '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb,
    1, 10, true, true, 'Önerilen', 'Recommended',
    'Pilot fiyat — onboarding''de netleşir.', 'Pilot pricing — finalized at onboarding.',
    '["Sınırsız müşteri ve damga","Apple + Google Wallet kartları","Owner + kasiyer hesapları","SMS davet (kota anlaşmaya göre)","Web panel + Flutter personel","Temel özet (raporlar Growth+)"]'::jsonb,
    '["Unlimited customers & stamps","Apple + Google Wallet passes","Owner + cashier accounts","SMS invite (quota per agreement)","Web panel + Flutter staff app","Basic summary (full reports on Growth+)"]'::jsonb,
    CURRENT_TIMESTAMP
),
(
    'plan_starter', 'starter', 'Starter', 'Starter', 990, 1,
    '["STAMP_CARD"]'::jsonb,
    '{"STAMP_CARD": 1}'::jsonb,
    '["wallet","basic_reports","branches:1"]'::jsonb,
    '["counter","metrics","onboarding","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb,
    1, 20, true, true, NULL, NULL, NULL, NULL,
    '["1 damga kartı","Wallet pass","Temel rapor özeti","1 şube"]'::jsonb,
    '["1 stamp card","Wallet pass","Basic report summary","1 branch"]'::jsonb,
    CURRENT_TIMESTAMP
),
(
    'plan_growth', 'growth', 'Growth', 'Growth', 1490, 3,
    '["STAMP_CARD","MULTI_STAMP","POINT_CARD"]'::jsonb,
    '{"STAMP_CARD": 1, "MULTI_STAMP": 2, "POINT_CARD": 1}'::jsonb,
    '["wallet","basic_reports","multistamp","point_card","campaigns","win_back","birthday","branches:1"]'::jsonb,
    '["counter","metrics","onboarding","reports","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb,
    1, 30, true, true, 'Popüler', 'Popular', NULL, NULL,
    '["3 sadakat kartına kadar","Multi damga + puan kartı","Kampanya & win-back","Doğum günü otomasyonu","Tam raporlar"]'::jsonb,
    '["Up to 3 loyalty cards","Multi-stamp + point card","Campaigns & win-back","Birthday automation","Full reports"]'::jsonb,
    CURRENT_TIMESTAMP
),
(
    'plan_pro', 'pro', 'Pro', 'Pro', 1990, 5,
    '["STAMP_CARD","MULTI_STAMP","POINT_CARD","DISCOUNT_CARD","EVENT_CARD"]'::jsonb,
    '{"STAMP_CARD": 1, "MULTI_STAMP": 2, "POINT_CARD": 1, "DISCOUNT_CARD": 1, "EVENT_CARD": 2}'::jsonb,
    '["wallet","reports","multistamp","point_card","discount_card","event_card","campaigns","nfc","branches:3","segments_basic"]'::jsonb,
    '["counter","metrics","onboarding","reports","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb,
    3, 40, true, true, NULL, NULL, NULL, NULL,
    '["5 kart limiti","İndirim & etkinlik kartları","3 şubeye kadar","Segmentasyon (temel)","NFC (yol haritası)"]'::jsonb,
    '["5 card limit","Discount & event cards","Up to 3 branches","Segmentation (basic)","NFC (roadmap)"]'::jsonb,
    CURRENT_TIMESTAMP
),
(
    'plan_business', 'business', 'Business', 'Business', 2990, 8,
    '["STAMP_CARD","MULTI_STAMP","POINT_CARD","DISCOUNT_CARD","EVENT_CARD","MEMBERSHIP_CARD","STAFF_CARD"]'::jsonb,
    '{"STAMP_CARD": 1, "MULTI_STAMP": 3, "POINT_CARD": 2, "DISCOUNT_CARD": 2, "EVENT_CARD": 3, "MEMBERSHIP_CARD": 1, "STAFF_CARD": 1}'::jsonb,
    '["wallet","reports","crm","email","sms_segment","vip","referral","branches:10"]'::jsonb,
    '["counter","metrics","onboarding","reports","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb,
    10, 50, true, true, NULL, NULL, NULL, NULL,
    '["8 kart limiti","CRM & e-posta","VIP & referral","10 şubeye kadar","SMS segment"]'::jsonb,
    '["8 card limit","CRM & email","VIP & referral","Up to 10 branches","SMS segments"]'::jsonb,
    CURRENT_TIMESTAMP
),
(
    'plan_enterprise', 'enterprise', 'Enterprise', 'Enterprise', 0, 50,
    '["STAMP_CARD","MULTI_STAMP","POINT_CARD","DISCOUNT_CARD","EVENT_CARD","MEMBERSHIP_CARD","STAFF_CARD"]'::jsonb,
    '{}'::jsonb,
    '["all","pos","vas","customer_app","sla","api"]'::jsonb,
    '["counter","metrics","onboarding","reports","reward","settings","business","notifications","staff","billing","help","customers"]'::jsonb,
    999, 60, true, true, 'Kurumsal', 'Enterprise', 'Özel fiyat — satış ekibiyle görüşün.', 'Custom pricing — contact sales.',
    '["Tüm kart tipleri","POS & VAS entegrasyonu","Müşteri uygulaması","SLA & API erişimi"]'::jsonb,
    '["All card types","POS & VAS integrations","Customer app","SLA & API access"]'::jsonb,
    CURRENT_TIMESTAMP
);

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "SubscriptionPlan"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
