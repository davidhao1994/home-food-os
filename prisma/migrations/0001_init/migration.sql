CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ItemCategory" AS ENUM (
  'MEAT',
  'SEAFOOD',
  'VEGETABLES',
  'FRUITS',
  'DAIRY',
  'EGGS',
  'GRAINS',
  'FROZEN_FOODS',
  'CONDIMENTS',
  'SNACKS',
  'BEVERAGES',
  'OTHER'
);

CREATE TYPE "StorageLocation" AS ENUM ('REFRIGERATOR', 'FREEZER', 'PANTRY', 'COUNTERTOP');
CREATE TYPE "ShoppingPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ReceiptStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED');
CREATE TYPE "OcrLineStatus" AS ENUM ('EXTRACTED', 'CONFIRMED', 'REJECTED');
CREATE TYPE "RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TABLE "profiles" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "fullName" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "households" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "household_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "householdId" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("householdId", "userId")
);

CREATE TABLE "inventory_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "householdId" UUID REFERENCES "households"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "quantity" NUMERIC(10,2) NOT NULL,
  "unit" TEXT NOT NULL,
  "category" "ItemCategory" NOT NULL,
  "purchaseDate" TIMESTAMPTZ,
  "expirationDate" TIMESTAMPTZ,
  "storageLocation" "StorageLocation" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "shopping_list_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "householdId" UUID REFERENCES "households"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "quantity" NUMERIC(10,2) NOT NULL,
  "unit" TEXT NOT NULL,
  "category" "ItemCategory" NOT NULL,
  "priority" "ShoppingPriority" NOT NULL DEFAULT 'MEDIUM',
  "estimatedPrice" NUMERIC(10,2),
  "isPurchased" BOOLEAN NOT NULL DEFAULT FALSE,
  "purchasedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "recipes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cuisine" TEXT NOT NULL,
  "cookTime" INT NOT NULL,
  "difficulty" "RecipeDifficulty" NOT NULL,
  "calories" INT,
  "protein" NUMERIC(10,2),
  "carbs" NUMERIC(10,2),
  "fat" NUMERIC(10,2),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "recipe_ingredients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipeId" UUID NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "quantity" NUMERIC(10,2),
  "unit" TEXT,
  "category" "ItemCategory",
  "isOptional" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE "receipt_uploads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "imageUrl" TEXT NOT NULL,
  "status" "ReceiptStatus" NOT NULL DEFAULT 'UPLOADED',
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ,
  "rawText" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "ocr_results" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "receiptUploadId" UUID NOT NULL REFERENCES "receipt_uploads"("id") ON DELETE CASCADE,
  "extractedName" TEXT NOT NULL,
  "extractedQuantity" NUMERIC(10,2),
  "extractedUnit" TEXT,
  "confidence" NUMERIC(5,2),
  "lineStatus" "OcrLineStatus" NOT NULL DEFAULT 'EXTRACTED',
  "mappedCategory" "ItemCategory",
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "ai_conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "prompt" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "inventory_items_userId_expirationDate_idx" ON "inventory_items"("userId", "expirationDate");
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");
CREATE INDEX "shopping_list_items_userId_isPurchased_idx" ON "shopping_list_items"("userId", "isPurchased");
CREATE INDEX "recipes_cuisine_idx" ON "recipes"("cuisine");
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");
CREATE INDEX "receipt_uploads_userId_status_idx" ON "receipt_uploads"("userId", "status");
CREATE INDEX "ocr_results_receiptUploadId_idx" ON "ocr_results"("receiptUploadId");
CREATE INDEX "ai_conversations_userId_createdAt_idx" ON "ai_conversations"("userId", "createdAt");
