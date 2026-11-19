# Safe release operations

The web image never performs migrations or startup billing. Run APP_PROCESS_MODE=migrate explicitly once after reviewing backward-compatible migrations. The existing authenticated external runner remains the sole billing/outbox scheduler. JOB_RUNNER_ENABLED defaults to disabled; enable it only for a serving instance.

Candidate deployment and traffic switching are tested in isolated environments before production promotion. Do not replace a release image by rebuilding its tag: record and promote the exact tested image ID/digest. Preserve named upload/storage volumes and auth/encryption secrets across slots. No database restore is part of a normal application rollback.

## Verified acceptance path

Run the unit controls with Python 3 on Linux, then the image-backed candidate journey and real Traefik traffic journey on an INTERNAL Docker network. These tests never use production credentials or published test ports. The candidate journey creates only a uniquely named isolated test database and removes it after the test.

The traffic controller checks an exact local image ID against the running container and its built APP_RELEASE, checks readiness, writes an atomic routing file plus recovery journal, verifies the serving path, and restores the old routing on failure. It preserves the previous version's deployment headers and asset query routing while that slot remains running. It does not replay POSTs or restore databases. Previous-slot replacement invalidates rollback and is rejected. This is a functional protocol test, not a capacity guarantee or an availability SLA.

## Deployment prerequisites

1. Obtain a successful CI run on the exact source commit. Release workflow is manual, main-only, and never deploys to production automatically.
2. Configure a protected production-build GitHub environment and a private registry. Required variables: RELEASE_REGISTRY, RELEASE_IMAGE, PRIVATE_REGISTRY_CONFIRMED=true. Required secrets: REGISTRY_USERNAME, REGISTRY_TOKEN, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY. Never store the key in the repository or publish a production image publicly: its server manifest contains the encryption key. Keep registry pull credentials only in the operator credential store.
3. Pull the exact CI-produced image digest; record its resolved local image ID. Do not rebuild for staging/production. The image built locally during development is acceptance evidence, not an external CI release.
4. Review expand-only SQL and compatibility of both code versions and job payloads. Execute migrations once under an operator lock using APP_PROCESS_MODE=migrate. Health rejects missing migrations, but cannot prove arbitrary SQL changes are backward compatible.
5. Prepare blue/green serving slots with JOB_RUNNER_ENABLED=false. A separate private jobs instance has JOB_RUNNER_ENABLED=true. The existing timer must be pointed to run_worker.py and that worker verified before serving slots take public traffic; otherwise jobs would be disabled on the public web endpoint.
6. Preserve the existing database/network, auth keys, and named upload/private-storage volumes. Import the slot configuration into the managed Dokploy deployment and record its source of truth; do not start an unmanaged parallel production deployment. No example operator configuration is automatically installed on production.
7. Configure the controller with exact hostnames, slot releases/IDs/internal URLs, serving-path health URL, state path, and a dedicated Traefik dynamic .yml path. The generated document is JSON-compatible YAML. Never write another project's routing file. Inventory custom merchant domains as well as the platform aliases.
8. Promote only after the prior gates. Keep the previous slot and immutable assets while requests drain; schedule retirement through the release process, not a blind cleanup. Test browser draft persistence/version reload and custom-domain routing before declaring production zero-downtime rollout complete.

## Current implementation boundary

The commercial Saudi calculation is pure and dormant. It charges merchant logistics only (20 SAR plus 2% of goods for COD), no sales commission and no automatic customer charge. No Saudi carrier, contract or merchant pricing record is activated merely by adding this module.

The controller, private-worker invocation, compose template, CI and tests are prepared for review. A production cutover remains gated on authenticated repository publishing, configured private release storage, successful CI and the operational prerequisites above. Never interpret passing isolated tests as an already activated production migration.
