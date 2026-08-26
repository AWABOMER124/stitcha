# WASLA rebrand audit

Updated: 2026-08-26

## Public identity coverage

- Web metadata, browser/PWA identity, auth, merchant dashboard, admin, legacy
  portal label, storefront attribution, settings, plans, email/notification
  copy, AI support prompt, product pages, README, and operating docs now use
  `WASLA | وصلة` or `WASLA Commerce OS`.
- Flutter display names, splash, login/signup/profile copy, localization,
  Windows/Linux window titles, Android/iOS display names, web manifest,
  favicon, and Android/iOS/Web icons use WASLA.
- The logo system lives under `merchant-os/public/brand/`; the connected-path
  mark is also implemented natively for React and Flutter.
- Web brand content is centralized in `merchant-os/src/config/brand.config.ts`.
  Flutter brand content is centralized in `lib/core/brand/brand_config.dart`.
- Web semantic theme tokens live in `merchant-os/src/app/globals.css`; Flutter
  palette tokens live in `lib/core/theme/app_colors.dart`.

## Legacy identifiers deliberately retained

These are not user-facing and changing them would require migration or could
break production integrations:

- Dart package name/imports `wassalk_app` and desktop binary/project names.
- Android application ID/namespace and iOS/macOS bundle identifiers.
- Firebase project, app, storage bucket, and generated Firebase options.
- FCM channel key `wassalk_orders` to preserve installed-device settings.
- PostgreSQL/Docker database/user defaults containing `waslak` or `wassalk`.
- Auth locale cookie `waslak_locale`, encryption salt, internal placeholder
  email domain, seeded admin email, and historical migration contents.
- Database/API enum `WASLAK_DELIVERY` and its validation/test references.
- Historical external API examples such as `api.wassalk.com` and
  `X-Wassalk-Signature`; these require a versioned contract/domain migration.

## Asset notes

The checked-in SVG connected-path logo is the production placeholder and has
no gradient, cart, truck, package, chain, globe, or plug motif. The reproducible
icon generator creates Android, iOS, macOS, and web PNG sizes from that source.
Windows `.ico` remains the legacy binary asset until a final signed ICO is
supplied; the visible Windows title and version-resource text are WASLA.

## Search classification

- Category A: all remaining code matches listed above are deliberate legacy
  identifiers or external contracts.
- Category B: historical migrations remain immutable.
- Category C: no known user-visible old-brand string remains in active source.
