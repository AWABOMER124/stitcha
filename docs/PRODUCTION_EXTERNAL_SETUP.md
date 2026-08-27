# Production external setup — Wasla

Updated: 2026-08-27

This is the remaining work that cannot be completed safely from the repository alone. Keep every related feature flag disabled until its own acceptance checks pass.

## 1. Dokploy release identity and persistence

- Build `main` from the repository root with the root `Dockerfile`.
- Set both build arguments: `NEXT_PUBLIC_APP_URL=https://wasslak.perfect-team.cloud` and `APP_RELEASE=<Git SHA>`.
- Set the same `APP_RELEASE` at runtime and verify it at `GET /api/health`.
- Keep one replica until shared rate limits and storage are configured.
- Prefer S3-compatible public storage for product/store images.
- Use a separate private S3 bucket for payment proofs, or persistent volumes at both `/app/public/uploads` and `/app/storage/private`.
- Restart the container and prove that a public image and a private proof both remain available through their authorized paths.

## 2. AI providers

- Add `ANTHROPIC_API_KEY` and approve a low-cost `WHATSAPP_AI_MODEL` for store generation and customer support.
- Add an Anthropic spend cap and alert before enabling merchants.
- Add `OPENAI_API_KEY` only after GPT Image access is confirmed.
- Keep `AI_IMAGE_ENHANCEMENT_ENABLED=false` until durable public storage, cost limits, and real-product quality tests pass.
- Test inaccurate questions, prompt injection, exhausted monthly credits, provider timeout, human handoff, and manual agent resume.

## 3. WhatsApp Business

- Create and verify the Meta app, WABA, phone number, access token, app secret, and webhook verify token.
- Configure the webhook at `/api/webhooks/whatsapp`, subscribe to message events, and verify Meta signatures.
- Store every merchant token through the encrypted settings flow; never paste it into source control.
- Test text, menu ordering, location pin, webhook retry, human handoff, staff reply pause, and the 24-hour customer-service window.

## 4. Payments

- Create and verify the platform Bankak/MyCashy receiving accounts and approval owners.
- Each merchant creates its own receiving accounts and performs a real low-value receipt match/reject test.
- Keep Stripe disabled. When the account is ready, configure test keys and webhook secret, run duplicate/out-of-order webhook tests, then switch to live credentials under a separate release approval.
- Define refund, chargeback, mistaken-transfer, retention, and proof-deletion procedures.

## 5. Delivery pilot

- Contract and approve at least two delivery partners in one city.
- Enter verified pickup coordinates, service areas, ETA ranges, pricing rules, maximum distances, and explicit COD capability.
- Configure provider credentials and signature verification only for a reviewed adapter; the repository currently includes a manual-log reference adapter, not a named live courier contract.
- Reconcile courier ownership and old distributor records before enabling platform delivery.
- Run quote expiry, simultaneous acceptance, no-coverage, provider outage, failed delivery, proof-of-delivery, COD collection/remittance, settlement, dispute, and rollback tests.
- Turn `PLATFORM_DELIVERY_ENABLED=true` only for the controlled pilot after sign-off.

## 6. Jobs, monitoring, and security

- Configure `JOB_RUNNER_SECRET` and a scheduler for `/api/internal/jobs/run`.
- Configure alerting for health failures, migration failures, outbox backlog, webhook errors, AI cost/timeout, and storage errors.
- Verify automated PostgreSQL backups and one restore rehearsal.
- Rotate credentials previously shared through chat or screenshots before production use.
- Publish privacy policy, terms, retention/deletion policy, and customer support contacts.

## Go-live evidence

Save the deployed Git SHA, health response, migration log, storage restart test, one full storefront order, one manual-payment review, one WhatsApp order/location flow, and one delivery pilot order in the release record. No checkbox is considered complete without evidence and an owner.
