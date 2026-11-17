ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxMenuCategories" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxMenuItems" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxMenuTables" INTEGER NOT NULL DEFAULT 0;

-- Set limits for existing plans
UPDATE "SubscriptionPlan" SET "maxMenuCategories" = 5,  "maxMenuItems" = 30,   "maxMenuTables" = 10   WHERE "code" = 'growth';
UPDATE "SubscriptionPlan" SET "maxMenuCategories" = 15, "maxMenuItems" = 100,  "maxMenuTables" = 50   WHERE "code" = 'pro';
UPDATE "SubscriptionPlan" SET "maxMenuCategories" = 30, "maxMenuItems" = 300,  "maxMenuTables" = 200  WHERE "code" = 'business';
UPDATE "SubscriptionPlan" SET "maxMenuCategories" = 999,"maxMenuItems" = 9999, "maxMenuTables" = 9999 WHERE "code" = 'enterprise';
