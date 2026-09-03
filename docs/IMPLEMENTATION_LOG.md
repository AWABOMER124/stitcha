# Implementation log

## 2026-09-03 — Public marketer applications

- Added a bilingual `/marketers` acquisition page with separate applications for WASLA merchant acquisition and store-product affiliates.
- Added rate-limited, validated public submission with duplicate protection and explicit terms consent.
- Added platform review at `/admin/marketers` and tenant-scoped merchant review at `/dashboard/affiliates/applications`.
- Product approval atomically creates the existing store-affiliate record, after which the marketer completes the established KYC and payout flow.
- Added the feature to navigation, sitemap, homepage, privacy and terms, plus an isolated 4/4 PostgreSQL audit.


## 2026-09-03 — Basic limits, KYC, recurring referrals and Pro domains

- Enforced the Basic plan at 20 active products, one branch and one active team account with transactional concurrency locks.
- Gated storefront AI, AI image enhancement, WhatsApp AI, data export and custom domains through server-side subscription entitlements.
- Added private merchant and storefront-affiliate KYC submissions, encrypted identity/payment fields, protected document downloads and admin approval.
- Changed merchant acquisition referrals to a configurable recurring commission model (default 20% of verified Pro payments for 12 months) with hold, review, payout threshold and idempotency.
- Added Pro custom-domain requests, TXT ownership verification, admin activation and hostname-based storefront routing. Dokploy hostname/TLS activation remains an explicit operator step.
- Applied all 39 migrations to the isolated PostgreSQL audit database; unit tests passed 337/337, merchant referral audit 7/7, storefront affiliate audit 8/8, lint and the Next.js production build passed.
- Production setup and acceptance steps are documented in `KYC_PRO_DOMAINS_RELEASE_2026-09-03.md`.

## 2026-09-03 — Storefront affiliate-sales MVP

- Added merchant-owned, inactive-by-default affiliate programs and opaque
  marketer links with scoped HttpOnly last-click attribution.
- Snapshotted rate, currency, hold, payout threshold and trusted order subtotal
  at checkout; delivery creates one idempotent pending commission.
- Added cancellation/rejection voiding, payment-refund reversal, tenant-scoped
  review, hold enforcement and referenced batch payout after the threshold.
- Added `/dashboard/affiliates`, affiliate and commission Excel exports, and
  updated public privacy/terms disclosures.
- Added an eight-case isolated PostgreSQL audit; see
  `STOREFRONT_AFFILIATES_PHASE2_2026-09-03.md` for the release boundary.

## 2026-09-03 — Merchant acquisition referrals, phase 1

- Added immutable merchant-to-merchant attribution without reintroducing the
  retired distributor model.
- Added opaque share codes, registration-link capture, activation after account
  verification, first-delivered-order or first-paid-Pro qualification, and an
  idempotent pending-reward ledger.
- Added self/duplicate-identity controls, policy snapshots, hold periods,
  permissioned review and mandatory fulfilment references.
- Added merchant and platform-admin referral workspaces. The singleton program
  is migrated inactive and must be explicitly configured before use.
- Verified the complete 36-migration chain and a 7/7 isolated PostgreSQL audit;
  331 standard tests, TypeScript and scoped lint checks passed.
- Documented the release boundary and deferred storefront product affiliates in
  `MERCHANT_REFERRALS_PHASE1_2026-09-03.md`.

## 2026-08-27 — Practical delivery readiness

- Closed the missing-coordinate gap: public storefront checkout can capture a customer location with browser permission, mobile order input accepts a validated coordinate pair, and WhatsApp ordering accepts Meta location messages.
- Added merchant-side quote request and acceptance to the order detail screen, with feature-flag, ownership, order-state, location, payment, COD, expiry, and duplicate-shipment guards.
- Deduplicated overlapping partner pricing rules by keeping the cheapest eligible offer per partner.
- Corrected quote acceptance so order total, payment amount, and COD expected amount share one final server-calculated value.
- Documented the remaining external partner, credential, webhook, settlement, retry, and city-pilot gates in `merchant-os/docs/PLATFORM_DELIVERY.md`.

