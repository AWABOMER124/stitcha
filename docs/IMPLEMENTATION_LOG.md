# Implementation log

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
