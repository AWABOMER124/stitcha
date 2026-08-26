CREATE TYPE "ManualPaymentChannel" AS ENUM ('BANKAK', 'MYCASHY', 'OTHER');
CREATE TYPE "ManualPaymentReviewStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED');

CREATE TABLE "platform_payment_accounts" (
    "id" TEXT NOT NULL,
    "channel" "ManualPaymentChannel" NOT NULL,
    "label" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "instructions" TEXT,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SDG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_payment_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "merchant_subscription_payments" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "targetPlanId" TEXT NOT NULL,
    "planChangeRequestId" TEXT,
    "paymentAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "channel" "ManualPaymentChannel" NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "senderName" TEXT,
    "transferredAt" TIMESTAMP(3),
    "proofStorageKey" TEXT NOT NULL,
    "proofMimeType" TEXT NOT NULL,
    "proofSize" INTEGER NOT NULL,
    "proofSha256" TEXT NOT NULL,
    "status" "ManualPaymentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "merchant_subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_payment_accounts_isActive_sortOrder_idx" ON "platform_payment_accounts"("isActive", "sortOrder");
CREATE UNIQUE INDEX "merchant_subscription_payments_paymentAccountId_transactionRef_key" ON "merchant_subscription_payments"("paymentAccountId", "transactionRef");
CREATE UNIQUE INDEX "merchant_subscription_payments_merchantId_proofSha256_key" ON "merchant_subscription_payments"("merchantId", "proofSha256");
CREATE INDEX "merchant_subscription_payments_merchantId_status_createdAt_idx" ON "merchant_subscription_payments"("merchantId", "status", "createdAt");
CREATE INDEX "merchant_subscription_payments_status_createdAt_idx" ON "merchant_subscription_payments"("status", "createdAt");

-- Preserve the one-open-payment business rule under concurrent submissions.
CREATE UNIQUE INDEX "merchant_subscription_payments_one_open_per_merchant"
ON "merchant_subscription_payments"("merchantId")
WHERE "status" IN ('PENDING', 'VERIFIED');

ALTER TABLE "merchant_subscription_payments" ADD CONSTRAINT "merchant_subscription_payments_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_subscription_payments" ADD CONSTRAINT "merchant_subscription_payments_targetPlanId_fkey" FOREIGN KEY ("targetPlanId") REFERENCES "merchant_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merchant_subscription_payments" ADD CONSTRAINT "merchant_subscription_payments_planChangeRequestId_fkey" FOREIGN KEY ("planChangeRequestId") REFERENCES "merchant_plan_change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "merchant_subscription_payments" ADD CONSTRAINT "merchant_subscription_payments_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "platform_payment_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
