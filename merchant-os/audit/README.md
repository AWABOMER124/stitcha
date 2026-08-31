# Isolated delivery-partner acceptance audit

Opt-in acceptance tests, outside normal unit-test discovery because they require real local PostgreSQL and a local Next server.
The baseline audit had **37 tests: 21 passed, 16 failed** (`partner-audit-results.json`).
After repairs, the expanded suite contains **40 tests**, including real worker retry/recovery and concurrent webhooks. Updated results are in `partner-repair-results.json`; see `../../docs/DELIVERY_PARTNER_REPAIRS_2026-08-31.md`.

## Safety boundary

- Use only the disposable local database below. The audit refuses other host/port/database combinations.
- No `.env` file was present during the audit. Do not run this harness with production credentials, notification providers or a production database.
- All accounts, customers, orders and partners are synthetic. API calls go to a loopback mock, not a delivery company.
- The audit leaves its rows for inspection. The local app and database container were stopped after testing. No production account or shipment was created.
- Restarting the suite creates a new synthetic merchant. Registration has a real per-process limit; restart the local app if repeated audit runs exhaust that limit.
- The negative-price case is protected by a database constraint but currently gives a server error, not friendly form validation.
- Actual service/database tests use explicitly created fixtures, not the entire UI chain for every order. Quote authorization/feature-gate production configuration is not certified by direct-service tests.

## Run locally (PowerShell)

From the repository root, create the test database only if the named container does not already exist:

```powershell
docker run --name wasla-partner-audit-20260831 -e POSTGRES_PASSWORD=audit-local-only -e POSTGRES_DB=wasla_partner_audit -p 127.0.0.1:55439:5432 -d postgres:16-alpine
```

For an existing stopped audit container use `docker start wasla-partner-audit-20260831` instead.
Then from `merchant-os`:

```powershell
$env:DATABASE_URL='postgresql://postgres:audit-local-only@127.0.0.1:55439/wasla_partner_audit'
npx prisma migrate deploy
$env:AUTH_SECRET='wasla-local-audit-auth-not-production-20260831'
$env:AUTH_TRUST_HOST='true'
$env:AUTH_URL='http://127.0.0.1:3107'
$env:SECRETS_ENCRYPTION_KEY='wasla-local-audit-encryption-not-production'
$env:NEXT_PUBLIC_APP_URL='http://127.0.0.1:3107'
$env:DELIVERY_PARTNER_ALLOW_LOCAL_TEST='true'
npm run dev -- --hostname 127.0.0.1 --port 3107
```

In another terminal at `merchant-os`:

```powershell
$env:DATABASE_URL='postgresql://postgres:audit-local-only@127.0.0.1:55439/wasla_partner_audit'
npx vitest run --config vitest.partner-audit.config.ts --reporter=verbose --reporter=json --outputFile.json=audit/partner-repair-results.json
```

The repaired suite should pass. Preserve the baseline result file. Do not weaken safety assertions to obtain a green result; document policy changes before adjusting tests.

## Reproduce production's missing coverage route

From the repository root:

```powershell
docker build --network=none -f merchant-os/audit/Dockerfile.coverage-probe .
```

Before repairs, root `.dockerignore` excluded `**/coverage` and the probe failed. Exclusions are now scoped to report folders, so this probe succeeds. It downloads nothing, does not build the application or deploy anything. Follow it with a full production-image route smoke test before release.

## Shut down

Stop the local Next process in its terminal, then:

```powershell
docker stop wasla-partner-audit-20260831
```

Do not prune Docker, stop unrelated containers, delete databases, or run this audit against production. Synthetic data remains recoverable by restarting the named container.
