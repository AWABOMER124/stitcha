# Wasla AI subscriptions and AI Core integration

## Ownership boundary

- **Wasla Merchant OS** owns plans, entitlements, merchant quotas, upgrade UX, and the merchant-facing usage history.
- **AI Core (`AWABOMER124/ai-gateway`)** owns model execution, Store Project versions/patches, provider-level observability, and its global spend guardrail.
- A provider failure never consumes merchant quota. Provider cost can still be recorded on the released operation when the upstream response exposes it.

This boundary avoids charging a merchant twice and avoids duplicating commercial subscription rules inside AI Core.

## Initial plans

| Entitlement | Basic | Growth | Pro |
| --- | ---: | ---: | ---: |
| Active products | 20 | 300 | 2,000 |
| Categories | 10 | 50 | 200 |
| Staff | 1 | 3 | 10 |
| Branches | 1 | 1 | 3 |
| Lifetime store generations | 1 | 1 | 1 |
| Monthly store generations | 0 | 5 | 20 |
| Monthly AI edits | 0 | 100 | 500 |
| Monthly merchant chat messages | 0 | 300 | 2,000 |
| Monthly image enhancements | 0 | 20 | 100 |
| Monthly WhatsApp AI replies | 0 | 0 | 2,000 |

Growth starts with a configurable USD reference price of 5 and Pro retains the existing USD reference price of 10. Both are database values, not application constants. Operations must confirm a locked SDG collection amount before accepting a manual transfer.

Business is sales-led and intentionally not public yet. Multi-store tenancy remains out of the first launch scope.

## Quota lifecycle

Every chargeable AI call uses an idempotent operation key:

1. `reserve` creates or reuses an operation inside a serializable transaction.
2. Wasla rejects the request when `used + reserved + requested > plan limit`.
3. The provider executes only after a successful reservation.
4. `commit` moves the units from reserved to used after a valid result.
5. `release` returns the reserved units after provider, validation, storage, or delivery failure.
6. The scheduled job marks abandoned reservations as expired after 15 minutes and releases their units.

`-1` means unlimited and `0` means unavailable. Lifetime usage uses the stable period key `lifetime`; monthly usage uses UTC `YYYY-MM`.

## AI Core authentication

Wasla creates a five-minute HS256 service JWT for each request. Tenant identity is the verified `org` claim and is always the Wasla merchant ID. It is never accepted from browser input.

Configure the same high-entropy secret on both applications:

```env
# Wasla Merchant OS
AI_CORE_BASE_URL=https://your-ai-core-domain.example
AI_CORE_SECRET_WASLA=<shared-secret>
AI_CORE_TIMEOUT_MS=60000

# ai-gateway
AI_CORE_SECRET_WASLA=<same-shared-secret>
```

Generate a new secret with a cryptographically secure generator, for example `openssl rand -base64 48`. Store it only in Dokploy secrets/environment settings. Never commit it.

Wasla calls:

```text
POST /api/v1/wasla/projects
POST /api/v1/wasla/projects/{project_id}/patch
POST /api/v1/wasla/projects/{project_id}/restore
POST /api/v1/wasla/copilot
Authorization: Bearer <short-lived-service-jwt>
```

AI Core returns the validated payload plus `request_id`, `project_id`, and `version_id`. Wasla records those identifiers in the AI usage operation metadata and in its merchant-owned project/version tables for audit, preview history, and support correlation. A merchant can only read or apply versions belonging to their own tenant.

Partial AI Core configuration fails closed. If neither AI Core variable is configured, the existing direct Anthropic store generator remains available as a controlled compatibility path.

## Deployment order

1. Back up the Wasla PostgreSQL database.
2. Deploy the commits containing migrations `20260904120000_add_ai_usage_and_growth_plan`, `20260904143000_add_ai_store_projects`, `20260904170000_subscription_billing_foundation`, and `20260904173000_billing_event_ledger`.
3. Confirm Prisma migrations complete before the web process becomes ready.
4. Deploy AI Core with migrations 010 through 012 already applied.
5. Set the matching `AI_CORE_SECRET_WASLA` on both services and `AI_CORE_BASE_URL` on Wasla.
6. Restart both services so secrets are loaded.
7. Call AI Core `/api/v1/health`, then generate one draft from a controlled Pro test merchant.
8. Verify one committed `ai_usage_operations` row, one local `merchant_ai_store_projects` row/version, and the matching `project_id` in AI Core.
9. Force one provider failure and verify that the operation is released and the merchant quota is unchanged.

Do not enable the production integration before AI Core has `OPENAI_API_KEY`, its database migrations, HTTPS, and a daily spend cap.

