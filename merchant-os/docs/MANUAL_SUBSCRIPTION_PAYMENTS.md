# Manual subscription payments

WASLA supports owner-reviewed Bankak, MyCashy, and other local transfer channels for paid merchant plans. The merchant first requests a plan upgrade, transfers the exact configured amount, and submits a transaction reference plus a private receipt.

## Business flow

1. A platform owner creates and activates one or more collection accounts at `/admin/subscription-payments`.
2. The merchant requests an upgrade from `/dashboard/subscription`.
3. WASLA displays the active collection accounts and the server-defined monthly amount.
4. The merchant uploads a JPEG, PNG, WebP, or PDF receipt of at most 10 MB.
5. A platform owner reviews the protected receipt and either rejects it with a reason or verifies it.
6. Verification atomically activates the target plan for one calendar month and completes the linked plan-change request.

The browser never supplies the payable amount, currency, or payment channel. These values are copied from the active platform account on the server to prevent price manipulation.

## Security and privacy

- Receipts are stored through the private storage provider and never receive a public URL.
- Downloads require either the owning merchant session or the `PLATFORM_OWNER` role.
- File signatures are checked independently of the browser-supplied filename and MIME type.
- Transaction references are unique per collection account, and identical receipt content cannot be submitted twice by the same merchant.
- A merchant can have only one pending or verified subscription payment at a time.
- Rejected database writes trigger cleanup of the newly uploaded private object.

## Operations

The migration `20260826193000_add_manual_subscription_payments` creates the collection-account and payment-review tables. Production deployment must run the normal Prisma migration command before starting the application.

For local/VPS storage, persist both `/app/public/uploads` and `/app/storage/private`. For production durability and backups, configure the private S3-compatible variables described in `STORAGE_ARCHITECTURE.md`.

## Verification completed

- Prisma schema formatting and validation.
- Unit coverage for evidence signature validation, server-side amount locking, duplicate cleanup, account normalization, owner verification, and rejection rules.
- Full automated test suite, lint, TypeScript, and production build.
