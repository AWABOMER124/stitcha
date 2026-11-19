# Safe release operations

The web image never performs migrations or startup billing. Run APP_PROCESS_MODE=migrate explicitly once after reviewing backward-compatible migrations. The existing authenticated external runner remains the sole billing/outbox scheduler. JOB_RUNNER_ENABLED defaults to disabled; enable it only for a serving instance.

Candidate deployment and traffic switching are tested in isolated environments before production promotion. Do not replace a release image by rebuilding its tag: record and promote the exact tested image ID/digest. Preserve named upload/storage volumes and auth/encryption secrets across slots. No database restore is part of a normal application rollback.

Browser version hints preserve pages and assets, but subscription collection, Stripe callbacks and registration always use the active compatible API implementation. Do not let an old browser header select legacy annual-billing or market logic. The first legacy transition additionally keeps these capabilities on the new image during a visible legacy rollback. Private job calls retain the previous 120-second HTTP budget within the existing 150-second systemd deadline.

## Verified acceptance path

Run the unit controls with Python 3 on Linux, then the image-backed candidate journey and real Traefik traffic journey on an INTERNAL Docker network. These tests never use production credentials or published test ports. The candidate journey creates only a uniquely named isolated test database and removes it after the test.

The traffic controller checks an exact local image ID against the running container and its built APP_RELEASE, checks readiness, writes an atomic routing file plus recovery journal, verifies the serving path, and restores the old routing on failure. It preserves the previous version's deployment headers and asset query routing while that slot remains running. It does not replay POSTs or restore databases. Previous-slot replacement invalidates rollback and is rejected. This is a functional protocol test, not a capacity guarantee or an availability SLA.

## Deployment prerequisites

1. Obtain a successful CI run on the exact source commit. Release workflow is manual, main-only, and never deploys to production automatically.
2. Configure the protected production-build GitHub environment with NEXT_SERVER_ACTIONS_ENCRYPTION_KEY. The trusted-main workflow builds the image locally on the runner, then streams its archive through gzip and OpenPGP encryption to the committed production public key. Only ciphertext and non-secret provenance are uploaded, with one-day retention. The receiver private key stays in the production host's protected configuration/backup; it never enters GitHub. No owner registry token or registry publication is used. Never store the build key in Git or upload an unencrypted production archive: the image manifest contains that key.
3. Download only the artifact of a successful, owner-approved trusted-main release run. Verify its run/source commit, receiver fingerprint and encrypted SHA-256; decrypt with the host-only private key into docker load and check the loaded image ID and APP_RELEASE against the provenance. Promote that exact immutable local image ID, without rebuilding. Encryption alone does not authenticate a sender: artifacts from forks or untrusted runs are not valid releases. The development image is acceptance evidence, not an external CI release.
4. Review expand-only SQL and compatibility of both code versions and job payloads. Execute migrations once under an operator lock using APP_PROCESS_MODE=migrate. Health rejects missing migrations, but cannot prove arbitrary SQL changes are backward compatible.
5. Prepare blue/green serving slots with JOB_RUNNER_ENABLED=false. A separate private jobs instance has JOB_RUNNER_ENABLED=true. The existing timer must be pointed to run_worker.py and that worker verified before serving slots take public traffic; otherwise jobs would be disabled on the public web endpoint.
6. Preserve the existing database/network, auth keys, and named upload/private-storage volumes. Import the slot configuration into the managed Dokploy deployment and record its source of truth; do not start an unmanaged parallel production deployment. No example operator configuration is automatically installed on production.
7. Configure the controller with exact hostnames, slot releases/IDs/internal URLs, serving-path health URL, state path, and a dedicated Traefik dynamic .yml path. The generated document is JSON-compatible YAML. Never write another project's routing file. Inventory custom merchant domains as well as the platform aliases.
8. Promote only after the prior gates. Keep the previous slot and immutable assets while requests drain; schedule retirement through the release process, not a blind cleanup. Test browser draft persistence/version reload and custom-domain routing before declaring production zero-downtime rollout complete.

## Current implementation boundary

The commercial Saudi calculation is pure and dormant. It charges merchant logistics only (20 SAR plus 2% of goods for COD), no sales commission and no automatic customer charge. No Saudi carrier, contract or merchant pricing record is activated merely by adding this module.

The controller, private-worker invocation, compose template, CI and tests are prepared for review. A production cutover remains gated on a successful protected build, authenticated artifact delivery/decryption and the operational prerequisites above. Never interpret passing isolated tests as an already activated production migration.

## Registry bootstrap finding

The first GHCR attempt created only a harmless FROM scratch probe. GitHub reported it public, so the guard correctly refused to build/publish the application. No production code or secret was pushed there. A public package cannot be made private again ([GitHub documentation](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)). Protected encrypted-artifact delivery replaces the registry dependency. The registry guard remains available for separately verified private registries but is not part of the active release workflow.
