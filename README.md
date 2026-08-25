# Waslak Commerce Platform

Waslak is an Arabic-first commerce and delivery platform for merchants,
distributors, drivers, and customers. This repository contains the merchant
operating system and the Flutter customer application.

## Repository layout

| Path | Purpose |
|---|---|
| `merchant-os/` | Next.js 16 modular monolith: merchant, distributor, admin, storefront, and APIs |
| `lib/` | Flutter customer application |
| `android/`, `ios/`, `web/`, `windows/`, `linux/`, `macos/` | Flutter platform projects |
| `test/` | Flutter contract and widget tests |
| `docs/` | Cross-project architecture, remediation roadmap, development, and release documentation |

## Current release status

The platform is in pre-release hardening. The web production build and unit
tests pass, but every release must satisfy the gates in
[`docs/REMEDIATION_ROADMAP.md`](docs/REMEDIATION_ROADMAP.md) and
[`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).

Do not treat demo values, unconfigured external providers, or manually granted
subscriptions as production capabilities. Known gaps are tracked explicitly in
the roadmap instead of being presented as complete features.

## Quick start: Merchant OS

Prerequisites: Node.js 20+, PostgreSQL 16+, and npm.

```bash
cd merchant-os
npm ci
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Before running Prisma commands, configure `DATABASE_URL`. For deployments
behind the repository's controlled Nginx/Dokploy proxy, also set
`AUTH_TRUST_HOST=true`.

Mobile authentication uses revocable access/refresh sessions. Deploy migration
`20260825040000_add_customer_refresh_sessions` before releasing a mobile build
from this branch. Existing legacy customer tokens require a one-time login.

Deploy migrations through `20260825060000_add_durable_outbox` before enabling
the internal job runner. The runner requires `JOB_RUNNER_SECRET`; sensitive
notification payloads require `SECRETS_ENCRYPTION_KEY`.

Verification:

```bash
npm run lint
npm test
npm run build
```

## Quick start: Flutter app

Prerequisites: a compatible Flutter SDK and configured Firebase applications.

```bash
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Release builds require an explicit HTTPS endpoint:

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.example.com/api
```

The application intentionally fails fast if a release build starts without
`API_BASE_URL`.

Google Maps keys are never committed. For Android, provide `MAPS_API_KEY` as
an environment variable or `-PMAPS_API_KEY=...`. For iOS, copy
`ios/Flutter/Maps.xcconfig.example` to `ios/Flutter/Maps.xcconfig` and insert the
rotated iOS-restricted key. Release configuration rejects a missing key; debug
mode keeps the map unavailable without fabricating one.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Remediation and delivery roadmap](docs/REMEDIATION_ROADMAP.md)
- [Development workflow](docs/DEVELOPMENT.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Implementation log](docs/IMPLEMENTATION_LOG.md)
- [Merchant OS detailed reference](merchant-os/docs/SYSTEM_REFERENCE.md)

## Security

Never commit production secrets, signing keys, database URLs, private API
credentials, or service-account files. Client keys such as Google Maps keys
must still be restricted by application ID, signing certificate, and API.

Security-sensitive changes require ownership tests, tenant-isolation tests,
and a production build before merge.
