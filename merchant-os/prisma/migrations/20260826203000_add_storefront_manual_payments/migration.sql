ALTER TYPE "PaymentMethod" ADD VALUE 'MANUAL_TRANSFER';

CREATE TABLE "merchant_payment_accounts" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "channel" "ManualPaymentChannel" NOT NULL,
    "label" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "merchant_payment_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_payment_proofs" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "merchantPaymentAccountId" TEXT,
    "channel" "ManualPaymentChannel" NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
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
    CONSTRAINT "order_payment_proofs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "merchant_payment_accounts_merchantId_isActive_sortOrder_idx" ON "merchant_payment_accounts"("merchantId", "isActive", "sortOrder");
CREATE UNIQUE INDEX "order_payment_proofs_paymentId_key" ON "order_payment_proofs"("paymentId");
CREATE UNIQUE INDEX "order_payment_proofs_merchantPaymentAccountId_transactionRef_key" ON "order_payment_proofs"("merchantPaymentAccountId", "transactionRef");
CREATE UNIQUE INDEX "order_payment_proofs_merchantId_proofSha256_key" ON "order_payment_proofs"("merchantId", "proofSha256");
CREATE INDEX "order_payment_proofs_merchantId_status_createdAt_idx" ON "order_payment_proofs"("merchantId", "status", "createdAt");

ALTER TABLE "merchant_payment_accounts" ADD CONSTRAINT "merchant_payment_accounts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payment_proofs" ADD CONSTRAINT "order_payment_proofs_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payment_proofs" ADD CONSTRAINT "order_payment_proofs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payment_proofs" ADD CONSTRAINT "order_payment_proofs_merchantPaymentAccountId_fkey" FOREIGN KEY ("merchantPaymentAccountId") REFERENCES "merchant_payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
