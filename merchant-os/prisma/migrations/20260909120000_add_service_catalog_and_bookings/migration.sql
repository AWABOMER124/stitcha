-- Extend the shared catalog without changing any existing product behaviour.
CREATE TYPE "CatalogItemType" AS ENUM ('PRODUCT', 'SERVICE');
CREATE TYPE "ServiceFulfillmentType" AS ENUM ('AT_BRANCH', 'AT_CUSTOMER_LOCATION', 'ONLINE', 'REQUEST_ONLY');
CREATE TYPE "ServiceBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

ALTER TABLE "products" ADD COLUMN "itemType" "CatalogItemType" NOT NULL DEFAULT 'PRODUCT';

CREATE TABLE "service_profiles" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  "bookingRequired" BOOLEAN NOT NULL DEFAULT true,
  "fulfillmentType" "ServiceFulfillmentType" NOT NULL DEFAULT 'AT_BRANCH',
  "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 120,
  "maxParticipants" INTEGER NOT NULL DEFAULT 1,
  "advancePaymentPercent" INTEGER NOT NULL DEFAULT 0,
  "cancellationPolicy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "service_profiles_productId_key" ON "service_profiles"("productId");
ALTER TABLE "service_profiles" ADD CONSTRAINT "service_profiles_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_availability_windows" (
  "id" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "branchId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_availability_windows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_availability_windows_serviceProfileId_dayOfWeek_idx" ON "service_availability_windows"("serviceProfileId", "dayOfWeek");
CREATE INDEX "service_availability_windows_branchId_idx" ON "service_availability_windows"("branchId");
ALTER TABLE "service_availability_windows" ADD CONSTRAINT "service_availability_windows_serviceProfileId_fkey"
  FOREIGN KEY ("serviceProfileId") REFERENCES "service_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_availability_windows" ADD CONSTRAINT "service_availability_windows_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "service_bookings" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "orderId" TEXT,
  "customerId" TEXT NOT NULL,
  "branchId" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "status" "ServiceBookingStatus" NOT NULL DEFAULT 'PENDING',
  "participantCount" INTEGER NOT NULL DEFAULT 1,
  "customerNote" TEXT,
  "internalNote" TEXT,
  "fulfillmentSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "service_bookings_orderId_key" ON "service_bookings"("orderId");
CREATE INDEX "service_bookings_merchantId_status_startsAt_idx" ON "service_bookings"("merchantId", "status", "startsAt");
CREATE INDEX "service_bookings_serviceProfileId_startsAt_idx" ON "service_bookings"("serviceProfileId", "startsAt");
CREATE INDEX "service_bookings_customerId_idx" ON "service_bookings"("customerId");
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_serviceProfileId_fkey"
  FOREIGN KEY ("serviceProfileId") REFERENCES "service_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
