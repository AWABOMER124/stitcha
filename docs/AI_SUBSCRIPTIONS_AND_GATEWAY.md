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
Authorization: Bearer <short-lived-service-jwt>
```

AI Core returns the validated payload plus `request_id`, `project_id`, and `version_id`. Wasla records those identifiers in the AI usage operation metadata and in its merchant-owned project/version tables for audit, preview history, and support correlation. A merchant can only read or apply versions belonging to their own tenant.

Partial AI Core configuration fails closed. If neither AI Core variable is configured, the existing direct Anthropic store generator remains available as a controlled compatibility path.

## Deployment order

1. Back up the Wasla PostgreSQL database.
2. Deploy the commits containing migrations `20260904120000_add_ai_usage_and_growth_plan` and `20260904143000_add_ai_store_projects`.
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

- Safe restore semantics and conversational patches for persisted Store Projects. Project linkage, immutable generated payloads, merchant history, tenant checks, and single-application claiming are implemented.
- Read-only merchant copilot for sales, delayed orders, stock, and customer insights.
- Billing-provider abstraction and signed webhook events.
- Retire the legacy `WhatsAppAiUsage` table after production reconciliation confirms the unified ledger is authoritative.

## Operations screens

- `/admin/plans`: edit database-backed prices, visibility, activation, commerce limits, and all AI/WhatsApp entitlements. Requires `platform:subscriptions:manage`.
- `/admin/ai-usage`: inspect monthly operations, provider usage, estimated cost, and failures.
- `/dashboard/subscription`: merchant plan and quota visibility.
- `/dashboard/storefront/ai`: generate, retain, preview, and safely apply merchant-owned store drafts.

Store generation and product-image enhancement now surface contextual upgrade links when the current plan has no allowance or the active allowance has been exhausted. Existing generated drafts remain accessible after exhaustion.

Plan codes are immutable in the admin interface. Disabling a plan stops new public selection without deleting or silently downgrading existing subscriptions.
