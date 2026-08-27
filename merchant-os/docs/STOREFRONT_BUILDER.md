# WASLA Storefront Builder

## What merchants can do

- Upload a store logo and hero banner directly from the dashboard. External image URLs are no longer required.
- Start from one of three ready templates: Wasla Modern, Elegant Boutique, or Fast Food.
- Drag and drop eight storefront sections: announcement, hero, trust points, categories, featured products, product catalog, testimonials, and contact.
- Hide or restore individual storefront sections.
- Preview the storefront immediately in mobile and desktop widths.
- Edit hero and testimonial copy, three trust points, hero/card layouts, colors, ordering options, and social channels beside the live preview.
- Publish all changes atomically with the **Save changes** button.

Builder configuration is stored in the existing `StorefrontSettings.theme` JSON field to remain backwards compatible:

```json
{
  "templateId": "wasla-modern",
  "primaryColor": "#0f766e",
  "accentColor": "#3b82f6",
  "surfaceColor": "#f8fafc",
  "sectionOrder": ["announcement", "hero", "trust", "categories", "featured", "products", "testimonials", "social"],
  "hiddenSections": [],
  "heroStyle": "split",
  "productCardStyle": "soft"
}
```

Legacy three-section themes are upgraded at read time and normalized again when saved, so this release needs no database migration.

The merchant logo is stored in `Merchant.logo`; the banner remains in `StorefrontSettings.bannerImage`. Legacy `theme.logoUrl` values remain readable by the public storefront.

## Upload flow

`POST /api/storefront/assets/upload` accepts authenticated `multipart/form-data` with:

- `image`: JPEG, PNG, or WebP up to 5 MB.
- `assetType`: `logo` or `banner`.

Images are decoded, orientation-normalized, bounded to 2048×2048, converted to WebP, and stored under a merchant-isolated scope. The route requires `settings:update` and is rate limited.

`GET /uploads/[...path]` serves runtime uploads safely in the production image. Saved localhost upload URLs are converted to same-origin URLs in the UI, and failed assets render a deliberate placeholder instead of a broken-image icon. Existing files that were already deleted by an earlier container replacement cannot be reconstructed and must be uploaded again.

## Public store URL

Merchant-facing share links are derived from the trusted forwarded production host when the configured URL is missing or points to localhost. The production container also defaults its public build URL to `https://wassla-sd.shop`; deployments using another domain should pass `NEXT_PUBLIC_APP_URL` explicitly.

## Production storage

The builder works with local storage during development. Production must use either:

1. S3-compatible object storage through the documented `S3_*` environment variables (recommended), or
2. a persistent Dokploy volume mounted at `/app/public/uploads` and writable by UID/GID `1001`.

Without one of these options, uploaded assets can be lost when the container is replaced.

## Next iterations

- Add reusable content blocks such as image galleries, video, brands, and promotional tiles.
- Add multiple banners with scheduling and links.
- Add undo/redo, autosave drafts, and version history.
- Add responsive per-section settings and advanced typography controls to paid plans.
