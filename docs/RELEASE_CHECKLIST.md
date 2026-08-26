# Release checklist

## Security and privacy

- [ ] No production secrets or signing files are tracked.
- [ ] Google/Firebase client keys are restricted to the final applications.
- [ ] The previously committed Maps key was disabled, separate Android/iOS keys
      were created, and API/application restrictions were verified.
- [ ] Authentication, tenant isolation, ownership, and rate limits are tested.
- [ ] Refresh-token rotation, reuse revocation, logout, and forced re-login were
      verified on the staging mobile build.
- [ ] Tracking links cannot expose another customer's order or driver PII.
- [ ] Privacy policy, terms, retention, deletion, and support contacts are live.

## Merchant OS

- [ ] `npm ci`, lint, tests, and production build pass in CI.
- [ ] The repository-root Dokploy image builds in CI and `/api/health` returns
      HTTP 200 against the production PostgreSQL connection.
- [ ] The database-backed order lifecycle passes after all migrations are
      applied to a fresh PostgreSQL database.
- [ ] Prisma migrations were tested against a staging backup/restore cycle.
- [ ] Existing settlements were audited for duplicate merchant/period groups
      before applying `20260825050000_unique_settlement_period`.
- [ ] `20260825040000_add_customer_refresh_sessions` was deployed before the
      updated mobile authentication flow was released.
- [ ] `AUTH_SECRET`, `AUTH_TRUST_HOST`, URLs, database, encryption, and storage
      variables are configured in the deployment platform.
- [ ] `JOB_RUNNER_SECRET`, the scheduler, and required Resend/Twilio/Meta
      provider credentials are configured; no required channel is left disabled.
- [ ] Health checks, structured logs, alerts, backups, and rollback are verified.
- [ ] The production image CDN host is allow-listed and image optimization is
      verified without permitting arbitrary remote proxying.
- [ ] Product uploads use S3-compatible storage, or `/app/public/uploads` is a
      persistent Dokploy volume writable by UID/GID `1001` and survives restart.
- [ ] `NEXT_PUBLIC_APP_URL` is passed both as a Docker build argument and a
      runtime environment variable using the final HTTPS origin.
- [ ] Keyboard-only smoke tests verify skip links, modal focus containment,
      Escape close, and focus restoration in each authenticated shell.

## Flutter

- [ ] Analyze and tests pass in CI.
- [ ] Final application IDs, signing, icons, labels, deep links, and versions are set.
- [ ] Release build uses an HTTPS `API_BASE_URL`.
- [ ] Firebase, FCM, maps, notification permissions, and background flows are tested.
- [ ] No demo order, price, fee, ETA, rating, vehicle, or location appears as real data.
- [ ] No wallet, payment, promotion, favourite, notification, or recovery control
      is exposed unless its end-to-end capability is configured and verified.
- [ ] Offline, timeout, authentication, validation, and server failures show
      actionable messages without exposing exception or infrastructure details.
- [ ] Store review accounts and privacy disclosures are ready.

## Product and operations

- [ ] Keep `PLATFORM_DELIVERY_ENABLED=false` until the delivery cutover review.
- [ ] Reconcile legacy delivery-company/courier counts and manually classify
      every distributor-fleet driver with an explicit contractual owner.
- [ ] Approve at least two partners, verify service-area coordinates/prices,
      COD contracts, webhook signatures, dispatch fallback, and support SLA.
- [ ] Run quote expiry, duplicate acceptance, failed delivery, proof, COD
      collection/remittance, settlement, dispute, and rollback scenarios.
- [ ] Keep `DISTRIBUTOR_PORTAL_ENABLED=false`; enable it temporarily only for
      named migration-support users and record an audit/expiry date.
- [ ] Archive legacy distributor balances and access only after signed finance
      and ownership reconciliation. Do not drop legacy tables in the pilot.

- [ ] One complete order was verified in staging and a production canary.
- [ ] Cancellation, refund, stock race, payment failure, and delivery failure were tested.
- [ ] Concurrent checkout verification confirms tracked stock cannot become
      negative and only one conflicting order succeeds.
- [ ] Merchant/distributor support ownership and escalation paths are documented.
- [ ] Metrics dashboards cover activation, fulfilled orders, cancellations, latency,
      errors, retention, and gross margin.
