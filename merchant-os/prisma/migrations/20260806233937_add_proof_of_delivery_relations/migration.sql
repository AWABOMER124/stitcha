-- CreateIndex
CREATE INDEX "proof_of_deliveries_driverId_idx" ON "proof_of_deliveries"("driverId");

-- AddForeignKey
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