## Rollback

- Unset `AI_CORE_BASE_URL` and `AI_CORE_SECRET_WASLA` in Wasla to return store generation to the compatibility provider.
- Do not roll back or drop usage tables after merchants have generated content; they are the audit source for quota decisions.
- Plans can be hidden using `isPublic=false` without changing existing subscriptions.
- Lower plan limits do not delete merchant data. Creation is blocked until usage returns below the new limit.

## Remaining AI product work

- Add the first external payment-provider adapter and its provider-specific signed webhook route when credentials are ready.
- Retire the legacy `WhatsAppAiUsage` table after production reconciliation confirms the unified ledger is authoritative.

## Subscription lifecycle foundation

Plans now support an optional configurable yearly price while monthly billing remains the only launched checkout path. Merchant subscriptions can record `MONTHLY`, `YEARLY`, or `CUSTOM` billing intervals, provider/customer/subscription references, and an explicit trial window. Trials are not granted automatically: a `TRIALING` subscription is effective only before its server-controlled `trialEndsAt`, then access safely falls back to Basic.

`entitlementOverrides` provides tenant-specific contract limits and feature flags without creating a new plan or changing other merchants. Platform staff with subscription-management permission can set or clear these overrides from the merchant detail page. Effective entitlements are always merged and evaluated server-side; no browser-supplied plan or tenant identity is trusted.

The billing layer exposes one provider contract for checkout, subscription creation/cancellation/readback, and verified webhook normalization. The existing Bankak/MyCashy flow is represented by the manual provider and still activates service only after a platform reviewer verifies the receipt. Each activation writes an append-only subscription event.

External webhook infrastructure is prepared but deliberately not exposed without a real provider adapter. A provider must verify its signature before any persistence. Verified events are SHA-256 fingerprinted rather than stored raw, claimed atomically, deduplicated by provider event ID, matched to a server-stored external subscription ID, and applied together with the subscription audit event in one transaction. Failed events remain retryable and never trust a browser-supplied merchant, plan, price, or status.

## Upgrade errors and product analytics

Server-side entitlement failures use stable machine-readable codes. `FEATURE_NOT_AVAILABLE` includes the feature key and `upgrade_required`; `USAGE_LIMIT_REACHED` includes the usage key, used units, configured limit, next reset time, and `upgrade_required`. API endpoints can preserve their existing human-readable `error` while using these fields for contextual upgrade UI. Provider token counts and costs remain admin-only.

Structured `product_event` logs cover AI operation started/completed/failed, AI limit reached, and upgrade clicked. The persistent AI operation ledger remains the authoritative source for generation conversion and average AI cost, plan-change requests record upgrade intent, and subscription events record successful commercial transitions. These events contain tenant identifiers and operational IDs but no secrets, raw payment payloads, or customer PII.

## Operations screens

- `/admin/plans`: edit database-backed monthly/yearly prices, visibility, activation, commerce limits, and all AI/WhatsApp entitlements. Requires `platform:subscriptions:manage`.
- `/admin/merchants/{id}`: inspect a merchant and apply or clear tenant-specific entitlement overrides.
- `/admin/ai-usage`: inspect monthly operations, provider usage, estimated cost, and failures.
- `/dashboard/subscription`: merchant plan and quota visibility.
- `/dashboard/storefront/ai`: generate, retain, preview, and safely apply merchant-owned store drafts.
- `/dashboard/copilot`: ask read-only questions about aggregated orders, sales, delayed work, top products, and stock for the previous 30 days.

Store generation and product-image enhancement now surface contextual upgrade links when the current plan has no allowance or the active allowance has been exhausted. Existing generated drafts remain accessible after exhaustion.

Conversational store edits consume `aiStoreEditsMonthly` through the same reserve/commit/release ledger. AI Core commit `8a52328` makes patches immutable: every edit creates a new version instead of mutating history. Restore also creates a new head version copied from the selected owned version, so undo remains auditable. Wasla re-validates every returned payload, persists the matching remote identifiers, and never accepts merchant or version ownership from browser input.

Merchant Copilot consumes `aiMerchantChatsMonthly`. Wasla creates its read-only aggregate snapshot server-side and strips customer PII before sending it to AI Core; the browser cannot supply a tenant or analytics snapshot. Access also requires the merchant `reports:read` permission. AI Core commit `768b0b4` provides the dedicated copilot endpoint and is explicitly instructed to answer only from supplied metrics and never claim to perform writes.

Plan codes are immutable in the admin interface. Disabling a plan stops new public selection without deleting or silently downgrading existing subscriptions.
