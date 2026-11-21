-- Keep the existing one-open-payment rule for legacy/manual providers while
-- allowing separate verified Paymob receipts for prepaid subscription renewals.
-- Receipt identity and the locked checkout attempt provide Paymob idempotency.
BEGIN;
CREATE UNIQUE INDEX "merchant_subscription_payments_legacy_one_open_per_merchant"
ON "merchant_subscription_payments"("merchantId")
WHERE "status" IN ('PENDING', 'VERIFIED') AND "provider" NOT IN ('paymob', 'paymob_test');
DROP INDEX "merchant_subscription_payments_one_open_per_merchant";
COMMIT;
