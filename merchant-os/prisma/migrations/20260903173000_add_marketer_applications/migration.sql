CREATE TYPE "MarketerApplicationType" AS ENUM ('MERCHANT_ACQUISITION', 'STOREFRONT_PRODUCTS');
CREATE TYPE "MarketerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "marketer_applications" (
  "id" TEXT NOT NULL,
  "applicationKey" TEXT NOT NULL,
  "type" "MarketerApplicationType" NOT NULL,
  "merchantId" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "channels" TEXT[] NOT NULL,
  "experience" TEXT,
  "audienceSize" INTEGER,
  "portfolioUrl" TEXT,
  "notes" TEXT,
  "status" "MarketerApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "affiliateId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketer_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketer_applications_applicationKey_key" ON "marketer_applications"("applicationKey");
CREATE UNIQUE INDEX "marketer_applications_affiliateId_key" ON "marketer_applications"("affiliateId");
CREATE INDEX "marketer_applications_type_status_createdAt_idx" ON "marketer_applications"("type", "status", "createdAt");
CREATE INDEX "marketer_applications_merchantId_status_createdAt_idx" ON "marketer_applications"("merchantId", "status", "createdAt");
CREATE INDEX "marketer_applications_phone_idx" ON "marketer_applications"("phone");

ALTER TABLE "marketer_applications"
  ADD CONSTRAINT "marketer_applications_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketer_applications"
  ADD CONSTRAINT "marketer_applications_affiliateId_fkey"
  FOREIGN KEY ("affiliateId") REFERENCES "store_affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketer_applications"
  ADD CONSTRAINT "marketer_applications_target_check"
  CHECK (("type" = 'MERCHANT_ACQUISITION' AND "merchantId" IS NULL) OR ("type" = 'STOREFRONT_PRODUCTS' AND "merchantId" IS NOT NULL));

ALTER TABLE "marketer_applications"
  ADD CONSTRAINT "marketer_applications_audience_check"
  CHECK ("audienceSize" IS NULL OR "audienceSize" >= 0);
