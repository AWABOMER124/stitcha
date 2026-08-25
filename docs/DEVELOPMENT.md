# Development workflow

## Branches and commits

- Create focused branches such as `fix/tracking-ownership` or `feat/order-history`.
- Keep commits independently testable and describe the business/security reason.
- Do not push directly to `main`; merge reviewed pull requests with passing CI.
- Never mix generated artefacts unrelated to the source change into a commit.

## Required verification

The GitHub Actions workflow at `.github/workflows/ci.yml` runs these gates on
pull requests, pushes to `main`, and pushes to `codex/**` branches. Do not merge
until both the **Merchant OS** and **Flutter app** jobs pass.

Merchant OS:

```bash
cd merchant-os
npm ci
npx prisma generate
npm run lint
npm test
npm run build
```

Flutter:

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
```

Use a placeholder `DATABASE_URL` for Prisma generation/tests that do not access a
live database. Never point automated tests at production.

## API change checklist

1. Define the validated request and response contract.
2. Confirm authentication, role, tenant, and resource ownership.
3. Add rate limiting where an endpoint is public or abuse-sensitive.
4. Avoid exposing Prisma objects directly across API/client boundaries.
5. Add positive, invalid-input, unauthorized, and cross-tenant tests.
6. Update Flutter DTO fixtures when a mobile contract changes.
7. Update architecture, roadmap, and implementation log when relevant.

## Generated Flutter files

Freezed and JSON files are committed. Regenerate them whenever a source model
changes and review the generated diff. Platform plugin registrants should only
change when plugin dependencies change.

## Dependency updates

Dependabot checks npm and Flutter packages weekly and GitHub Actions monthly.
Dependency pull requests must pass the same CI gates and should be merged in
small groups so regressions remain easy to identify.

## Database integration tests

The normal `npm test` suite never requires a database. Database-backed tests
use `vitest.integration.config.ts` and run separately so failures cannot be
hidden by mocks.

To run them locally, start an empty PostgreSQL database, set `DATABASE_URL` to
that disposable database, then run from `merchant-os`:

```bash
npx prisma migrate deploy
npm run test:integration
```

Never point this command at production or shared staging data. GitHub Actions
creates a fresh PostgreSQL service, applies every committed migration, runs the
integration lifecycle, and discards the database with the job.

## Local Google Maps configuration

Never add a Maps key to a manifest, Swift source, tracked Gradle file, or Dart
source. Use separate restricted keys for each platform:

- Android: set `MAPS_API_KEY` in the shell/CI secret store, or add
  `MAPS_API_KEY=...` to the user-level `~/.gradle/gradle.properties` file.
- iOS: copy `ios/Flutter/Maps.xcconfig.example` to the ignored
  `ios/Flutter/Maps.xcconfig` file and replace the placeholder.

The Android key must be restricted to the final package name and signing SHA-1;
the iOS key must be restricted to the final bundle identifier. Enable only the
Maps SDK required by that platform.