## 2026-08-26 — Public/private storage boundary

- Preserved the existing public image storage API and added a separate private storage service for receipts, payment evidence, and proof of delivery.
- Added local and S3-compatible private providers; private objects never expose public/CDN URLs.
- Added file-type, size, scope, and traversal validation plus focused tests.
- Prepared both Docker images with a writable private local-development directory.
- Documented the two-bucket DigitalOcean Spaces deployment model in `merchant-os/docs/STORAGE_ARCHITECTURE.md`.

## 2026-08-26 — Visual storefront builder

- Replaced URL-only storefront branding fields with direct, authenticated image upload.
- Added a responsive merchant builder with mobile/desktop live preview.
- Added drag-and-drop section ordering, visibility controls, and touch-friendly move buttons.
- Connected saved section order and visibility to the public storefront.
- Fixed storefront logo persistence by saving it to `Merchant.logo`, while retaining legacy theme fallback.
- Added production guidance in `merchant-os/docs/STOREFRONT_BUILDER.md`.
- Verification: ESLint passed, production build passed, 228 automated tests passed.

## 2026-08-26 — Dokploy production readiness

- Added a repository-root Docker context policy so Dokploy no longer receives
  local dependencies, build outputs, uploads, environment files, or unrelated
  mobile build trees.
- Added a database-backed `/api/health` readiness endpoint and an OCI container
  health check with startup grace for migrations.
- Upgraded the container and CI runtime from Node.js 20 to Node.js 24 LTS after
  the production build exposed a Node 22+ engine requirement in Prisma's tree.
- The container now launches Next.js directly after `prisma migrate deploy`,
  preserving graceful signal handling and never seeding production.
- Enforced Linux line endings for shell entrypoints and normalized them again
  during the image build, preventing Windows checkouts from producing an
  unbootable container.
- Added S3-compatible endpoint support and strict credential/public-origin
  validation for durable product images.
- Added a Dokploy runbook covering build arguments, runtime secrets, persistent
  storage, rollout smoke tests, AI activation, and rollback.
- CI now builds the exact repository-root production image, boots it against a
  fresh PostgreSQL service, applies the migration chain, and requires the health
  endpoint to return HTTP 200.

### Local verification

- Merchant OS: 228 tests passed, ESLint passed, and the production build passed
  with `/api/health`, upload, and image-enhancement routes present.
- The exact Dokploy image built on Node.js 24 with zero known dependency
  vulnerabilities, applied all 25 migrations to a fresh PostgreSQL 16
  database, started as the non-root user, and reached both Docker `healthy` and
  HTTP `{ "status": "ok" }` states.
- The test containers, isolated network, transient database, and local image
  were removed after verification.

## 2026-08-26 — Store creation and AI product-image studio

- Audited direct registration, storefront composition, product management,
  store customization, and the existing Claude store-content generator.
- Added runtime validation at registration, model-output, and browser-draft
  trust boundaries before any AI-generated catalogue is written.
- Completed the missing product-image workflow with tenant-isolated upload,
  file decoding, resize/compression, ten-image management, and saved previews.
- Added a fail-closed GPT Image product studio for white backgrounds,
  transparent cutouts, and merchant-described lifestyle scenes, with prompts
  that preserve the real product and rate limits that bound provider cost.
- Documented implementation and production boundaries in
  `docs/STOREFRONT_AI_AUDIT.md`.

### Verification

- Merchant OS: dependency audit reported zero known vulnerabilities, ESLint
  completed without warnings, all 228 unit tests passed, and the Next.js
  16.3.3 production build completed successfully.
- Flutter: static analysis reported no issues and all 11 tests passed.
- The new production build includes both authenticated image endpoints:
  `/api/products/images/upload` and `/api/products/images/enhance`.

