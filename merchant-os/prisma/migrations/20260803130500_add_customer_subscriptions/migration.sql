-- CreateEnum
CREATE TYPE "CustomerSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "customer_subscriptions" (
    "id" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE_DELIVERY',
    "status" "CustomerSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "grantedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_subscriptions_customerAccountId_idx" ON "customer_subscriptions"("customerAccountId");

-- CreateIndex
CREATE INDEX "customer_subscriptions_startsAt_endsAt_idx" ON "customer_subscriptions"("startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
