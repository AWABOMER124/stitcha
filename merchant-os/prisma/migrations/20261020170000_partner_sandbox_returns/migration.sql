ALTER TABLE "partner_sandbox_shipments"
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'FORWARD',
ADD COLUMN "parentShipmentId" TEXT;

CREATE UNIQUE INDEX "partner_sandbox_shipments_storeId_parentShipmentId_kind_key"
ON "partner_sandbox_shipments"("storeId", "parentShipmentId", "kind");