### Deployment boundary

The repository has no configured GitHub deployment target or deployment
history. Shipping the code and passing CI therefore does not deploy it to a
live server. Production enablement still requires the documented database,
object storage, Anthropic, and OpenAI environment values, followed by an
acceptance test with real merchant product images.

## 2026-08-26 — WASLA identity system

- Rebranded the public product from Waslak/وصلك to `WASLA | وصلة` without
  changing commerce, tenancy, delivery, finance, authentication, or API logic.
- Added central web and Flutter brand configuration and a connected-path mark
  shared conceptually across React SVG and Flutter CustomPaint.
- Rebuilt semantic light/dark theme mappings with Midnight, Teal, Blue, Cloud,
  Slate, border, and status tokens; Arabic uses Alexandria and English Inter.
- Updated metadata, PWA manifests, storefront attribution, auth, portals,
  settings, plan copy, emails, notifications, localized mobile copy, native
  display names, and Android/iOS/Web icon sets.
- Added a reproducible Sharp-based icon generator and a complete retained-
  identifier classification in `docs/BRAND_AUDIT.md`.

### Verification

- Merchant OS: 220 tests passed, lint passed, and the production build passed
  with locally bundled Alexandria and Inter fonts.
- Flutter: analysis reported no issues and all 11 tests passed.
- The old-brand search is classified in `docs/BRAND_AUDIT.md`; remaining
  matches are internal identifiers, immutable history, or external contracts.

## 2026-08-26 — Direct merchant and delivery transition batch 4

- Added expiring delivery quotes, platform shipments, immutable events, proof
  of delivery, COD custody, and partner-only settlement records with database
  constraints and separate financial boundaries.
- Added authenticated, ownership-scoped quote and acceptance APIs behind the
  fail-closed `PLATFORM_DELIVERY_ENABLED` flag.
- Delivery distance is calculated server-side from stored pickup/destination
  coordinates. Rules are ranked by coverage, active area, priority, partner
  rating, and price; the client cannot submit a cheaper distance.
- Quote acceptance is atomic: it consumes one quote, cancels alternatives,
  updates the order, creates the shipment and first event, and establishes COD
  custody only for an approved COD-capable partner.
- Added a platform operations screen for partner approval, suspension, and COD
  capability review.
- Retired distributor registration and removed acquisition links. The legacy
  distributor portal is disabled by default while data remains recoverable.

### External release boundary

Keep platform delivery disabled until production coordinates and partner rules
are reconciled, at least two partners are approved, provider credentials and
webhooks are verified, and a rollback rehearsal succeeds. Legacy distributor
tables must not be dropped before balances and ownership reconcile.

### Verification

- Prisma schema validation and client generation passed.
- ESLint completed with no errors or warnings.
- All 220 Merchant OS unit tests and the production build passed locally.
- The PostgreSQL integration suite now exercises quote, shipment, event, proof,
  and COD relationships after the complete migration chain.

## 2026-08-26 — Direct merchant SaaS transition batch 3

- Added platform-owned delivery partners, integration configuration, service
  areas, pricing rules, and couriers as a shadow foundation independent of
  distributors.
- Added a reversible data migration that preserves legacy records while
  copying delivery companies, encrypted provider configuration, and only
  couriers whose company ownership is already explicit.
- Left ambiguous distributor-fleet drivers in the legacy model for manual
  classification rather than guessing ownership.
- Added a deterministic delivery fee calculator with minimum/maximum caps and
  distance eligibility. It is not yet connected to checkout or dispatch.

### Release boundary

No live fulfillment route was changed. Quotes, shipments, delivery events,
proof of delivery, COD custody, partner settlements, operational reconciliation,
and a rollback-controlled cutover remain required.

### Verification

- Prisma formatting, schema validation, and client generation passed.
- ESLint completed with no errors or warnings.
- All 219 Merchant OS unit tests and the production build passed.
- The database-backed suite covers the new relationships and fail-safe COD
  default; hosted CI applies the full migration chain against PostgreSQL.

