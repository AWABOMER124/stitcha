ALTER TABLE "marketer_accounts" ADD COLUMN "acquisitionCode" TEXT;
UPDATE "marketer_accounts" SET "acquisitionCode" = 'MK-' || upper(substr(md5("id"), 1, 10)) WHERE "acquisitionCode" IS NULL;
ALTER TABLE "marketer_accounts" ALTER COLUMN "acquisitionCode" SET NOT NULL;
CREATE UNIQUE INDEX "marketer_accounts_acquisitionCode_key" ON "marketer_accounts"("acquisitionCode");

CREATE TABLE "marketer_merchant_referrals" (
  "id" TEXT NOT NULL, "programId" TEXT NOT NULL, "marketerAccountId" TEXT NOT NULL, "referredMerchantId" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL, "identityFingerprint" TEXT NOT NULL, "status" "MerchantReferralStatus" NOT NULL DEFAULT 'REGISTERED',
  "holdDaysSnapshot" INTEGER NOT NULL, "commissionRateSnapshot" DECIMAL(5,2) NOT NULL, "commissionMonthsSnapshot" INTEGER NOT NULL,
  "minimumPayoutSnapshot" DECIMAL(12,2) NOT NULL, "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3), "qualifiedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3), "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketer_merchant_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketer_merchant_referrals_referredMerchantId_key" ON "marketer_merchant_referrals"("referredMerchantId");
CREATE INDEX "marketer_merchant_referrals_marketerAccountId_status_registeredAt_idx" ON "marketer_merchant_referrals"("marketerAccountId", "status", "registeredAt");
CREATE INDEX "marketer_merchant_referrals_programId_status_registeredAt_idx" ON "marketer_merchant_referrals"("programId", "status", "registeredAt");
CREATE INDEX "marketer_merchant_referrals_identityFingerprint_idx" ON "marketer_merchant_referrals"("identityFingerprint");
ALTER TABLE "marketer_merchant_referrals" ADD CONSTRAINT "marketer_merchant_referrals_programId_fkey" FOREIGN KEY ("programId") REFERENCES "platform_referral_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketer_merchant_referrals" ADD CONSTRAINT "marketer_merchant_referrals_marketerAccountId_fkey" FOREIGN KEY ("marketerAccountId") REFERENCES "marketer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketer_merchant_referrals" ADD CONSTRAINT "marketer_merchant_referrals_referredMerchantId_fkey" FOREIGN KEY ("referredMerchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "marketer_subscription_commissions" (
  "id" TEXT NOT NULL, "referralId" TEXT NOT NULL, "marketerAccountId" TEXT NOT NULL, "subscriptionPaymentId" TEXT NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL, "commissionRate" DECIMAL(5,2) NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL, "minimumPayoutSnapshot" DECIMAL(12,2) NOT NULL, "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "holdUntil" TIMESTAMP(3) NOT NULL, "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3), "fulfilledAt" TIMESTAMP(3), "fulfillmentRef" TEXT,
  "reversedAt" TIMESTAMP(3), "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketer_subscription_commissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketer_subscription_commissions_subscriptionPaymentId_key" ON "marketer_subscription_commissions"("subscriptionPaymentId");
CREATE INDEX "marketer_subscription_commissions_marketerAccountId_status_holdUntil_idx" ON "marketer_subscription_commissions"("marketerAccountId", "status", "holdUntil");
CREATE INDEX "marketer_subscription_commissions_referralId_createdAt_idx" ON "marketer_subscription_commissions"("referralId", "createdAt");
ALTER TABLE "marketer_subscription_commissions" ADD CONSTRAINT "marketer_subscription_commissions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "marketer_merchant_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketer_subscription_commissions" ADD CONSTRAINT "marketer_subscription_commissions_marketerAccountId_fkey" FOREIGN KEY ("marketerAccountId") REFERENCES "marketer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketer_subscription_commissions" ADD CONSTRAINT "marketer_subscription_commissions_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "merchant_subscription_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
