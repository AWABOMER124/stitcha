-- AlterTable: add nullable first so existing rows can be backfilled
ALTER TABLE "drivers" ADD COLUMN "locationToken" TEXT;

-- Backfill any existing drivers with a unique value derived from their own
-- (already-unguessable) id, so the column can become NOT NULL + UNIQUE below.
UPDATE "drivers" SET "locationToken" = 'migrated_' || "id" WHERE "locationToken" IS NULL;

-- AlterTable: now safe to enforce NOT NULL
ALTER TABLE "drivers" ALTER COLUMN "locationToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_locationToken_key" ON "drivers"("locationToken");
