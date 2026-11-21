-- AlterEnum
ALTER TYPE "ManualPaymentReviewStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "delivery_partner_provider_configs" ADD COLUMN     "market" TEXT NOT NULL DEFAULT 'SD';

-- AlterTable
ALTER TABLE "platform_shipments" ADD COLUMN     "collectionFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "feePayer" TEXT NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN     "pricingPolicy" TEXT;

-- AlterTable
ALTER TABLE "platform_return_shipments" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'SDG',
ADD COLUMN     "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "feePayer" TEXT NOT NULL DEFAULT 'CARRIER_QUOTE';

-- AlterTable
ALTER TABLE "merchant_settlement_entries" ADD COLUMN     "feeReconciled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payoutBlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "paymob_settings" (
    "id" TEXT NOT NULL DEFAULT 'SA',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'TEST',
    "publicKey" TEXT,
    "secretKeyEncrypted" TEXT,
    "apiKeyEncrypted" TEXT,
    "hmacEncrypted" TEXT,
    "integrationIds" JSONB NOT NULL DEFAULT '[]',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymob_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_checkout_attempts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "providerIntentionId" TEXT,
    "providerOrderId" TEXT,
    "providerTransactionId" TEXT,
    "checkoutSecretEncrypted" TEXT,
    "integrationIds" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "refundedMinor" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "online_checkout_attempts_providerIntentionId_key" ON "online_checkout_attempts"("providerIntentionId");

-- CreateIndex
CREATE UNIQUE INDEX "online_checkout_attempts_providerOrderId_key" ON "online_checkout_attempts"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "online_checkout_attempts_providerTransactionId_key" ON "online_checkout_attempts"("providerTransactionId");

-- CreateIndex
CREATE INDEX "online_checkout_attempts_merchantId_createdAt_idx" ON "online_checkout_attempts"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "online_checkout_attempts_provider_status_createdAt_idx" ON "online_checkout_attempts"("provider", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "online_checkout_attempts_provider_purpose_referenceId_key" ON "online_checkout_attempts"("provider", "purpose", "referenceId");
