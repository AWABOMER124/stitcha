# Implementation log

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
