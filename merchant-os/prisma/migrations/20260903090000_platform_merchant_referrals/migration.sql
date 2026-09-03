CREATE TYPE "MerchantReferralStatus" AS ENUM ('REGISTERED', 'ACTIVATED', 'QUALIFIED', 'REJECTED');
CREATE TYPE "ReferralQualificationRule" AS ENUM ('FIRST_DELIVERED_ORDER', 'FIRST_PAID_PRO');
CREATE TYPE "ReferralRewardType" AS ENUM ('PRO_DAYS', 'AI_CREDITS', 'ACCOUNT_CREDIT', 'CASH');
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'APPROVED', 'FULFILLED', 'REVERSED', 'REJECTED');

CREATE TABLE "platform_referral_programs" (
  "id" TEXT NOT NULL DEFAULT 'merchant-growth',
  "name" TEXT NOT NULL DEFAULT 'برنامج إحالة تجار وصلة',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "qualificationRule" "ReferralQualificationRule" NOT NULL DEFAULT 'FIRST_PAID_PRO',
  "rewardType" "ReferralRewardType" NOT NULL DEFAULT 'PRO_DAYS',
  "rewardValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT,
  "holdDays" INTEGER NOT NULL DEFAULT 30,
  "terms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_referral_programs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_referral_program_reward_nonnegative" CHECK ("rewardValue" >= 0),
  CONSTRAINT "platform_referral_program_hold_days" CHECK ("holdDays" BETWEEN 0 AND 180)
);

INSERT INTO "platform_referral_programs" (
  "id", "name", "isActive", "qualificationRule", "rewardType", "rewardValue", "holdDays", "updatedAt"
) VALUES (
  'merchant-growth', 'برنامج إحالة تجار وصلة', false, 'FIRST_PAID_PRO', 'PRO_DAYS', 0, 30, CURRENT_TIMESTAMP
);

CREATE TABLE "merchant_referral_codes" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_referral_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_referral_codes_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "merchant_referral_codes_merchantId_key" ON "merchant_referral_codes"("merchantId");
CREATE UNIQUE INDEX "merchant_referral_codes_code_key" ON "merchant_referral_codes"("code");
CREATE INDEX "merchant_referral_codes_code_isActive_idx" ON "merchant_referral_codes"("code", "isActive");

CREATE TABLE "merchant_referrals" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "referralCodeId" TEXT NOT NULL,
  "referrerMerchantId" TEXT NOT NULL,
  "referredMerchantId" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL,
  "qualificationRuleSnapshot" "ReferralQualificationRule" NOT NULL,
  "rewardTypeSnapshot" "ReferralRewardType" NOT NULL,
  "rewardValueSnapshot" DECIMAL(12,2) NOT NULL,
  "currencySnapshot" TEXT,
  "holdDaysSnapshot" INTEGER NOT NULL,
  "identityFingerprint" TEXT NOT NULL,
  "status" "MerchantReferralStatus" NOT NULL DEFAULT 'REGISTERED',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "qualifiedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_referrals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_referrals_programId_fkey" FOREIGN KEY ("programId") REFERENCES "platform_referral_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referrals_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "merchant_referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referrals_referrerMerchantId_fkey" FOREIGN KEY ("referrerMerchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referrals_referredMerchantId_fkey" FOREIGN KEY ("referredMerchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referrals_no_self_referral" CHECK ("referrerMerchantId" <> "referredMerchantId"),
  CONSTRAINT "merchant_referrals_reward_nonnegative" CHECK ("rewardValueSnapshot" >= 0),
  CONSTRAINT "merchant_referrals_hold_days" CHECK ("holdDaysSnapshot" BETWEEN 0 AND 180)
);

CREATE UNIQUE INDEX "merchant_referrals_referredMerchantId_key" ON "merchant_referrals"("referredMerchantId");
CREATE INDEX "merchant_referrals_referrerMerchantId_status_registeredAt_idx" ON "merchant_referrals"("referrerMerchantId", "status", "registeredAt");
CREATE INDEX "merchant_referrals_programId_status_registeredAt_idx" ON "merchant_referrals"("programId", "status", "registeredAt");
CREATE INDEX "merchant_referrals_identityFingerprint_idx" ON "merchant_referrals"("identityFingerprint");

CREATE TABLE "merchant_referral_rewards" (
  "id" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "referrerMerchantId" TEXT NOT NULL,
  "type" "ReferralRewardType" NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "currency" TEXT,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "holdUntil" TIMESTAMP(3) NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "fulfillmentRef" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_referral_rewards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merchant_referral_rewards_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "merchant_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referral_rewards_referrerMerchantId_fkey" FOREIGN KEY ("referrerMerchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "merchant_referral_rewards_value_nonnegative" CHECK ("value" >= 0)
);

CREATE UNIQUE INDEX "merchant_referral_rewards_referralId_key" ON "merchant_referral_rewards"("referralId");
CREATE INDEX "merchant_referral_rewards_referrerMerchantId_status_holdUntil_idx" ON "merchant_referral_rewards"("referrerMerchantId", "status", "holdUntil");
CREATE INDEX "merchant_referral_rewards_status_holdUntil_idx" ON "merchant_referral_rewards"("status", "holdUntil");
