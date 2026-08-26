CREATE TYPE "MerchantPlanChangeRequestStatus" AS ENUM (
  'PENDING', 'CONTACTED', 'COMPLETED', 'REJECTED', 'CANCELLED'
);

CREATE TABLE "merchant_plan_change_requests" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "targetPlanId" TEXT NOT NULL,
    "requestKey" TEXT,
    "status" "MerchantPlanChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "merchant_plan_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_plan_change_requests_requestKey_key"
ON "merchant_plan_change_requests"("requestKey");
CREATE INDEX "merchant_plan_change_requests_merchantId_status_idx"
ON "merchant_plan_change_requests"("merchantId", "status");
CREATE INDEX "merchant_plan_change_requests_status_createdAt_idx"
ON "merchant_plan_change_requests"("status", "createdAt");

ALTER TABLE "merchant_plan_change_requests"
ADD CONSTRAINT "merchant_plan_change_requests_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "merchant_plan_change_requests"
ADD CONSTRAINT "merchant_plan_change_requests_targetPlanId_fkey"
FOREIGN KEY ("targetPlanId") REFERENCES "merchant_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
