-- Wasla owns subscription entitlements and merchant quota accounting. AI Core
-- remains the execution provider and may keep its own provider-cost ledger.
CREATE TYPE "AiUsageOperationStatus" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED', 'EXPIRED');

CREATE TABLE "ai_usage_buckets" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "limitSnapshot" INTEGER NOT NULL,
    "usedUnits" INTEGER NOT NULL DEFAULT 0,
    "reservedUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_usage_buckets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_usage_operations" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "AiUsageOperationStatus" NOT NULL DEFAULT 'RESERVED',
    "units" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT,
    "providerRequestId" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(12,6),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_usage_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_usage_buckets_merchantId_featureKey_periodKey_key"
ON "ai_usage_buckets"("merchantId", "featureKey", "periodKey");
CREATE INDEX "ai_usage_buckets_merchantId_periodKey_idx"
ON "ai_usage_buckets"("merchantId", "periodKey");
CREATE UNIQUE INDEX "ai_usage_operations_merchantId_featureKey_idempotencyKey_key"
ON "ai_usage_operations"("merchantId", "featureKey", "idempotencyKey");
CREATE INDEX "ai_usage_operations_status_expiresAt_idx"
ON "ai_usage_operations"("status", "expiresAt");
CREATE INDEX "ai_usage_operations_merchantId_createdAt_idx"
ON "ai_usage_operations"("merchantId", "createdAt");

ALTER TABLE "ai_usage_buckets"
ADD CONSTRAINT "ai_usage_buckets_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_operations"
ADD CONSTRAINT "ai_usage_operations_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usage_operations"
ADD CONSTRAINT "ai_usage_operations_bucketId_fkey"
FOREIGN KEY ("bucketId") REFERENCES "ai_usage_buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "merchant_plans"
SET "entitlements" = "entitlements" || '{
  "maxActiveProducts": 20,
  "maxCategories": 10,
  "maxStaffUsers": 1,
  "maxBranches": 1,
  "aiMonthlyCredits": 0,
  "aiStoreGenerationsLifetime": 1,
  "aiStoreGenerationsMonthly": 0,
  "aiStoreEditsMonthly": 0,
  "aiMerchantChatsMonthly": 0,
  "aiImageEnhancementsMonthly": 0,
  "whatsappAiConversationsMonthly": 0,
  "whatsappAiAgent": false
}'::jsonb
WHERE "code" = 'FREE';

INSERT INTO "merchant_plans" (
  "id", "code", "name", "description", "monthlyPrice", "currency",
  "entitlements", "isPublic", "isActive", "sortOrder", "createdAt", "updatedAt"
) VALUES (
  'merchant_plan_growth', 'GROWTH', 'Growth',
  'AI-assisted selling, reporting, and catalog growth', 5, 'USD',
  '{
    "maxActiveProducts": 300,
    "maxCategories": 50,
    "maxStaffUsers": 3,
    "maxBranches": 1,
    "customDomain": false,
    "removeBranding": false,
    "advancedAnalytics": false,
    "crmAutomation": false,
    "dataExport": true,
    "apiAccess": false,
    "aiMonthlyCredits": 100,
    "aiStoreGenerationsLifetime": 1,
    "aiStoreGenerationsMonthly": 5,
    "aiStoreEditsMonthly": 100,
    "aiMerchantChatsMonthly": 300,
    "aiImageEnhancementsMonthly": 20,
    "whatsappAiConversationsMonthly": 0,
    "whatsappAiAgent": false
  }'::jsonb,
  true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "entitlements" = EXCLUDED."entitlements",
  "isActive" = true,
  "sortOrder" = 1,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "merchant_plans"
SET
  "sortOrder" = 2,
  "entitlements" = "entitlements" || '{
    "maxActiveProducts": 2000,
    "maxCategories": 200,
    "maxStaffUsers": 10,
    "maxBranches": 3,
    "customDomain": true,
    "removeBranding": true,
    "advancedAnalytics": true,
    "crmAutomation": true,
    "dataExport": true,
    "apiAccess": true,
    "aiMonthlyCredits": 500,
    "aiStoreGenerationsLifetime": 1,
    "aiStoreGenerationsMonthly": 20,
    "aiStoreEditsMonthly": 500,
    "aiMerchantChatsMonthly": 2000,
    "aiImageEnhancementsMonthly": 100,
    "whatsappAiConversationsMonthly": 2000,
    "whatsappAiAgent": true
  }'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PRO';
