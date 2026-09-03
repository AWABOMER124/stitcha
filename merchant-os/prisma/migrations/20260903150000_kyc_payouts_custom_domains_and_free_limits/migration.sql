CREATE TYPE "IdentityDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT');
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "IdentityDocumentSide" AS ENUM ('FRONT', 'BACK');
CREATE TYPE "PayoutMethod" AS ENUM ('BANK_ACCOUNT', 'BANKAK', 'MYCASHY', 'OTHER');
CREATE TYPE "MerchantDomainStatus" AS ENUM ('PENDING_DNS', 'VERIFIED', 'ACTIVE', 'REJECTED', 'DISABLED');

ALTER TABLE "store_affiliates"
  ADD COLUMN "onboardingTokenHash" TEXT,
  ADD COLUMN "onboardingTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "store_affiliates_onboardingTokenHash_key" ON "store_affiliates"("onboardingTokenHash");

ALTER TABLE "platform_referral_programs"
  ADD COLUMN "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
  ADD COLUMN "commissionMonths" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "minimumPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "platform_referral_programs_commission_rate" CHECK ("commissionRate" > 0 AND "commissionRate" <= 100),
  ADD CONSTRAINT "platform_referral_programs_commission_months" CHECK ("commissionMonths" BETWEEN 1 AND 24),
  ADD CONSTRAINT "platform_referral_programs_minimum_payout" CHECK ("minimumPayout" >= 0);

ALTER TABLE "merchant_referrals"
  ADD COLUMN "commissionRateSnapshot" DECIMAL(5,2) NOT NULL DEFAULT 20,
  ADD COLUMN "commissionMonthsSnapshot" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "minimumPayoutSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "merchant_referrals_commission_rate" CHECK ("commissionRateSnapshot" > 0 AND "commissionRateSnapshot" <= 100),
  ADD CONSTRAINT "merchant_referrals_commission_months" CHECK ("commissionMonthsSnapshot" BETWEEN 1 AND 24),
  ADD CONSTRAINT "merchant_referrals_minimum_payout" CHECK ("minimumPayoutSnapshot" >= 0);

