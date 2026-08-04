-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "providerReference" TEXT;

-- CreateTable
CREATE TABLE "delivery_provider_configs" (
    "id" TEXT NOT NULL,
    "deliveryCompanyId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "credentials" TEXT,
    "webhookToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_provider_configs_deliveryCompanyId_key" ON "delivery_provider_configs"("deliveryCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_provider_configs_webhookToken_key" ON "delivery_provider_configs"("webhookToken");

-- CreateIndex
CREATE INDEX "deliveries_providerReference_idx" ON "deliveries"("providerReference");

-- AddForeignKey
ALTER TABLE "delivery_provider_configs" ADD CONSTRAINT "delivery_provider_configs_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "delivery_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
