# Dokploy VPS deployment

This is the production runbook for the Merchant OS container. Dokploy must use
the repository root as its build context and the root `Dockerfile`; the second
Dockerfile under `merchant-os/` is for local Compose only.

## Dokploy application settings

- Source branch: the reviewed release branch or `main` after merge.
- Build context: repository root (`.`).
- Dockerfile: `Dockerfile`.
- Container port: `3000`.
- Health path: `/api/health` (HTTP 200 means the app can reach PostgreSQL).
- Replicas: one until shared rate limiting, cache coordination, and durable
  object storage are configured.
- Build argument: set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin. This
  value is compiled into browser-visible links and metadata.
- Recommended minimum builder capacity: 1 vCPU and 2 GB RAM (or swap). The
  Next.js build is intentionally constrained to one worker for small VPS hosts.

The image starts as an unprivileged UID/GID `1001`, applies committed Prisma
migrations, and then starts Next.js. It never seeds production data.
The runtime is Node.js 24 LTS, matching the current Prisma dependency engine
requirements and the version used by CI.

## Required runtime environment

Set these in Dokploy; never commit their real values:

```text
DATABASE_URL=postgresql://...
AUTH_SECRET=<at least 32 random bytes>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://your-domain.example
NEXT_PUBLIC_APP_URL=https://your-domain.example
SECRETS_ENCRYPTION_KEY=<long independent random value>
JOB_RUNNER_SECRET=<independent random value>
PLATFORM_DELIVERY_ENABLED=false
DISTRIBUTOR_PORTAL_ENABLED=false
AI_IMAGE_ENHANCEMENT_ENABLED=false
```

Keep `ALLOW_SEED` unset. Configure the Dokploy proxy for HTTPS and the final
domain before testing authentication callbacks.

## Durable product-image storage

For the AI image studio, S3-compatible object storage is recommended:

```text
S3_BUCKET=...
S3_REGION=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_CDN_URL=https://public-image-origin.example
S3_ENDPOINT=https://s3-compatible-endpoint.example   # only when non-AWS
S3_FORCE_PATH_STYLE=false                            # true for providers that require it
```

`S3_CDN_URL` must be a public HTTPS origin because saved product URLs are shown
in the public storefront. If local storage is used instead, attach a persistent
Dokploy volume to `/app/public/uploads` and make it writable by UID/GID `1001`.
Without S3 or that volume, uploaded images disappear on container replacement.

## AI configuration

Store generation requires `ANTHROPIC_API_KEY`. Product-image enhancement
requires `OPENAI_API_KEY` and optionally `OPENAI_IMAGE_MODEL` (default:
`gpt-image-2`). Keep `AI_IMAGE_ENHANCEMENT_ENABLED=false` for the first deploy;
enable it only after storage, provider access, spend limits, and real-product
acceptance tests pass.

## Safe upgrade sequence

1. Take and verify a PostgreSQL backup/snapshot.
2. Record the currently deployed image/commit for rollback.
3. Deploy one application replica with all feature flags still disabled.
4. Watch startup logs until `prisma migrate deploy` and application start both
   succeed. Never use `prisma db push` or `prisma db seed` in production.
5. Verify `/api/health`, `/login`, `/register`, one public storefront, merchant
   login, product creation, original image upload, and an order read/write flow.
6. Verify an uploaded image remains available after a container restart.
7. Configure provider keys and test AI store generation without applying the
   draft, then apply a small test draft.
8. Enable image AI, improve one disposable product image, verify the stored
   result and public storefront, then monitor provider cost and application logs.

## Rollback

Disable `AI_IMAGE_ENHANCEMENT_ENABLED` first if the image provider or storage
fails. Roll back to the recorded application image/commit and keep the database
backup untouched. This release adds no new database migration, so reverting the
application image does not require a schema rollback. Investigate logs and
health checks before retrying the rollout.
