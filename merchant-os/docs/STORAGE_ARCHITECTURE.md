# Public and private storage

WASLA uses two intentionally separate storage boundaries.

## Public assets

`publicStorageService` (and its backwards-compatible alias `storageService`) stores storefront logos, banners, and product images. In production these objects may be served through an allow-listed CDN.

Configure it with the existing `S3_*` variables. Without a bucket it falls back to `public/uploads` for local development only.

## Private evidence

`privateStorageService` stores payment receipts, bank-transfer evidence, proof of delivery, and other sensitive documents. It never returns an origin or CDN URL. An authenticated application route must first verify ownership/role, then call `download()` and stream the bytes with `Cache-Control: private, no-store`.

Configure a separate private bucket with:

- `PRIVATE_S3_BUCKET`
- `PRIVATE_S3_REGION`
- `PRIVATE_S3_ACCESS_KEY` / `PRIVATE_S3_SECRET_KEY` (optional when the public credentials can access the private bucket)
- `PRIVATE_S3_ENDPOINT`
- `PRIVATE_S3_FORCE_PATH_STYLE`

Without a private bucket, development files are written outside the public web root at `storage/private`. This local fallback is not a production durability guarantee.

## Production rules

- Use separate public and private DigitalOcean Spaces buckets.
- Enable CDN only for the public bucket.
- Keep the private bucket and every private object non-public.
- Use scoped object keys and database ownership records; never authorize a download from a raw object key supplied by a browser.
- Permit JPEG, PNG, WebP, and PDF only; the current private limit is 10 MB.
- Configure bucket versioning/lifecycle and an independent backup because object storage is not itself a backup policy.
- Rotate access keys and use the narrowest bucket access available.
