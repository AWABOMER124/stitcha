# Implementation log

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
- The database test is intentionally delegated to GitHub Actions because no
  local Docker daemon was available; its result is a required CI job step.

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
