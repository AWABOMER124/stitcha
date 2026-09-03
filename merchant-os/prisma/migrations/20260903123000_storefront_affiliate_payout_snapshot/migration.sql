ALTER TABLE "store_affiliate_attributions"
  ADD COLUMN "minimumPayoutSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "store_affiliate_attributions"
  ALTER COLUMN "minimumPayoutSnapshot" DROP DEFAULT;

ALTER TABLE "store_affiliate_attributions"
  ADD CONSTRAINT "store_affiliate_attributions_minimum_payout"
  CHECK ("minimumPayoutSnapshot" >= 0);
