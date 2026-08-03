-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'FEATURED_PLACEMENT_FEE';

-- CreateTable
CREATE TABLE "featured_placements" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SDG',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "featured_placements_merchantId_idx" ON "featured_placements"("merchantId");

-- CreateIndex
CREATE INDEX "featured_placements_distributorId_idx" ON "featured_placements"("distributorId");

-- CreateIndex
CREATE INDEX "featured_placements_startsAt_endsAt_idx" ON "featured_placements"("startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
