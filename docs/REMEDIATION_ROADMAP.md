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

### Remaining P0

- [ ] Configure final Android/iOS identifiers, release signing, and store metadata.
- [ ] Restrict and rotate the exposed Google Maps key.
- [ ] Replace the 90-day bearer token with short access tokens, refresh rotation,
      and server-side revocation.
- [ ] Add API integration and end-to-end tests for the core order lifecycle.
- [ ] Deploy and verify a signed staging build over HTTPS.

### P0 release gates

- Web build, lint, unit tests, and Flutter analyze/tests run in CI.
- No unauthenticated endpoint returns customer or driver PII.
- A signed staging application can browse, order, and track over HTTPS.

## P1 — Reliable core order loop (weeks 3–6)

- [ ] Replace mock notification providers with durable jobs, retries,
      idempotency keys, and dead-letter visibility.
- [ ] Move billing schedules out of the web process into one durable scheduler.
- [ ] Add checkout price reconciliation, delivery-zone pricing, stock
      concurrency, cancellation/refund rules, and payment state transitions.
- [ ] Add complete loading, empty, offline, retry, and partial-failure states.
- [ ] Complete accessibility: 44px targets, autocomplete, correct `html[lang]`,
      keyboard navigation, contrast, and reduced-motion support.
- [ ] Optimize storefront images and Core Web Vitals.

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
