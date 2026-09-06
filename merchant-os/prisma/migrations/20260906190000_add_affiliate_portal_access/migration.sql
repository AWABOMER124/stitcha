ALTER TABLE "store_affiliates"
  ADD COLUMN "portalAccessTokenHash" TEXT,
  ADD COLUMN "portalAccessTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "store_affiliates_portalAccessTokenHash_key"
  ON "store_affiliates"("portalAccessTokenHash");
