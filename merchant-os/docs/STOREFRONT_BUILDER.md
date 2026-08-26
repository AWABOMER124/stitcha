# WASLA Storefront Builder

## What merchants can do

- Upload a store logo and hero banner directly from the dashboard. External image URLs are no longer required.
- Drag and drop the hero, category navigation, and product catalog to change their storefront order.
- Hide or restore individual storefront sections.
- Preview the storefront immediately in mobile and desktop widths.
- Edit colors, welcome copy, ordering options, and social channels beside the live preview.
- Publish all changes atomically with the **Save changes** button.

Builder configuration is stored in the existing `StorefrontSettings.theme` JSON field to remain backwards compatible:

```json
{
  "primaryColor": "#13c4a3",
  "accentColor": "#3b82f6",
  "sectionOrder": ["hero", "categories", "products"],
  "hiddenSections": []
}
```

The merchant logo is stored in `Merchant.logo`; the banner remains in `StorefrontSettings.bannerImage`. Legacy `theme.logoUrl` values remain readable by the public storefront.

## Upload flow

`POST /api/storefront/assets/upload` accepts authenticated `multipart/form-data` with:

- `image`: JPEG, PNG, or WebP up to 5 MB.
- `assetType`: `logo` or `banner`.

Images are decoded, orientation-normalized, bounded to 2048×2048, converted to WebP, and stored under a merchant-isolated scope. The route requires `settings:update` and is rate limited.

## Production storage

The builder works with local storage during development. Production must use either:

1. S3-compatible object storage through the documented `S3_*` environment variables (recommended), or
2. a persistent Dokploy volume mounted at `/app/public/uploads` and writable by UID/GID `1001`.

Without one of these options, uploaded assets can be lost when the container is replaced.

## Next iterations

- Add reusable content blocks such as testimonials, image galleries, video, brands, and promotional tiles.
- Add multiple banners with scheduling and links.
- Add templates and saved theme presets.
- Add undo/redo, autosave drafts, and version history.
- Add responsive per-section settings and advanced typography controls to paid plans.
