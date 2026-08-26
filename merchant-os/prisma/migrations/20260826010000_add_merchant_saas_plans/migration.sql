-- CreateEnum
CREATE TYPE "MerchantSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELLED');

-- CreateTable
CREATE TABLE "merchant_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "entitlements" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_subscriptions" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "MerchantSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStartsAt" TIMESTAMP(3),
    "currentPeriodEndsAt" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "priceOverride" DECIMAL(10,2),
    "currencyOverride" TEXT,
    "isGrandfathered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_plans_code_key" ON "merchant_plans"("code");
CREATE INDEX "merchant_plans_isActive_sortOrder_idx" ON "merchant_plans"("isActive", "sortOrder");
CREATE UNIQUE INDEX "merchant_subscriptions_merchantId_key" ON "merchant_subscriptions"("merchantId");
CREATE INDEX "merchant_subscriptions_planId_status_idx" ON "merchant_subscriptions"("planId", "status");
CREATE INDEX "merchant_subscriptions_status_currentPeriodEndsAt_idx" ON "merchant_subscriptions"("status", "currentPeriodEndsAt");

ALTER TABLE "merchant_subscriptions"
ADD CONSTRAINT "merchant_subscriptions_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "merchant_subscriptions"
ADD CONSTRAINT "merchant_subscriptions_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "merchant_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Public launch plans. Pro is a USD reference price; checkout will present and
-- lock the local-currency amount for each billing period.
INSERT INTO "merchant_plans" (
    "id", "code", "name", "description", "monthlyPrice", "currency",
    "entitlements", "isPublic", "isActive", "sortOrder"
) VALUES
(
    'merchant_plan_free', 'FREE', 'Basic',
    'Free storefront and essential order operations', 0, 'USD',
    '{"maxActiveProducts":100,"maxStaffUsers":2,"maxBranches":1,"customDomain":false,"removeBranding":false,"advancedAnalytics":false,"crmAutomation":false,"dataExport":false,"apiAccess":false,"aiMonthlyCredits":3}'::jsonb,
    true, true, 0
),
(
    'merchant_plan_pro', 'PRO', 'Pro',
    'Professional growth, automation, and analytics tools', 10, 'USD',
    '{"maxActiveProducts":-1,"maxStaffUsers":5,"maxBranches":3,"customDomain":true,"removeBranding":true,"advancedAnalytics":true,"crmAutomation":true,"dataExport":true,"apiAccess":true,"aiMonthlyCredits":100}'::jsonb,
    true, true, 1
);

-- Preserve existing merchants' current access during the transition. They are
-- grandfathered on Pro at zero charge until explicitly migrated. New direct
-- registrations are assigned FREE by application code.
INSERT INTO "merchant_subscriptions" (
    "id", "merchantId", "planId", "status", "priceOverride",
    "currencyOverride", "isGrandfathered"
)
SELECT
    'msub_' || md5("id"), "id", 'merchant_plan_pro', 'ACTIVE', 0, 'USD', true
FROM "merchants"
ON CONFLICT ("merchantId") DO NOTHING;
