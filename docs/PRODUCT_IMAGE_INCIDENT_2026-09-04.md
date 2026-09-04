# Product image incident — 2026-09-04

## Impact

The newly onboarded `ZENO_BRAND` storefront displayed the generic product
placeholder for every product. Product names, categories, prices, the store
logo, and the banner continued to render.

## Production evidence

- `/api/health` reported release `576a6c8937e910a896ed0fff0551a34499b1d8d0`.
- `/api/stores/cmtmulgcf000o01qd9ho0p7lt/products` returned nine products with
  `imageUrl: null`.
- The store logo under `/uploads/...` returned HTTP 200 with `image/webp`.

This rules out the public storefront renderer and a general storage-read
failure for this incident. The product records did not contain image paths.

## Root cause

The product form showed a local browser preview immediately after file
selection, but the file was not uploaded or added to the product payload until
the merchant separately clicked **Use original**. The product save button
remained enabled during upload. A merchant could therefore reasonably see the
preview, save the product, and persist an empty `images` array.

## Remediation

- Selecting a valid image now starts the original-image upload immediately.
- Product saving is disabled while an image upload or enhancement is running.
- A visible confirmation states that the image was uploaded and will be saved
  with the product.
- Duplicate URLs are not added to the image list.
- Retrying and AI enhancement remain available.
- Persisted image URL normalization now trims whitespace and repairs
  protocol-relative CDN URLs.
- `/api/health` now reports the public storage provider and whether local
  durability was explicitly declared.
- Production emits a warning when local uploads are used without
  `PUBLIC_UPLOADS_PERSISTENT=true`.

## Existing ZENO products

The database rows currently contain no image URL to reconnect. After deploying
this fix, the merchant should edit each affected product, select its image, wait
for the green upload confirmation, and save. If original files were uploaded in
an earlier attempt, they still cannot be safely matched to products without a
stored association; do not guess mappings from filenames.

## Deployment verification

1. Deploy the latest `main`, not release `576a6c8`.
2. Confirm `/api/health` reports the deployed commit and
   `storage.durabilityDeclared: true` (or `storage.provider: s3`).
3. Create a test product by selecting an image and immediately observing the
   automatic upload state.
4. Save it, open the public storefront, and confirm the image request returns
   HTTP 200.
5. Restart/redeploy the container and confirm the same URL still returns 200.

## Frontend audit

The current `main` exposes the latest work in all three surfaces:

- Public page: Basic, Growth, and Pro presentation, affiliate acquisition,
  AI value proposition, registration calls to action, Arabic/English content.
- Merchant dashboard: AI Copilot, AI store generation/edit/version history,
  subscription and quota view, exports, invoices, KYC, domains, affiliate and
  referral tools, delivery partners, inbox, and complaints.
- Admin dashboard: plans and entitlement configuration, tenant overrides,
  AI usage/cost, subscription payments, verification, domains, marketers,
  referrals, delivery partners, merchants, complaints, and finance.

The production frontend will not show that complete set until Dokploy builds
the current main branch and `APP_RELEASE` is set to that commit SHA.
