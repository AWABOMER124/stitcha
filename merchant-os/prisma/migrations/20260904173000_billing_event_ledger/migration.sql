CREATE TYPE "BillingWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

CREATE TABLE "merchant_subscription_events" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "actorId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadSha256" TEXT NOT NULL,
  "status" "BillingWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "errorMessage" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_webhook_events_provider_externalEventId_key"
ON "billing_webhook_events"("provider", "externalEventId");
CREATE INDEX "billing_webhook_events_status_receivedAt_idx"
ON "billing_webhook_events"("status", "receivedAt");
CREATE INDEX "merchant_subscription_events_merchantId_occurredAt_idx"
ON "merchant_subscription_events"("merchantId", "occurredAt");
CREATE INDEX "merchant_subscription_events_subscriptionId_occurredAt_idx"
ON "merchant_subscription_events"("subscriptionId", "occurredAt");

ALTER TABLE "merchant_subscription_events"
ADD CONSTRAINT "merchant_subscription_events_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_subscription_events"
ADD CONSTRAINT "merchant_subscription_events_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "merchant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