## 2026-08-26 — Direct merchant SaaS transition batch 2

- Added a bilingual, responsive plan-and-billing page to the merchant dashboard
  showing the current plan, grandfathered status, and an honest Basic/Pro
  feature comparison.
- Added idempotent merchant upgrade requests. Repeated clicks cannot create
  duplicate pending requests, and requesting Pro never grants access before
  payment/review.
- Added a platform-operations notification for each new upgrade request and an
  explicit pending state in the merchant UI.
- Added a dedicated migration and database-backed coverage for plan requests.

### Verification

- Prisma schema validation and client generation passed.
- ESLint completed with no errors or warnings.
- All 216 Merchant OS unit tests and the production build passed.

## 2026-08-26 — Direct merchant SaaS transition batch 1

- Added platform-owned Basic and Pro plan records and one current subscription
  boundary per merchant, independent of distributor commission plans.
- Basic is free with conservative operational limits. Pro uses a USD 10/month
  reference price so a local-currency invoice can be explicitly locked later.
- Existing merchants are backfilled as grandfathered zero-charge Pro to avoid
  silently removing current access during the migration.
- All merchant creation paths now assign Basic atomically with store creation.
- Added typed, fail-safe entitlement parsing and current-plan lookup services.
- Documented the target delivery-partner architecture and the staged,
  reversible distributor retirement sequence.

### Verification

- Prisma formatting, schema validation, and client generation passed.
- Merchant OS ESLint passed and all 214 unit tests passed.
- Next.js production build and TypeScript validation passed.

## 2026-08-25 — P1 durable jobs and delivery batch 2

- Added a PostgreSQL outbox with idempotency keys, atomic claim using
  `FOR UPDATE SKIP LOCKED`, stale-lock recovery, bounded exponential retries,
  and terminal `FAILED` records for dead-letter inspection.
- Added a secret-protected `POST /api/internal/jobs/run` endpoint that enqueues
  the monthly subscription-billing period and drains billing and notification
  jobs. Concurrent workers cannot claim the same job.
- Order creation now commits its merchant notification in the same transaction
  as stock, payment, delivery, and customer statistics.
- Password resets, staff invites, merchant registration links, and phone OTPs
  are queued with encrypted payloads; raw tokens and OTP bodies are not stored
  as readable outbox JSON.
- Replaced console-only email, SMS, and WhatsApp mocks with fail-closed Resend,
  Twilio, and Meta Cloud API adapters. Missing credentials cause retries and a
  visible dead letter instead of a false delivery success.
- Public storefront checkout now uses the same atomic repository path as every
  other order source.

### Verification

- ESLint completed with zero errors and zero warnings.
- All 208 Merchant OS unit tests passed.
- The Next.js production build and TypeScript validation passed.
- The PostgreSQL integration suite now covers idempotent enqueue, concurrent
  workers, retries, and terminal dead-letter behavior.

### Required external action

Apply migration `20260825060000_add_durable_outbox`, set
`JOB_RUNNER_SECRET` and `SECRETS_ENCRYPTION_KEY`, configure the hosting
scheduler, then add credentials only for the delivery channels being launched.

## 2026-08-25 — P1 billing reliability batch 1

- Added a database unique key for merchant plus exact settlement period, so
  concurrent billing invocations cannot create duplicate financial records.
- Subscription billing treats the losing side of a concurrency race as an
  idempotent skip while preserving genuine per-merchant failures for review.
- Manual duplicate settlement attempts now return an intentional conflict
  message instead of exposing the underlying Prisma error.
- Added coverage for both direct database unique conflicts and the normalized
  service conflict returned through the production call path.
- The PostgreSQL integration suite asserts that the unique settlement-period
  index exists after the complete migration chain is applied.

### Deployment note

