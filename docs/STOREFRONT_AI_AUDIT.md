# Storefront and AI audit

Updated: 2026-08-26

## Direct store creation

Direct registration creates the merchant, owner user and membership, main
branch, default storefront settings, and the free plan subscription in one
database transaction. Registration input is bounded and normalized, duplicate
emails are rejected, passwords use bcrypt, and Arabic-only store names receive
a stable `store-*` URL fallback instead of an empty slug.

The merchant storefront includes categories, products, prices, inventory,
featured/active status, cart, checkout, pickup/merchant delivery, public order
tracking, theme colors, welcome/banner content, social links, minimum order,
open/closed state, and mobile API projections.

## Findings fixed in this batch

- Product images existed in the database and storefront but the merchant form
  had no upload control. The form now supports ten managed images, previews,
  removal, and safe JPEG/PNG/WebP upload.
- Product image URLs now accept only managed `/uploads/` paths or HTTPS URLs.
- Uploads are content-decoded with Sharp, pixel-bounded, rotated, resized to a
  maximum 2048px edge, and normalized to WebP before storage.
- Store generation previously trusted the model JSON and trusted the draft
  posted back by the browser. Both boundaries now share and enforce one Zod
  schema before any categories or products are written.
- Direct registration now has a runtime schema instead of loose truthy checks.
- Store customization fallbacks now use the WASLA Teal/Blue palette.

## AI store generator

The merchant describes the business and Claude returns a preview containing a
name, description, slogan, primary color, welcome message, categories, and
products. Nothing is written until the merchant confirms. The application then
creates real category, product, and inventory records inside the authenticated
merchant tenant. The provider requires `ANTHROPIC_API_KEY` and fails closed when
it is missing.

The legacy distributor-facing generator remains in source only for recoverable
migration support. The distributor portal is disabled by default and is not a
public merchant acquisition path.

## AI product image studio

The product form now offers three reviewed workflows:

1. White studio: cleans exposure, edges, color balance, and background.
2. Transparent cutout: isolates the product and preserves natural edges.
3. Lifestyle scene: places the unchanged product in a merchant-described,
   photorealistic environment.

The server sends a normalized source image to the OpenAI Image Edit endpoint,
stores only the returned image in the merchant's isolated storage scope, and
returns a managed URL. Prompts explicitly preserve product shape, proportions,
colors, material, packaging, labels, logos, and readable text. Merchants must
review the preview because generative edits can still be imperfect.

The feature is fail-closed behind `AI_IMAGE_ENHANCEMENT_ENABLED=true` and also
requires `OPENAI_API_KEY`. Requests are limited to ten per merchant/IP/hour.
Original uploads remain usable when the AI provider is disabled.

## Production boundary

- Configure S3-compatible durable storage; local `public/uploads` is suitable
  only for single-instance development.
- Configure and fund the OpenAI project, verify GPT Image access, set a monthly
  project spend limit, then enable the feature flag.
- Move rate limits to a shared store before horizontal scaling.
- Add durable monthly AI-credit accounting before using plan credits for
  billing; the current `aiMonthlyCredits` entitlement is descriptive only.
- Run a product-photo acceptance set across fashion, food, cosmetics, glass,
  reflective packaging, and Arabic labels before commercial launch.
