-- A merchant can have at most one settlement for an exact billing period.
-- This database invariant closes the race between concurrent scheduler runs.
CREATE UNIQUE INDEX "settlements_merchantId_periodFrom_periodTo_key"
ON "settlements"("merchantId", "periodFrom", "periodTo");
