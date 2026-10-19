-- Central Stripe collection with weekly merchant settlements.

CREATE TYPE "MerchantSettlementEntryType" AS ENUM ('ONLINE_PAYMENT', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "MerchantSettlementEntryStatus" AS ENUM ('HELD', 'AVAILABLE', 'SETTLED');

ALTER TABLE "platform_billing_settings"
  ADD COLUMN "onlinePaymentCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "onlineSettlementHoldDays" INTEGER NOT NULL DEFAULT 7,
  ADD CONSTRAINT "platform_billing_settings_onlinePaymentCommissionRate_check"
    CHECK ("onlinePaymentCommissionRate" >= 0 AND "onlinePaymentCommissionRate" <= 100),
  ADD CONSTRAINT "platform_billing_settings_onlineSettlementHoldDays_check"
    CHECK ("onlineSettlementHoldDays" >= 0 AND "onlineSettlementHoldDays" <= 90);

CREATE TABLE "merchant_settlement_batches" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "grossAmount" DECIMAL(14,2) NOT NULL,
  "processingFees" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "platformFees" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "totalPayments" INTEGER NOT NULL DEFAULT 0,
  "totalRefunds" INTEGER NOT NULL DEFAULT 0,
  "payoutMethod" TEXT,
  "payoutReference" TEXT,
  "notes" TEXT,
  "paidAt" TIMESTAMP(3),
  "paidById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_settlement_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_settlement_batches_period_check" CHECK ("periodTo" > "periodFrom")
);

CREATE TABLE "merchant_settlement_entries" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentId" TEXT,
  "settlementBatchId" TEXT,
  "type" "MerchantSettlementEntryType" NOT NULL,
  "status" "MerchantSettlementEntryStatus" NOT NULL DEFAULT 'HELD',
  "grossAmount" DECIMAL(14,2) NOT NULL,
  "processingFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "platformFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "providerReference" TEXT NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL,
  "settledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_settlement_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_settlement_entries_providerReference_key" ON "merchant_settlement_entries"("providerReference");
CREATE INDEX "merchant_settlement_entries_merchantId_status_availableAt_idx" ON "merchant_settlement_entries"("merchantId", "status", "availableAt");
CREATE INDEX "merchant_settlement_entries_settlementBatchId_idx" ON "merchant_settlement_entries"("settlementBatchId");
CREATE INDEX "merchant_settlement_entries_orderId_idx" ON "merchant_settlement_entries"("orderId");
CREATE UNIQUE INDEX "merchant_settlement_batches_merchantId_currency_periodFrom_periodTo_key" ON "merchant_settlement_batches"("merchantId", "currency", "periodFrom", "periodTo");
CREATE INDEX "merchant_settlement_batches_status_periodTo_idx" ON "merchant_settlement_batches"("status", "periodTo");
CREATE INDEX "merchant_settlement_batches_merchantId_createdAt_idx" ON "merchant_settlement_batches"("merchantId", "createdAt");

ALTER TABLE "merchant_settlement_entries" ADD CONSTRAINT "merchant_settlement_entries_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_settlement_entries" ADD CONSTRAINT "merchant_settlement_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "merchant_settlement_entries" ADD CONSTRAINT "merchant_settlement_entries_settlementBatchId_fkey" FOREIGN KEY ("settlementBatchId") REFERENCES "merchant_settlement_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "merchant_settlement_batches" ADD CONSTRAINT "merchant_settlement_batches_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
