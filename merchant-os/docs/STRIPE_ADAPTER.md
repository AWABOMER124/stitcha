# Stripe adapter (disabled by default)

WASLA includes a server-only Stripe Checkout adapter, but no Stripe button or public webhook route is enabled in this release. Manual Bankak/MyCashy flows remain the live payment paths until the external Stripe account, settlement country, prices, and secrets are approved.

## Safety model

- `STRIPE_PAYMENTS_ENABLED` defaults to `false`.
- Checkout creation fails closed unless the release flag, secret key, and webhook secret are all present.
- Secret values remain server-side and are never part of the public runtime configuration.
- Each session requires an internal reference and an idempotency key.
- Amounts are converted to Stripe minor units with explicit zero-decimal currency handling.
- Only HTTPS return URLs are allowed in production.
- Webhook verification uses the unmodified raw body, the `Stripe-Signature` timestamp and every `v1` signature, constant-time comparison, and a five-minute tolerance.
- Provider error details are logged by type only and are not returned to customers.

## Activation checklist (external setup phase)

1. Confirm that the Stripe account and settlement country support WASLA's intended currencies and business model.
2. Create test/live keys and a dedicated webhook endpoint secret; store them in Dokploy secrets.
3. Add persistence for provider session/event IDs and an idempotent webhook application service.
4. Expose authenticated subscription and/or order checkout endpoints that derive amount, currency, and metadata from WASLA records only.
5. Subscribe to the minimum required Checkout events and verify them against the raw request body.
6. Run test-mode success, cancellation, duplicate event, delayed event, refund, and reconciliation scenarios.
7. Enable `STRIPE_PAYMENTS_ENABLED=true` only after those checks pass.

Implementation follows Stripe's hosted Checkout Sessions and signed-webhook guidance: <https://docs.stripe.com/api/checkout/sessions/create> and <https://docs.stripe.com/webhooks/signature>.
