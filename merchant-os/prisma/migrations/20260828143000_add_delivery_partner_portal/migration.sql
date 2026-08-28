ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DELIVERY_PARTNER_OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DELIVERY_PARTNER_ADMIN';

CREATE TYPE "DeliveryPartnerAppStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'REJECTED');

ALTER TABLE "delivery_partners"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "logo" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "supportEmail" TEXT,
  ADD COLUMN "appName" TEXT,
  ADD COLUMN "appDescription" TEXT,
  ADD COLUMN "appIcon" TEXT,
  ADD COLUMN "appWebsite" TEXT,
  ADD COLUMN "privacyUrl" TEXT,
  ADD COLUMN "termsUrl" TEXT,
  ADD COLUMN "documentationUrl" TEXT,
  ADD COLUMN "appStatus" "DeliveryPartnerAppStatus" NOT NULL DEFAULT 'DRAFT';

CREATE TABLE "delivery_partner_users" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "isOwner" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_partner_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "merchant_delivery_partners" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_delivery_partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_partner_users_userId_partnerId_key" ON "delivery_partner_users"("userId", "partnerId");
CREATE INDEX "delivery_partner_users_partnerId_isActive_idx" ON "delivery_partner_users"("partnerId", "isActive");
CREATE UNIQUE INDEX "merchant_delivery_partners_merchantId_partnerId_key" ON "merchant_delivery_partners"("merchantId", "partnerId");
CREATE INDEX "merchant_delivery_partners_merchantId_isActive_idx" ON "merchant_delivery_partners"("merchantId", "isActive");
CREATE INDEX "merchant_delivery_partners_partnerId_isActive_idx" ON "merchant_delivery_partners"("partnerId", "isActive");

ALTER TABLE "delivery_partner_users" ADD CONSTRAINT "delivery_partner_users_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_partner_users" ADD CONSTRAINT "delivery_partner_users_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_delivery_partners" ADD CONSTRAINT "merchant_delivery_partners_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_delivery_partners" ADD CONSTRAINT "merchant_delivery_partners_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
