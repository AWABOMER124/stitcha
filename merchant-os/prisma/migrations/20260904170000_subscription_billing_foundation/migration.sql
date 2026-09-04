ALTER TYPE "MerchantSubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING' BEFORE 'ACTIVE';

CREATE TYPE "SubscriptionBillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

ALTER TABLE "merchant_plans"
ADD COLUMN "yearlyPrice" DECIMAL(10,2);

ALTER TABLE "merchant_subscriptions"
ADD COLUMN "billingInterval" "SubscriptionBillingInterval" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "entitlementOverrides" JSONB,
ADD COLUMN "billingProvider" TEXT,
ADD COLUMN "externalCustomerId" TEXT,
ADD COLUMN "externalSubscriptionId" TEXT;

CREATE UNIQUE INDEX "merchant_subscriptions_externalSubscriptionId_key"
ON "merchant_subscriptions"("externalSubscriptionId");

CREATE INDEX "merchant_subscriptions_billingProvider_externalCustomerId_idx"
ON "merchant_subscriptions"("billingProvider", "externalCustomerId");