CREATE TABLE "merchant_referral_commissions" (
  "id" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "referrerMerchantId" TEXT NOT NULL,
  "subscriptionPaymentId" TEXT NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL,
  "commissionRate" DECIMAL(5,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "minimumPayoutSnapshot" DECIMAL(12,2) NOT NULL,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "holdUntil" TIMESTAMP(3) NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "fulfillmentRef" TEXT,
  "reversedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_referral_commissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_referral_commissions_amounts" CHECK ("grossAmount" > 0 AND "amount" > 0),
  CONSTRAINT "merchant_referral_commissions_rate" CHECK ("commissionRate" > 0 AND "commissionRate" <= 100),
  CONSTRAINT "merchant_referral_commissions_minimum_payout" CHECK ("minimumPayoutSnapshot" >= 0),
  CONSTRAINT "merchant_referral_commissions_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "merchant_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referral_commissions_referrerMerchantId_fkey" FOREIGN KEY ("referrerMerchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referral_commissions_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "merchant_subscription_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "merchant_referral_commissions_subscriptionPaymentId_key" ON "merchant_referral_commissions"("subscriptionPaymentId");
CREATE INDEX "merchant_referral_commissions_referrerMerchantId_status_holdUntil_idx" ON "merchant_referral_commissions"("referrerMerchantId", "status", "holdUntil");
CREATE INDEX "merchant_referral_commissions_referralId_createdAt_idx" ON "merchant_referral_commissions"("referralId", "createdAt");

UPDATE "platform_referral_programs"
SET "qualificationRule" = 'FIRST_PAID_PRO',
    "rewardType" = 'CASH',
    "commissionRate" = 20,
    "commissionMonths" = 12,
    "holdDays" = 30;

CREATE TABLE "merchant_identity_verifications" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "documentType" "IdentityDocumentType" NOT NULL,
  "documentNumberEncrypted" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_identity_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_identity_verifications_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "merchant_identity_verifications_merchantId_key" ON "merchant_identity_verifications"("merchantId");
CREATE INDEX "merchant_identity_verifications_status_submittedAt_idx" ON "merchant_identity_verifications"("status", "submittedAt");

CREATE TABLE "merchant_identity_documents" (
  "id" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "side" "IdentityDocumentSide" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_identity_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_identity_documents_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "merchant_identity_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "merchant_identity_documents_storageKey_key" ON "merchant_identity_documents"("storageKey");
CREATE UNIQUE INDEX "merchant_identity_documents_verificationId_side_key" ON "merchant_identity_documents"("verificationId", "side");
CREATE INDEX "merchant_identity_documents_verificationId_idx" ON "merchant_identity_documents"("verificationId");

CREATE TABLE "store_affiliate_identity_verifications" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "documentType" "IdentityDocumentType" NOT NULL,
  "documentNumberEncrypted" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliate_identity_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_identity_verifications_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_identity_verifications_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "store_affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_identity_verifications_affiliateId_key" ON "store_affiliate_identity_verifications"("affiliateId");
CREATE INDEX "store_affiliate_identity_verifications_merchantId_status_submittedAt_idx" ON "store_affiliate_identity_verifications"("merchantId", "status", "submittedAt");
CREATE INDEX "store_affiliate_identity_verifications_status_submittedAt_idx" ON "store_affiliate_identity_verifications"("status", "submittedAt");

CREATE TABLE "store_affiliate_identity_documents" (
  "id" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "side" "IdentityDocumentSide" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_affiliate_identity_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_identity_documents_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "store_affiliate_identity_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_identity_documents_storageKey_key" ON "store_affiliate_identity_documents"("storageKey");
CREATE UNIQUE INDEX "store_affiliate_identity_documents_verificationId_side_key" ON "store_affiliate_identity_documents"("verificationId", "side");
CREATE INDEX "store_affiliate_identity_documents_verificationId_idx" ON "store_affiliate_identity_documents"("verificationId");

CREATE TABLE "merchant_referral_payout_profiles" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "method" "PayoutMethod" NOT NULL,
  "bankName" TEXT,
  "accountNameEncrypted" TEXT NOT NULL,
  "accountNumberEncrypted" TEXT NOT NULL,
  "ibanEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_referral_payout_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_referral_payout_profiles_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "merchant_referral_payout_profiles_merchantId_key" ON "merchant_referral_payout_profiles"("merchantId");

CREATE TABLE "store_affiliate_payout_profiles" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "method" "PayoutMethod" NOT NULL,
  "bankName" TEXT,
  "accountNameEncrypted" TEXT NOT NULL,
  "accountNumberEncrypted" TEXT NOT NULL,
  "ibanEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliate_payout_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_payout_profiles_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_payout_profiles_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "store_affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_payout_profiles_affiliateId_key" ON "store_affiliate_payout_profiles"("affiliateId");
CREATE INDEX "store_affiliate_payout_profiles_merchantId_idx" ON "store_affiliate_payout_profiles"("merchantId");

CREATE TABLE "merchant_domains" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "verificationToken" TEXT NOT NULL,
  "status" "MerchantDomainStatus" NOT NULL DEFAULT 'PENDING_DNS',
  "dnsVerifiedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_domains_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_domains_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "merchant_domains_hostname_key" ON "merchant_domains"("hostname");
CREATE UNIQUE INDEX "merchant_domains_merchantId_key" ON "merchant_domains"("merchantId");
CREATE INDEX "merchant_domains_merchantId_status_idx" ON "merchant_domains"("merchantId", "status");
CREATE INDEX "merchant_domains_status_createdAt_idx" ON "merchant_domains"("status", "createdAt");

-- FREE remains a viable launch plan, but paid-cost and advanced capabilities
-- are explicitly disabled. The application enforces these values server-side.
UPDATE "merchant_plans"
SET "entitlements" = "entitlements" || '{"maxActiveProducts":20,"maxStaffUsers":1,"maxBranches":1,"customDomain":false,"removeBranding":false,"advancedAnalytics":false,"crmAutomation":false,"dataExport":false,"apiAccess":false,"aiMonthlyCredits":0,"whatsappAiAgent":false}'::jsonb
WHERE "code" = 'FREE';

UPDATE "merchant_plans"
SET "entitlements" = "entitlements" || '{"customDomain":true,"removeBranding":true,"advancedAnalytics":true,"crmAutomation":true,"dataExport":true,"apiAccess":true,"whatsappAiAgent":true}'::jsonb
WHERE "code" = 'PRO';
