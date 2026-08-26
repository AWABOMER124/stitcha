CREATE TYPE "DeliveryQuoteStatus" AS ENUM ('OFFERED','ACCEPTED','EXPIRED','CANCELLED');
CREATE TYPE "PlatformShipmentStatus" AS ENUM ('REQUESTED','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED','FAILED','CANCELLED');
CREATE TYPE "CodCollectionStatus" AS ENUM ('PENDING','COLLECTED','REMITTED','DISPUTED','WRITTEN_OFF');

CREATE TABLE "delivery_quotes" (
 "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "partnerId" TEXT NOT NULL, "pricingRuleId" TEXT,
 "status" "DeliveryQuoteStatus" NOT NULL DEFAULT 'OFFERED', "distanceKm" DOUBLE PRECISION NOT NULL,
 "fee" DECIMAL(10,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'SDG', "etaMinutesMin" INTEGER,
 "etaMinutesMax" INTEGER, "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "delivery_quotes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "platform_shipments" (
 "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "quoteId" TEXT, "partnerId" TEXT NOT NULL, "courierId" TEXT,
 "trackingCode" TEXT NOT NULL, "providerReference" TEXT, "status" "PlatformShipmentStatus" NOT NULL DEFAULT 'REQUESTED',
 "fee" DECIMAL(10,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'SDG', "assignedAt" TIMESTAMP(3),
 "pickedUpAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "platform_shipments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "delivery_events" (
 "id" TEXT NOT NULL, "shipmentId" TEXT NOT NULL, "status" "PlatformShipmentStatus" NOT NULL, "note" TEXT,
 "actorType" TEXT, "actorId" TEXT, "metadata" JSONB, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "platform_proofs_of_delivery" (
 "id" TEXT NOT NULL, "shipmentId" TEXT NOT NULL, "courierId" TEXT, "recipientName" TEXT, "photoUrl" TEXT,
 "signatureUrl" TEXT, "otpVerified" BOOLEAN NOT NULL DEFAULT false, "notes" TEXT, "lat" DOUBLE PRECISION,
 "lng" DOUBLE PRECISION, "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "platform_proofs_of_delivery_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "cod_collections" (
 "id" TEXT NOT NULL, "shipmentId" TEXT NOT NULL, "status" "CodCollectionStatus" NOT NULL DEFAULT 'PENDING',
 "expectedAmount" DECIMAL(10,2) NOT NULL, "collectedAmount" DECIMAL(10,2), "remittedAmount" DECIMAL(10,2),
 "currency" TEXT NOT NULL DEFAULT 'SDG', "collectedAt" TIMESTAMP(3), "remittedAt" TIMESTAMP(3), "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "cod_collections_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "delivery_partner_settlements" (
 "id" TEXT NOT NULL, "partnerId" TEXT NOT NULL, "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
 "periodFrom" TIMESTAMP(3) NOT NULL, "periodTo" TIMESTAMP(3) NOT NULL, "shipmentCount" INTEGER NOT NULL DEFAULT 0,
 "deliveryFees" DECIMAL(12,2) NOT NULL DEFAULT 0, "codCollected" DECIMAL(12,2) NOT NULL DEFAULT 0,
 "codRemitted" DECIMAL(12,2) NOT NULL DEFAULT 0, "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
 "currency" TEXT NOT NULL DEFAULT 'SDG', "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "delivery_partner_settlements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_quotes_orderId_status_idx" ON "delivery_quotes"("orderId","status");
CREATE INDEX "delivery_quotes_partnerId_expiresAt_idx" ON "delivery_quotes"("partnerId","expiresAt");
CREATE UNIQUE INDEX "platform_shipments_orderId_key" ON "platform_shipments"("orderId");
CREATE UNIQUE INDEX "platform_shipments_quoteId_key" ON "platform_shipments"("quoteId");
CREATE UNIQUE INDEX "platform_shipments_trackingCode_key" ON "platform_shipments"("trackingCode");
CREATE INDEX "platform_shipments_partnerId_status_idx" ON "platform_shipments"("partnerId","status");
CREATE INDEX "platform_shipments_courierId_status_idx" ON "platform_shipments"("courierId","status");
CREATE INDEX "delivery_events_shipmentId_occurredAt_idx" ON "delivery_events"("shipmentId","occurredAt");
CREATE UNIQUE INDEX "platform_proofs_of_delivery_shipmentId_key" ON "platform_proofs_of_delivery"("shipmentId");
CREATE UNIQUE INDEX "cod_collections_shipmentId_key" ON "cod_collections"("shipmentId");
CREATE INDEX "cod_collections_status_createdAt_idx" ON "cod_collections"("status","createdAt");
CREATE UNIQUE INDEX "delivery_partner_settlements_partnerId_periodFrom_periodTo_key" ON "delivery_partner_settlements"("partnerId","periodFrom","periodTo");
CREATE INDEX "delivery_partner_settlements_status_periodTo_idx" ON "delivery_partner_settlements"("status","periodTo");

ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "delivery_partner_pricing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "platform_shipments" ADD CONSTRAINT "platform_shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_shipments" ADD CONSTRAINT "platform_shipments_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "delivery_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "platform_shipments" ADD CONSTRAINT "platform_shipments_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_shipments" ADD CONSTRAINT "platform_shipments_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "delivery_couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "platform_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_proofs_of_delivery" ADD CONSTRAINT "platform_proofs_of_delivery_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "platform_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_proofs_of_delivery" ADD CONSTRAINT "platform_proofs_of_delivery_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "delivery_couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cod_collections" ADD CONSTRAINT "cod_collections_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "platform_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_partner_settlements" ADD CONSTRAINT "delivery_partner_settlements_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_quotes" ADD CONSTRAINT "delivery_quotes_values_check" CHECK ("distanceKm" >= 0 AND "fee" >= 0 AND ("etaMinutesMin" IS NULL OR "etaMinutesMin" >= 0) AND ("etaMinutesMax" IS NULL OR "etaMinutesMax" >= COALESCE("etaMinutesMin",0)));
ALTER TABLE "platform_shipments" ADD CONSTRAINT "platform_shipments_fee_check" CHECK ("fee" >= 0);
ALTER TABLE "cod_collections" ADD CONSTRAINT "cod_collections_amounts_check" CHECK ("expectedAmount" >= 0 AND ("collectedAmount" IS NULL OR "collectedAmount" >= 0) AND ("remittedAmount" IS NULL OR "remittedAmount" >= 0));
ALTER TABLE "delivery_partner_settlements" ADD CONSTRAINT "delivery_partner_settlements_values_check" CHECK ("periodFrom" < "periodTo" AND "shipmentCount" >= 0 AND "deliveryFees" >= 0 AND "codCollected" >= 0 AND "codRemitted" >= 0);