Before applying `20260825050000_unique_settlement_period` to an existing
database, audit duplicate merchant/period groups. The migration intentionally
fails instead of deleting or merging financial records automatically.

## 2026-08-25 — P1 recovery and accessibility batch 3

### Mobile offline and failure states

- Added one user-facing error classifier for offline connections, transport
  timeouts, expired/invalid sessions, safe client validation responses, and
  unexpected failures.
- Login and registration no longer render exception objects; short intended
  4xx validation messages remain actionable while server-side 5xx details are
  always replaced with a safe fallback.
- Home, catalogue, account, order history, and live tracking now share a
  bilingual error state with failure-specific messaging and retry actions.
- Added four focused tests covering offline, timeout, safe validation, and
  server-detail redaction behavior.

### Web keyboard and motion accessibility

- Added bilingual skip links to merchant, distributor, platform-admin, and
  public-store layouts, with programmatically focusable main content targets.
- Modal dialogs now trap keyboard focus, close with Escape, prevent background
  scrolling, restore the invoking control's focus, and use labelled dialog
  semantics. Confirmation dialogs use the safe cancel action as initial focus.
- Client-side locale changes now update both `html[dir]` and `html[lang]`.
- Added a global reduced-motion mode that suppresses non-essential animation
  and transitions when requested by the operating system.

### Verification

- Flutter analysis completed with no issues; all 11 Flutter tests passed.
- Merchant OS ESLint completed with zero errors and zero warnings.
- All 197 Merchant OS unit tests and the Next.js production build passed.

## 2026-08-25 — P1 mobile UX integrity batch 2

### Honest, actionable interfaces

- Removed the unsupported wallet route, navigation item, fabricated balance,
  membership tier, transactions, and transfer/withdrawal controls. The feature
  stays out of the product until a real ledger and payment provider exist.
- Removed promotional claims, a fixed delivery location, notifications,
  favourites, password recovery, and profile options that had no implemented
  action or backend capability.
- Replaced the store screen's fabricated merchant name, rating, opening state,
  delivery estimate, fee, and stock photography with a neutral product view
  backed by the requested store's real catalogue.
- Replaced the unrelated stock profile photograph with a deterministic user
  initial, so the interface no longer implies a user-uploaded avatar.
- Added user-friendly account and catalogue failure states with explicit retry
  actions, without exposing internal exception strings.
- Checkout failures now show a safe recovery message instead of serializing
  transport or server exceptions into the customer interface.
- Changed the primary mobile navigation interactions to accessible semantic
  buttons with visible touch feedback and selected-state announcements.
- Store cards and category filters now expose semantic labels and selection
  state; add-to-cart and quantity controls provide tooltips and 44px targets.

### Verification

- Flutter analysis completed with no issues.
- All seven Flutter tests passed.
- A repository search confirms no remaining empty button callbacks in the
  Flutter application.

## 2026-08-25 — P1 order reliability batch 1

### Atomic stock and order state

- Order creation, tracked-stock deduction, stock-movement audit, delivery and
  payment records, and customer statistics now commit in one transaction.
- A conditional inventory update prevents concurrent checkouts from pushing
  tracked stock below zero; insufficient stock rolls the whole order back.
- Cancellation and rejection restore tracked inventory in the same transaction
  as the status change and audit entry.
- Status updates use the previously read status as an optimistic concurrency
  condition, preventing two operators from advancing the same order at once.
- The mobile checkout now uses the same order repository as merchant-created
  orders, so it no longer bypasses inventory, payment, or delivery records.
- Removed the obsolete best-effort inventory APIs to prevent future callers
  from reintroducing non-atomic order stock changes.

### Verification

- Merchant OS unit suite: 197/197 tests passed after moving stock guarantees
  from mocked service tests into the database integration suite.
- ESLint completed with zero errors and zero warnings.
- Next.js production build passed.
- The PostgreSQL lifecycle now covers mobile checkout, cancellation restoration,
  competing oversized orders, and competing status updates; the hosted CI run
  passed the complete database-backed suite.

