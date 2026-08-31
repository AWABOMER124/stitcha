ALTER TABLE "users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "partner_verification_challenges" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "channel" TEXT NOT NULL,
  "target" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0, "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_verification_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "partner_verification_challenges_userId_createdAt_idx" ON "partner_verification_challenges"("userId", "createdAt");
CREATE TABLE "partner_sandbox_stores" (
  "id" TEXT NOT NULL PRIMARY KEY, "partnerId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "apiKeyHash" TEXT NOT NULL, "apiKey" TEXT NOT NULL, "webhookToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_sandbox_stores_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "partner_sandbox_stores_partnerId_key" ON "partner_sandbox_stores"("partnerId");
CREATE UNIQUE INDEX "partner_sandbox_stores_apiKeyHash_key" ON "partner_sandbox_stores"("apiKeyHash");
CREATE UNIQUE INDEX "partner_sandbox_stores_webhookToken_key" ON "partner_sandbox_stores"("webhookToken");
CREATE TABLE "partner_sandbox_shipments" (
  "id" TEXT NOT NULL PRIMARY KEY, "storeId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "trackingCode" TEXT NOT NULL, "status" "PlatformShipmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "orderStatus" "OrderStatus" NOT NULL DEFAULT 'READY', "events" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_sandbox_shipments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "partner_sandbox_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "partner_sandbox_shipments_trackingCode_key" ON "partner_sandbox_shipments"("trackingCode");
CREATE UNIQUE INDEX "partner_sandbox_shipments_storeId_idempotencyKey_key" ON "partner_sandbox_shipments"("storeId", "idempotencyKey");
CREATE INDEX "partner_sandbox_shipments_storeId_createdAt_idx" ON "partner_sandbox_shipments"("storeId", "createdAt");
