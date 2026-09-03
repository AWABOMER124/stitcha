CREATE TYPE "StoreAffiliateStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "StoreAffiliateAttributionStatus" AS ENUM ('ATTRIBUTED', 'VOID');
CREATE TYPE "StoreAffiliateCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'REVERSED');

CREATE TABLE "store_affiliate_programs" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "attributionDays" INTEGER NOT NULL DEFAULT 30,
  "holdDays" INTEGER NOT NULL DEFAULT 14,
  "minimumPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'SDG',
  "terms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliate_programs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_programs_rate" CHECK ("commissionRate" >= 0 AND "commissionRate" <= 100),
  CONSTRAINT "store_affiliate_programs_attribution_days" CHECK ("attributionDays" BETWEEN 1 AND 90),
  CONSTRAINT "store_affiliate_programs_hold_days" CHECK ("holdDays" BETWEEN 0 AND 180),
  CONSTRAINT "store_affiliate_programs_minimum_payout" CHECK ("minimumPayout" >= 0),
  CONSTRAINT "store_affiliate_programs_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_programs_merchantId_key" ON "store_affiliate_programs"("merchantId");

CREATE TABLE "store_affiliates" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "code" TEXT NOT NULL,
  "status" "StoreAffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliates_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_affiliates_programId_fkey" FOREIGN KEY ("programId") REFERENCES "store_affiliate_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliates_merchantId_code_key" ON "store_affiliates"("merchantId", "code");
CREATE UNIQUE INDEX "store_affiliates_merchantId_phone_key" ON "store_affiliates"("merchantId", "phone");
CREATE INDEX "store_affiliates_merchantId_status_createdAt_idx" ON "store_affiliates"("merchantId", "status", "createdAt");

CREATE TABLE "store_affiliate_visits" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliate_visits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_visits_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_visits_programId_fkey" FOREIGN KEY ("programId") REFERENCES "store_affiliate_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_visits_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "store_affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_visits_tokenHash_key" ON "store_affiliate_visits"("tokenHash");
CREATE INDEX "store_affiliate_visits_merchantId_affiliateId_visitedAt_idx" ON "store_affiliate_visits"("merchantId", "affiliateId", "visitedAt");
CREATE INDEX "store_affiliate_visits_expiresAt_idx" ON "store_affiliate_visits"("expiresAt");

CREATE TABLE "store_affiliate_attributions" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "visitId" TEXT,
  "orderId" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL,
  "commissionRateSnapshot" DECIMAL(5,2) NOT NULL,
  "baseAmount" DECIMAL(12,2) NOT NULL,
  "currencySnapshot" TEXT NOT NULL,
  "holdDaysSnapshot" INTEGER NOT NULL,
  "status" "StoreAffiliateAttributionStatus" NOT NULL DEFAULT 'ATTRIBUTED',
  "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliate_attributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_attributions_rate" CHECK ("commissionRateSnapshot" >= 0 AND "commissionRateSnapshot" <= 100),
  CONSTRAINT "store_affiliate_attributions_base" CHECK ("baseAmount" >= 0),
  CONSTRAINT "store_affiliate_attributions_hold_days" CHECK ("holdDaysSnapshot" BETWEEN 0 AND 180),
  CONSTRAINT "store_affiliate_attributions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_attributions_programId_fkey" FOREIGN KEY ("programId") REFERENCES "store_affiliate_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_attributions_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "store_affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_attributions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "store_affiliate_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_attributions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_attributions_orderId_key" ON "store_affiliate_attributions"("orderId");
CREATE INDEX "store_affiliate_attributions_merchantId_affiliateId_status_attributedAt_idx" ON "store_affiliate_attributions"("merchantId", "affiliateId", "status", "attributedAt");
CREATE INDEX "store_affiliate_attributions_visitId_idx" ON "store_affiliate_attributions"("visitId");

CREATE TABLE "store_affiliate_commissions" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "attributionId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "StoreAffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
  "holdUntil" TIMESTAMP(3) NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "paymentRef" TEXT,
  "reversedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_affiliate_commissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_affiliate_commissions_amount" CHECK ("amount" >= 0),
  CONSTRAINT "store_affiliate_commissions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_commissions_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "store_affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_commissions_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "store_affiliate_attributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "store_affiliate_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "store_affiliate_commissions_attributionId_key" ON "store_affiliate_commissions"("attributionId");
CREATE UNIQUE INDEX "store_affiliate_commissions_orderId_key" ON "store_affiliate_commissions"("orderId");
CREATE INDEX "store_affiliate_commissions_merchantId_status_holdUntil_idx" ON "store_affiliate_commissions"("merchantId", "status", "holdUntil");
CREATE INDEX "store_affiliate_commissions_affiliateId_status_createdAt_idx" ON "store_affiliate_commissions"("affiliateId", "status", "createdAt");