## 2026-08-25 — P1 UX/performance batch 1

### Layout-safe storefront images

- Replaced seven raw image elements across the public storefront, category
  listing, order details, and storefront preview with a shared Next.js image
  component.
- Added explicit dimensions or responsive `fill`/`sizes` hints to prevent
  layout shifts and enable browser-native lazy loading and decoding behavior.
- External merchant URLs bypass the server-side image optimizer until a final
  CDN host can be allow-listed; this avoids exposing an unrestricted remote
  image proxy.
- Added meaningful alternative text for product and merchant images while
  keeping decorative banner text empty.

### Verification

- ESLint completed with zero errors and zero warnings.
- Merchant OS unit suite remained green at 203/203 tests.
- Next.js production build passed.

## 2026-08-25 — P0 hardening batch 6

### Database-backed order lifecycle

- Added an isolated PostgreSQL 16 service to the Merchant OS CI job.
- CI now applies the complete Prisma migration chain before integration tests.
- Added a dedicated Vitest integration configuration, separate from fast unit
  tests and mocks.
- The lifecycle test creates real merchant, account, customer, catalogue, and
  inventory records; creates an order; verifies stock, delivery, payment, and
  customer history; fulfills the order to `DELIVERED`; checks the immutable
  status trail; and rejects a transition out of the terminal state.
- Test records use unique identifiers and are removed after the run; the CI
  database itself is disposable.

### Verification

- Local unit suite: 203/203 tests passed.
- Next.js production build passed and ESLint completed with zero errors and the
  same seven image-optimization warnings.
- GitHub Actions created PostgreSQL 16, applied the full migration chain, and
  passed the database-backed lifecycle test. No local Docker daemon was
  available, so the disposable CI database is the recorded verification.

## 2026-08-25 — P0 hardening batch 5

### Honest delivery information

- Removed the hard-coded `15 SDG` fee and `30-45 minute` estimate from the
  mobile storefront API.
- Made delivery fee and timing nullable in the Flutter store contract.
- Store cards now show confirmed values when available and otherwise explain
  that the fee and timing are determined when the order is confirmed.
- Added server and Flutter contract coverage to prevent fabricated delivery
  values from returning unnoticed.
- Added API route integration coverage for authenticated order creation and
  account-scoped history, including wire-format translation and auth failures.
- Order creation now rejects zero, negative, fractional, or missing quantities
  before reaching the service layer.
- Updated the official checkout and Node setup actions to their Node 24-based
  major versions after GitHub flagged the previous Node 20 runtimes as deprecated.

### Verification

- Merchant OS: 203/203 tests passed.
- Next.js production build passed.
- ESLint completed with zero errors and seven existing image-optimization
  warnings.
- Flutter code generation completed successfully.
- Flutter analysis completed with no issues and all 7 tests passed.

## 2026-08-25 — P0 hardening batch 4

### Google Maps key handling

- Removed the shared Google Maps key from Android and iOS source files.
- Android reads `MAPS_API_KEY` from a Gradle property or environment variable
  and rejects release tasks when it is missing.
- iOS reads the key from an ignored `Maps.xcconfig` file and refuses to start a
  release build without a resolved value.
- Added a CI guard that rejects Google Maps key patterns in Android source and
  the iOS application delegate.

### Required external action

The exposed key remains recoverable from Git history and must be disabled in
Google Cloud. Create separate Android/iOS keys restricted to the final package
and bundle identifiers, signing certificate, and only the required Maps SDKs.

### Verification

- The repository key-pattern guard passes for Android native source and the iOS
  application delegate.
- The updated iOS property list parses successfully and resolves the Maps key
  through the `MAPS_API_KEY` build setting.
- An Android debug build reached Gradle dependency resolution, but could not
  finish because Maven artifact downloads failed with TLS/time-out network
  errors. GitHub Actions remains the clean-environment analysis and test gate.

