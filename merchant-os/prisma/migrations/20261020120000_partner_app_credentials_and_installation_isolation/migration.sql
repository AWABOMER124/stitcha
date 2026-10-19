ALTER TABLE "merchant_delivery_partners"
  ADD COLUMN "scopes" JSONB,
  ADD COLUMN "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revokedAt" TIMESTAMP(3);

UPDATE "merchant_delivery_partners"
SET "scopes" = '["shipping.read_write"]'::jsonb
WHERE "isActive" = TRUE;

ALTER TABLE "delivery_partner_provider_configs"
  ADD COLUMN "integrationMode" TEXT NOT NULL DEFAULT 'LEGACY_HTTP',
  ADD COLUMN "clientId" TEXT,
  ADD COLUMN "clientSecretHash" TEXT,
  ADD COLUMN "outboundWebhookUrl" TEXT,
  ADD COLUMN "approvedOrigin" TEXT,
  ADD COLUMN "webhookSigningSecret" TEXT,
  ADD COLUMN "subscribedEvents" JSONB;

CREATE UNIQUE INDEX "delivery_partner_provider_configs_clientId_key"
  ON "delivery_partner_provider_configs"("clientId");

ALTER TABLE "platform_shipments" ADD COLUMN "installationId" TEXT;
CREATE INDEX "platform_shipments_installationId_status_idx"
  ON "platform_shipments"("installationId", "status");
ALTER TABLE "platform_shipments"
  ADD CONSTRAINT "platform_shipments_installationId_fkey"
  FOREIGN KEY ("installationId") REFERENCES "merchant_delivery_partners"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Safely link existing shipments to the unique merchant/partner installation.
UPDATE "platform_shipments" AS shipment
SET "installationId" = connection."id"
FROM "orders" AS customer_order
JOIN "merchant_delivery_partners" AS connection
  ON connection."merchantId" = customer_order."merchantId"
WHERE customer_order."id" = shipment."orderId"
  AND connection."partnerId" = shipment."partnerId";

CREATE TABLE "delivery_partner_api_events" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "delivery_partner_api_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_partner_api_events_partnerId_eventId_key" ON "delivery_partner_api_events"("partnerId", "eventId");
CREATE INDEX "delivery_partner_api_events_shipmentId_createdAt_idx" ON "delivery_partner_api_events"("shipmentId", "createdAt");
ALTER TABLE "delivery_partner_api_events" ADD CONSTRAINT "delivery_partner_api_events_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_partner_api_events" ADD CONSTRAINT "delivery_partner_api_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "platform_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
