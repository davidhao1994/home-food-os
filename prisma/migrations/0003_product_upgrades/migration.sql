ALTER TABLE "inventory_items"
ADD COLUMN "brand" TEXT,
ADD COLUMN "barcode" TEXT,
ADD COLUMN "lowStockThreshold" NUMERIC(10,2) NOT NULL DEFAULT 1,
ADD COLUMN "consumptionRatePerDay" NUMERIC(10,2),
ADD COLUMN "unitPrice" NUMERIC(10,2);

CREATE INDEX "inventory_items_userId_barcode_idx" ON "inventory_items"("userId", "barcode");

CREATE TABLE "inventory_consumptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemId" UUID NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "quantity" NUMERIC(10,2) NOT NULL,
  "note" TEXT,
  "consumedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "inventory_consumptions_userId_consumedAt_idx" ON "inventory_consumptions"("userId", "consumedAt");
CREATE INDEX "inventory_consumptions_itemId_consumedAt_idx" ON "inventory_consumptions"("itemId", "consumedAt");

ALTER TABLE "receipt_uploads"
ADD COLUMN "retailer" TEXT;

ALTER TABLE "ocr_results"
ADD COLUMN "rawLine" TEXT,
ADD COLUMN "extractedPrice" NUMERIC(10,2);

CREATE TABLE "food_nutrition" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "aliases" TEXT[] NOT NULL,
  "calories" NUMERIC(10,2) NOT NULL,
  "protein" NUMERIC(10,2) NOT NULL,
  "fat" NUMERIC(10,2) NOT NULL,
  "carbs" NUMERIC(10,2) NOT NULL,
  "fiber" NUMERIC(10,2) NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'USDA_MAPPED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
