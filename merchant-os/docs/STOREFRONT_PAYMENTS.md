# Storefront manual payments

Each WASLA merchant can offer cash or merchant-owned Bankak/MyCashy transfer accounts from `/dashboard/storefront/payments`.

## Checkout flow

1. The merchant creates and activates transfer destinations. Account numbers are intentionally public checkout data; inactive accounts are never returned to customers.
2. The customer chooses cash or manual transfer at checkout.
3. For a transfer, the customer sees the exact server-calculated order total, selects an account, enters the reference, and uploads a JPEG, PNG, WebP, or PDF receipt (maximum 10 MB).
4. WASLA creates the order, pending payment, and private evidence record together. If order creation fails, the uploaded private object is deleted.
5. The merchant opens the order, views the protected receipt, and verifies or rejects it.
6. Verification atomically marks the evidence verified and the payment completed. A manual-transfer order cannot move from `NEW` to `ACCEPTED` before this succeeds.

## Security boundaries

- Account mutations use both account ID and authenticated merchant ID, preventing cross-merchant changes.
- Checkout resolves the selected account again using the store's merchant ID and active state.
- Amounts come from the server-side product snapshot and are not accepted from the browser.
- Evidence uses private storage with file-signature checks; object keys and SHA-256 values are never serialized into the order UI.
- Proof download is tenant-scoped and requires an authenticated merchant session.
- Transaction references are normalized and unique per merchant account; identical proof content is unique per merchant.
- Review uses a conditional database claim so concurrent clicks cannot verify or reject the same proof twice.

## Deployment

Migration `20260826203000_add_storefront_manual_payments` adds `MANUAL_TRANSFER`, merchant payment accounts, and order proof records. Apply migrations before starting the new application image. Persist or configure the private storage path as documented in `STORAGE_ARCHITECTURE.md`.

Stripe remains intentionally outside this manual-payment module and will be connected through a separate disabled provider adapter.
