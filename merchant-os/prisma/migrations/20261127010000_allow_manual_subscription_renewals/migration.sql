-- Verified receipts are immutable history, not outstanding payment attempts.
-- Keep one pending manual/legacy receipt per merchant; request-level receipt
-- identity and the merchant lock still prevent duplicate activation.
BEGIN;
CREATE UNIQUE INDEX "merchant_subscription_payments_legacy_pending_per_merchant"
ON "merchant_subscription_payments"("merchantId")
WHERE "status" = 'PENDING' AND "provider" NOT IN ('paymob', 'paymob_test');
DROP INDEX "merchant_subscription_payments_legacy_one_open_per_merchant";
COMMIT;
