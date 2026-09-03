# Merchant referral program — phase 1

## Release boundary

This phase adds a platform acquisition program in which an existing merchant
refers a new merchant to WASLA. It is separate from storefront product
affiliates and does not expose the retired distributor model.

The database migration creates the program **inactive** with a zero reward.
Production administrators must configure a positive reward, qualification rule,
hold period and terms before activating it. Deployment alone cannot create a
reward liability.

## Merchant journey

1. Every merchant has one opaque code in the form `WSL-XXXXXXXXXX`.
2. The merchant shares the public registration link from `/dashboard/referrals`.
3. The registration page accepts `?ref=CODE` or a code entered manually.
4. A valid code is attributed in the same database transaction that creates the
   referred merchant. An invalid, inactive or paused code never blocks signup.
5. If account verification is enabled, the referral moves from `REGISTERED` to
   `ACTIVATED` only when the merchant account is verified. Otherwise it starts
   activated.
6. The referral qualifies once under the configured rule:
   - first delivered order; or
   - first verified subscription payment for a non-free plan.
7. Qualification creates one pending reward using the rule, value, currency and
   hold period snapshotted at registration time.

Changing the platform policy therefore affects future referrals only; it does
not silently rewrite an existing merchant's promised terms.

## Reward operations

The administrator workspace is `/admin/referrals`.

- `PLATFORM_OWNER` and `PLATFORM_ADMIN` may configure or pause the program.
- Finance-review permission is required to approve, reject or fulfil rewards.
- Approval is blocked until the hold period has elapsed and the referred
  merchant is still active.
- Rejection requires a reason.
- Fulfilment requires an external reference and can only follow approval.
- Phase 1 records fulfilment; it does not automatically transfer cash, extend a
  subscription or issue AI credits. Operations must perform the benefit and
  record its reference until a dedicated ledger integration is released.

## Fraud and consistency controls

- The source code must be active and belong to an active merchant.
- Self-referral is rejected when the new email or phone matches the referring
  merchant or its active owner.
- A keyed HMAC fingerprint prevents the same email/phone identity being used
  for a second accepted referral without storing another plaintext copy in the
  referral record.
- One referred merchant can have only one referral and one referral can have
  only one reward; database unique constraints enforce both rules.
- Qualification and reward review take row locks and remain idempotent under
  concurrent events.
- Rejected attempts remain as auditable records but are not exposed to the
  referring merchant as successful acquisitions.

These controls reduce basic abuse; they are not a substitute for operational
review of device, ownership, order and payment risk before cash fulfilment.

## Data and migration

Migration: `merchant-os/prisma/migrations/20260903090000_platform_merchant_referrals/migration.sql`

It creates the program, referral-code, attribution and reward tables plus enum,
foreign-key, unique, index and value constraints. The change is additive. Do
not use `prisma db push` or reset a shared database.

Deploy with the existing entrypoint, which runs:

```bash
npx prisma migrate deploy
```

After deployment:

1. Confirm `/api/health` reports the expected `APP_RELEASE`.
2. Open both referral pages while the program is paused.
3. Configure a non-cash pilot reward and explicit terms.
4. Activate only after finance names an owner for pending-reward review.
5. Run one canary referral and verify registration, activation, qualification,
   hold and fulfilment-reference states before inviting the wider cohort.

Application rollback can use the previous image because the new tables are
additive and isolated. Keep the tables and their evidence; do not drop them as
part of an emergency image rollback.

## Verification evidence

- Prisma migration chain: 36 migrations applied to isolated PostgreSQL 16.
- Referral acceptance audit: 7/7 passed, covering concurrency, registration,
  invalid and self referrals, duplicate identity, both qualification rules,
  idempotency, review controls and pause behaviour.
- Standard suite: 331/331 passed across 58 files.
- TypeScript and scoped ESLint checks passed.

The isolated suite lives in `merchant-os/audit/merchant-referrals.audit.ts` and
uses `merchant-os/vitest.referrals-audit.config.ts`.

## Deferred phase

Storefront product affiliates require a separate design: campaign attribution,
cookie/consent rules, coupon ownership, returns and cancellation clawbacks,
commission ledger, affiliate verification, payout batching and merchant-funded
balances. No product-level commission is implied by this release.
