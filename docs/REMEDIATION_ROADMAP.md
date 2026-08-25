# Remediation and delivery roadmap

Updated: 2026-08-25

This roadmap converts the technical, security, UX, and business review into
release gates. A phase is complete only when its acceptance criteria are
verified in CI and in staging.

## P0 — Safe, testable release foundation (weeks 1–2)

### Completed in `codex/p0-hardening`

- [x] Require customer authentication and ownership for live order tracking.
- [x] Remove driver phone and permissive cross-origin headers from tracking.
- [x] Derive storefront inquiry tenancy exclusively from the store slug.
- [x] Validate and rate-limit public inquiry input.
- [x] Configure Auth.js trusted-host behavior explicitly for the production proxy.
- [x] Add Android release network permission.
- [x] Require an environment-specific `API_BASE_URL` in Flutter release builds.
- [x] Align nullable mobile catalogue/order fields with backend responses.
- [x] Replace the obsolete Flutter counter test with API contract tests.
- [x] Save merchant-owner phone and establish a session after registration.
- [x] Consume real driver-location frames and remove simulated map positions.
- [x] Replace fabricated order history with the authenticated history API.
- [x] Remove fabricated delivery fees, ETAs, driver details, and unsupported
      Bankak checkout UI.
- [x] Remove the remaining hard-coded store-card delivery fee and time estimate;
      render unknown delivery details transparently until real quoting exists.
- [x] Run web build/lint/tests and Flutter analysis/tests in GitHub Actions.
- [x] Replace the 90-day bearer token with 15-minute access tokens, rotating
      refresh tokens, reuse detection, and server-side revocation.
- [x] Remove the hard-coded Google Maps key and reject new hard-coded Maps keys
      in CI.
- [x] Add authenticated API contract tests for order creation, customer history,
      and ownership-scoped live tracking.
- [x] Run the core order lifecycle against a migrated disposable PostgreSQL
      database in CI, including inventory and the status audit trail.
- [x] Remove unsupported wallet/payment surfaces, empty controls, fabricated
      promotions, and invented store operational data from the mobile UI.
- [x] Replace raw account/catalogue errors with clear retry states and expose
      primary navigation as semantic, touch-feedback controls.
- [x] Add semantic labels and 44px targets to mobile catalogue, cart, and
      category actions; keep checkout failures free of internal error details.
- [x] Add typed offline/timeout/auth failure handling and bilingual retry states
      across the mobile authentication, catalogue, account, order, and tracking flows.
- [x] Add skip links, modal focus trapping/restoration, live `html[lang]` updates,
      and operating-system reduced-motion support to the web application.
- [x] Enforce one settlement per merchant and exact billing period in the
      database, including idempotent handling of concurrent billing runs.

### Remaining P0

- [ ] Configure final Android/iOS identifiers, release signing, and store metadata.
- [ ] Rotate the previously exposed Maps key in Google Cloud, then restrict
      separate Android/iOS keys to final application identifiers and Maps SDKs.
- [ ] Deploy and verify a signed staging build over HTTPS.

### P0 release gates

- Web build, lint, unit tests, and Flutter analyze/tests run in CI.
- No unauthenticated endpoint returns customer or driver PII.
- A signed staging application can browse, order, and track over HTTPS.

## P1 — Reliable core order loop (weeks 3–6)

- [x] Replace mock notification providers with durable jobs, retries,
      idempotency keys, and dead-letter visibility.
- [x] Move billing schedules out of the web process into one durable scheduler.
- [x] Make order creation, stock deduction, cancellation restoration, and
      status changes atomic and concurrency-safe for tracked inventory.
- [ ] Add location-aware delivery quoting, refund rules, and complete payment
      state transitions.
- [ ] Add complete loading, empty, offline, retry, and partial-failure states.
- [ ] Complete accessibility: 44px targets, autocomplete, correct `html[lang]`,
      keyboard navigation, contrast, and reduced-motion support.
- [x] Give storefront images stable responsive dimensions and lazy loading,
      removing all raw-image lint warnings without opening an unsafe proxy.
- [ ] Configure an allow-listed production image CDN and verify Core Web Vitals.

### P1 release gates

- End-to-end tests cover signup, store publishing, checkout, fulfillment,
  delivery, cancellation, and settlement.
- Order success rate is at least 98% in staging fault tests.
- No user-visible screen contains invented operational data.

## P2 — Product-market fit and monetization (weeks 7–12)

- [ ] Pilot one vertical in one city with 5–10 merchants.
- [ ] Instrument activation, first-order time, weekly fulfilled orders per active
      merchant, cancellation, four-week retention, support load, CAC, and margin.
- [ ] Package Starter, Growth, and Distributor tiers.
- [ ] Launch featured placement only with explicit “Sponsored” disclosure.
- [ ] Defer consumer delivery subscriptions until coverage, payment, and delivery
      reliability are proven.

The primary north-star metric is **weekly fulfilled orders per active merchant**.
Geographic or vertical expansion should wait until retention and contribution
margin meet the agreed targets.
