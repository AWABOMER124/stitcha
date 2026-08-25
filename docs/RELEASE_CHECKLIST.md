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
- [ ] Prisma migrations were tested against a staging backup/restore cycle.
- [ ] `20260825040000_add_customer_refresh_sessions` was deployed before the
      updated mobile authentication flow was released.
- [ ] `AUTH_SECRET`, `AUTH_TRUST_HOST`, URLs, database, encryption, and storage
      variables are configured in the deployment platform.
- [ ] Durable notification/job providers are configured; no required channel is mock.
- [ ] Health checks, structured logs, alerts, backups, and rollback are verified.

## Flutter

- [ ] Analyze and tests pass in CI.
- [ ] Final application IDs, signing, icons, labels, deep links, and versions are set.
- [ ] Release build uses an HTTPS `API_BASE_URL`.
- [ ] Firebase, FCM, maps, notification permissions, and background flows are tested.
- [ ] No demo order, price, fee, ETA, rating, vehicle, or location appears as real data.
- [ ] Store review accounts and privacy disclosures are ready.

## Product and operations

- [ ] One complete order was verified in staging and a production canary.
- [ ] Cancellation, refund, stock race, payment failure, and delivery failure were tested.
- [ ] Merchant/distributor support ownership and escalation paths are documented.
- [ ] Metrics dashboards cover activation, fulfilled orders, cancellations, latency,
      errors, retention, and gross margin.
