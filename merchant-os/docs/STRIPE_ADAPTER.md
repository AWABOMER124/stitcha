# Stripe billing and storefront payments

WASLA supports two independent Stripe flows while preserving the existing Bankak/MyCashy paths.

## Platform subscriptions

- A merchant requests a paid plan, then chooses Stripe or manual transfer.
- Stripe Checkout runs in recurring `subscription` mode.
- The signed webhook activates the requested plan, stores the Stripe customer/subscription IDs, completes the plan-change request, and evaluates referral commissions once.
- Subscription updates, renewals, failures, cancellation, and duplicate webhook delivery are handled idempotently.

## Store customer payments

- Customers pay through WASLA's central Stripe account; merchants don't connect a separate gateway.
- Card checkout appears when the platform Stripe integration is enabled and correctly configured.
- Every successful payment creates an immutable merchant-balance entry. Stripe's actual processing fee and WASLA's configurable commission are deducted before the merchant net is calculated.
- Entries are held for the configured risk period, then grouped into an idempotent weekly settlement. Finance records the local Bankak, MyCashy, or bank-transfer reference when the payout is completed.
- Full refunds create a negative entry in the next settlement, including reversal of WASLA's commission. Stripe processing fees remain charged to the merchant.
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
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `charge.refunded`

Apply migrations through `20261019183000_central_stripe_settlements` before enabling the feature.

## Safety and operational boundaries

- Secret keys never reach the browser or database.
- Checkout amounts, currencies, plan IDs, order IDs, destination accounts, and exchange rates are resolved server-side.
- Webhooks use the unmodified request body, timestamp tolerance, constant-time signature comparison, payload hashes, and an idempotent event ledger.
- WASLA is the Stripe business/merchant of record for centrally collected store payments and is responsible for disputes, refunds, and negative balance risk. Confirm this operating model with Stripe and local legal/accounting advisers before live launch.
- Start in Stripe test mode and verify success, cancellation, renewal, payment failure, duplicate webhook, refund, and Connect onboarding before switching to live keys.
