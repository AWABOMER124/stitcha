-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "deliveryCompanyId" TEXT;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "deliveryCompanyId" TEXT;

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "preferredDeliveryCompanyId" TEXT;

-- CreateTable
CREATE TABLE "delivery_companies" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_companies_distributorId_idx" ON "delivery_companies"("distributorId");

-- AddForeignKey
ALTER TABLE "delivery_companies" ADD CONSTRAINT "delivery_companies_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_preferredDeliveryCompanyId_fkey" FOREIGN KEY ("preferredDeliveryCompanyId") REFERENCES "delivery_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "delivery_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "delivery_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
