-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "nameTr" TEXT,
    "nameEn" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTr" TEXT,
    "nameEn" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "imageUrl" TEXT,
    "allergens" TEXT[],
    "tags" TEXT[],
    "variants" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "calories" INTEGER,
    "prepTimeMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemArAsset" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemArAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuCategory_tenantId_idx" ON "MenuCategory"("tenantId");
CREATE INDEX "MenuCategory_branchId_idx" ON "MenuCategory"("branchId");

CREATE INDEX "MenuItem_tenantId_idx" ON "MenuItem"("tenantId");
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

CREATE UNIQUE INDEX "MenuTable_qrCode_key" ON "MenuTable"("qrCode");
CREATE UNIQUE INDEX "MenuTable_branchId_label_key" ON "MenuTable"("branchId", "label");
CREATE INDEX "MenuTable_tenantId_idx" ON "MenuTable"("tenantId");
CREATE INDEX "MenuTable_branchId_idx" ON "MenuTable"("branchId");

CREATE INDEX "MenuItemArAsset_menuItemId_idx" ON "MenuItemArAsset"("menuItemId");

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuTable" ADD CONSTRAINT "MenuTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuTable" ADD CONSTRAINT "MenuTable_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItemArAsset" ADD CONSTRAINT "MenuItemArAsset_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
