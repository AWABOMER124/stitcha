# WASLA production readiness — 2026-10-29

This record documents the production stabilization pass deployed before the first merchant acquisition campaign. It intentionally excludes credentials, tokens, account numbers, and personal data.

## Deployed versions

- WASLA application: `0f3bc3fe9e4f80b1d65411ba21ccd4f85131e2af`
- Readiness documentation and reusable checks: `545306fc6777c90ba289053d52d7d499571d36f7`
- AI Gateway: `4778a3e7e1bd71d66652804d981e6adf2419b49e`
- Public application: `https://wassla-sd.shop`
- Mail domain: `mail.wassla-sd.shop` (verified by Resend)

## Completed controls

### Application readiness

- `/api/health` reports application, database, durable storage, release identity, email, AI Core, and image-enhancement readiness without exposing secrets.
- The deployed response reported `status=ok` and `readiness=ready`.
- The homepage and sitemap both returned HTTP 200 after deployment.
- The dynamic sitemap included active public storefront URLs.
- Dashboard and admin storefront links are only shown for active merchants, preventing users from being sent to unpublished 404 storefronts.

### Email delivery

- A least-privilege Resend key with sending-only access is configured in Dokploy.
- The sender uses the verified `mail.wassla-sd.shop` domain.
- A production diagnostic email was accepted by Resend successfully.
- Never print or commit the Resend key. Rotate it in Resend and Dokploy if it is exposed.

### AI services

- AI Core tenant rollout is enabled for all eligible WASLA merchants through the platform entitlement layer.
- AI Core health and signed service-JWT contract passed; seven WASLA tools were returned.
- Copilot inference passed and returned a non-empty Arabic answer.
- Image enhancement passed using a locally generated synthetic product image and returned a valid WebP image.
- Reusable checks:

```bash
npm run ai:readiness
npm run ai:readiness:copilot
npm run ai:readiness:image
```

The checks require `AI_CORE_BASE_URL`, `AI_CORE_SECRET_WASLA`, and an appropriate timeout. They do not contain production secrets.

### Backups and restore

- The encrypted daily Google Drive backup schedule is enabled.
- The backup covers PostgreSQL, persistent uploads, and Dokploy configuration.
- Three fresh encrypted backup artifacts were independently verified in Google Drive.
- Database restore and file restore drills completed successfully in isolated temporary targets; production data was not overwritten.
- Retention is currently short-term and should be replaced with a dedicated object-storage destination when the launch budget allows.

### Build and automated checks

- ESLint passed.
- 404 automated tests across 77 files passed locally.
- The production build generated all 99 application routes successfully.
- GitHub Actions passed for WASLA, its production-container smoke test, Flutter, and AI Gateway.
- Dokploy completed the WASLA deployment with status `done`.

## Operational observations

- Dokploy HTTPS is configured at `https://admin.perfect-team.cloud` with a valid certificate.
- The direct Dokploy port remains reachable. Restrict TCP port 3000 at the VPS firewall after confirming SSH/recovery access; keep only HTTPS through Traefik public.
- Server disk usage was approximately 78% during this review. Docker cleanup is scheduled, but alerts and a safe cleanup run should be reviewed before usage exceeds 85%.
- Dokploy was running v0.30.0 and displayed an available update. Upgrade only after a fresh backup and a tested rollback window because infrastructure upgrades can affect authentication, deployments, and stored configuration.
- Rotate any infrastructure credentials previously shared in chat or screenshots after the launch stabilization window.

## Release verification checklist

Run after every production deployment:

1. Confirm the Dokploy deployment status is `done` and the commit matches the intended release.
2. Request `/api/health`; require `status=ok`, `readiness=ready`, and the expected release SHA.
3. Confirm database, durable storage, email, AI Core, and image enhancement checks are true.
4. Request `/` and `/sitemap.xml`; require HTTP 200.
5. Run the three AI readiness scripts when the AI Gateway or its secrets change.
6. Send one controlled email diagnostic after changing Resend credentials or the mail domain.
7. Confirm the latest encrypted backup exists and periodically repeat isolated restore drills.

## Remaining launch follow-ups

- Restrict external access to Dokploy port 3000 using the VPS firewall without locking out recovery access.
- Plan a controlled Dokploy upgrade after reviewing release notes and security advisories.
- Add disk, failed-deployment, failed-backup, and application-readiness notifications.
- Move backup retention from the temporary Google Drive arrangement to dedicated S3-compatible object storage.
- Perform one merchant-session smoke test for product upload, AI enhancement, storefront publish, checkout, and order creation before each marketing batch.
