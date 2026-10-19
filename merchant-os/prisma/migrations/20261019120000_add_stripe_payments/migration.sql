-- Stripe subscriptions and merchant destination payments.
ALTER TABLE "merchant_subscription_payments"
  ALTER COLUMN "paymentAccountId" DROP NOT NULL,
  ALTER COLUMN "channel" DROP NOT NULL,
  ALTER COLUMN "proofStorageKey" DROP NOT NULL,
  ALTER COLUMN "proofMimeType" DROP NOT NULL,
  ALTER COLUMN "proofSize" DROP NOT NULL,
  ALTER COLUMN "proofSha256" DROP NOT NULL,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "externalCheckoutId" TEXT,
  ADD COLUMN "externalPaymentId" TEXT;

CREATE UNIQUE INDEX "merchant_subscription_payments_externalCheckoutId_key"
  ON "merchant_subscription_payments"("externalCheckoutId");

CREATE TABLE "merchant_stripe_accounts" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "stripeAccountId" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "onboardingCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_stripe_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_stripe_accounts_merchantId_key" ON "merchant_stripe_accounts"("merchantId");
CREATE UNIQUE INDEX "merchant_stripe_accounts_stripeAccountId_key" ON "merchant_stripe_accounts"("stripeAccountId");
CREATE INDEX "merchant_stripe_accounts_chargesEnabled_payoutsEnabled_idx" ON "merchant_stripe_accounts"("chargesEnabled", "payoutsEnabled");
ALTER TABLE "merchant_stripe_accounts" ADD CONSTRAINT "merchant_stripe_accounts_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
