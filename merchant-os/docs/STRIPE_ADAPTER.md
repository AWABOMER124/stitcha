# Stripe billing and storefront payments

WASLA supports two independent Stripe flows while preserving the existing Bankak/MyCashy paths.

## Platform subscriptions

- A merchant requests a paid plan, then chooses Stripe or manual transfer.
- Stripe Checkout runs in recurring `subscription` mode.
- The signed webhook activates the requested plan, stores the Stripe customer/subscription IDs, completes the plan-change request, and evaluates referral commissions once.
- Subscription updates, renewals, failures, cancellation, and duplicate webhook delivery are handled idempotently.

## Store customer payments

- Each merchant connects an Express account from **Storefront → Payments**.
- Card checkout appears only after Stripe reports `details_submitted`, `charges_enabled`, and `payouts_enabled`.
- Checkout uses a destination charge, so the payment is transferred to the merchant's connected Stripe account rather than retained by WASLA.
- SDG catalog totals are converted to USD using the platform exchange rate snapshotted on the payment record. Both the store amount and Stripe charge amount are retained for reconciliation.
- A failed Checkout creation cancels the new order and restores reserved inventory. The order becomes paid only after a correctly signed Stripe webhook matches its server-calculated amount and currency.

## Production configuration

Set these only in Dokploy secrets:

```env
STRIPE_PAYMENTS_ENABLED=true
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://wassla-sd.shop
```

Create one Stripe webhook endpoint:

```text
https://wassla-sd.shop/api/stripe/webhook
```

Subscribe it to:

- `checkout.session.completed`
- `account.updated`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `charge.refunded`

Apply migration `20261019120000_add_stripe_payments` before enabling the feature.

## Safety and operational boundaries

- Secret keys never reach the browser or database.
- Checkout amounts, currencies, plan IDs, order IDs, destination accounts, and exchange rates are resolved server-side.
- Webhooks use the unmodified request body, timestamp tolerance, constant-time signature comparison, payload hashes, and an idempotent event ledger.
- Connect is available only to merchants with a legal entity in a Stripe-supported country. Do not enter a false country to bypass Stripe onboarding.
- Start in Stripe test mode and verify success, cancellation, renewal, payment failure, duplicate webhook, refund, and Connect onboarding before switching to live keys.
