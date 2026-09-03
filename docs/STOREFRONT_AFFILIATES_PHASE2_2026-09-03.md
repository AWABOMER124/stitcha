# Storefront affiliates — phase 2 MVP

## What this release does

This release lets each merchant operate a controlled affiliate-sales pilot from
`/dashboard/affiliates`. It is independent from both the platform merchant-
referral program and the retired distributor commission models.

The merchant can configure a default percentage, attribution window, commission
hold, payout threshold, currency and terms; add or suspend marketers; share an
opaque link; see visits, attributed orders and commissions; approve or reject
earned commissions; and record a referenced payout batch.

Every program is created **inactive** with a zero rate. Applying migrations or
opening the page cannot create financial liability.

## Attribution contract

1. The merchant shares `/store/{slug}/affiliate/{code}`.
2. A valid active link creates a random 256-bit token and redirects to the
   storefront. The raw token is stored only in an `HttpOnly`, `SameSite=Lax`
   cookie scoped to that store's order API path.
3. The database stores only a keyed HMAC of the token. The visit expires after
   the merchant's configured 1–90 day window.
4. Checkout resolves the token server-side. It re-reads the order and subtotal
   from the database, verifies store ownership, active program, active marketer
   and expiry, then stores one immutable order attribution.
5. This MVP uses last valid affiliate click. A later valid marketer link for the
   same store replaces the browser cookie.

No customer name, phone or cart content is placed in the affiliate cookie.
Rotating `AUTH_SECRET` invalidates outstanding, unused attribution cookies but
does not change already-attributed orders.

## Commission lifecycle

- The base is the trusted order subtotal (products only; delivery is excluded).
- Rate, currency, hold days and minimum payout are snapshotted at checkout, so
  later policy edits do not rewrite an attributed order.
- No commission exists for a merely placed order.
- The first transition to `DELIVERED` creates one `PENDING` commission. Database
  uniqueness and row locks make duplicate delivery events idempotent.
- Approval is blocked until the hold expires and the marketer remains active.
- Rejection requires a reason.
- Payout requires the marketer's approved balance in the commission currency to
  reach the highest snapshotted threshold in that batch. One reference marks all
  currently approved commissions for that marketer and currency paid as a single
  manual batch; balances in different currencies are never mixed.
- Order cancellation/rejection voids an attribution before earning. A payment
  refund reverses the attribution and any pending, approved or paid commission.
  Reversing a paid record is an accounting alert; recovering the transferred
  money remains an operator task.

This release records payouts but does not move money, provide a wallet or claim
that a Bankak/MyCashy transfer happened without an operator reference.

## Security and tenancy

- All management actions derive `merchantId` from the authenticated session.
- Program and marketer configuration requires `settings:update`.
- Commission approval and payout require `invoices:update`.
- Commission review queries include the session merchant; another merchant's ID
  is treated as not found.
- Affiliate codes are opaque and unique within a store. Phone numbers are
  normalized before the per-store uniqueness check.
- Invalid, expired, paused and suspended links redirect normally but create no
  attribution cookie.
- Public link traffic is rate limited and redirect responses are not cached.

## Data and release

Migrations:

- `20260903120000_storefront_affiliates`
- `20260903123000_storefront_affiliate_payout_snapshot`

Both are additive. The second migration preserves the payout threshold promised
when an order was attributed. Deploy through the normal entrypoint using
`prisma migrate deploy`; never use `db push` or reset a shared database.

After deployment:

1. Confirm `/api/health` returns the deployed `APP_RELEASE`.
2. Open `/dashboard/affiliates`; it must show the paused notice.
3. Create one internal pilot marketer and use a non-cash test order.
4. Verify link redirect, attributed order, delivery, hold, approval and payout
   reference before activating the public pilot.
5. Refund the test payment and confirm the commission changes to `REVERSED`.
6. Finance must reconcile every `PAID` batch reference against the real transfer.

Excel exports are available for both affiliate accounts and affiliate
commissions from `/dashboard/exports`.

## Verified acceptance cases

The isolated PostgreSQL suite covers eight cases: inactive defaults, scoped
HttpOnly tokens, trusted-value snapshots, concurrent delivery, expiry and tenant
isolation, cancellation, hold and batch payout, refund reversal, and program/
marketer suspension. Raw results are written to
`merchant-os/audit/store-affiliates-results.json`.

## Deferred deliberately

- Affiliate self-registration, account verification and a separate marketer portal.
- Product-specific campaigns and different rates per product/category.
- Coupon-based and cross-device attribution.
- Automated Bankak/MyCashy or gateway payouts, tax documents and wallet balances.
- Returns at item/quantity level; the current platform only has payment-level refund.
- Consent-management integration for future optional advertising/analytics cookies.

These require separate product and finance contracts. They must not be simulated
in the UI or inferred from this MVP.