## 2026-08-25 — P0 hardening batch 3

### Revocable customer sessions

- Replaced the 90-day customer JWT with a 15-minute access token tied to a
  server-side session and a rotating 30-day opaque refresh token.
- Added a Prisma migration for hashed refresh sessions; raw refresh tokens are
  never persisted.
- Added single-use rotation, token-family reuse detection, immediate session
  revocation, and authenticated logout.
- Added rate-limited refresh and logout API routes.

### Flutter session lifecycle

- Login and registration persist both tokens in platform secure storage.
- Dio serializes concurrent refresh attempts, rotates on a 401, retries the
  original request once, and clears invalid credentials.
- Logout revokes the server session before deleting local credentials.
- User model string output no longer includes access or refresh tokens.
- Clearing credentials now publishes an authentication event so the app leaves
  authenticated UI immediately when server-side refresh fails.
- Structured server logs redact `accessToken` and `refreshToken` fields.

### Deployment note

Existing 90-day tokens do not contain a session identifier and intentionally
stop working after this release. Apply the migration first and communicate a
one-time forced login to existing mobile users.

### Verification

- Prisma schema validation passed.
- Merchant OS lint passed with seven existing image warnings, all 195 tests
  passed, and the Next.js production build passed.
- Flutter analysis reported no issues and all seven tests passed.

## 2026-08-25 — CI and repository hygiene

- Added GitHub Actions gates for Merchant OS install, Prisma generation, lint,
  tests, and production build.
- Added Flutter lockfile install, analysis, and tests as a separate CI job.
- Added grouped weekly npm/Flutter dependency updates and monthly workflow
  dependency updates through Dependabot.
- Added a repository-wide EditorConfig to standardize UTF-8, LF line endings,
  final newlines, and indentation.
- Verified the CI commands locally: Merchant OS lint/build passed (seven
  existing image warnings), Flutter lockfile install and four tests passed,
  and analysis surfaced five advisory findings.
- The first hosted run exposed that Flutter treats analyzer info messages as a
  failing exit code on Linux. The five findings were fixed, including removal
  of demo login credentials, and the gate remains strict.

## 2026-08-25 — P0 hardening batch 2

### Honest mobile order experience

- Order history now loads authenticated orders from the backend and separates
  active and completed/cancelled orders using real statuses.
- The tracking screen consumes live driver coordinates from the SSE stream and
  only renders a map after a real location is received.
- Simulated map positions, ETA, driver rating, vehicle details, placeholder
  orders, fixed delivery fees, and the unsupported Bankak option were removed.
- Checkout now starts with an empty address and clearly states that the server
  confirms any applicable delivery fees.

### Verification

- Dart analysis completed with zero errors and zero warnings (five advisory
  info messages remain outside this batch).
- Flutter model contracts include live tracking-update coverage.

## 2026-08-25 — P0 hardening batch 1

### Security

- Live tracking now requires a customer bearer token and verifies that the order
  belongs to that customer account.
- Tracking no longer sends the driver's phone number or a wildcard CORS header.
- Store inquiries derive tenancy from the active store slug, reject extra tenant
  identifiers, validate bounded input, rate-limit submissions, and hide internal errors.

### Mobile correctness

- Android release builds include network permission.
- Flutter release builds require an explicit `API_BASE_URL`.
- Store image/rating, product description/image/category, and order address now
  follow backend nullability.
- Store and product cards display honest placeholders and omit unavailable ratings.
- The obsolete counter test was replaced with three mobile API contract tests.

### Authentication and deployment

- Auth.js trusted-host behavior is explicit and documented for the controlled proxy.
- Merchant registration saves the owner phone and signs the new owner in before
  redirecting to the dashboard.

### Verification

- Merchant OS: 185 tests passed, lint passed with seven existing image warnings,
  and the Next.js production build passed.
- Flutter: analyze completed with zero errors and three contract tests passed.
