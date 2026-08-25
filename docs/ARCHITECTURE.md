# Architecture

## System context

Waslak is a B2B2C platform with five main actors:

1. Platform administrators manage distributors, global settings, and oversight.
2. Distributors onboard merchants and coordinate finance and delivery capacity.
3. Merchants manage catalogue, inventory, orders, customers, staff, and storefront.
4. Drivers receive assignments and publish authenticated location updates.
5. Customers browse storefronts or the Flutter application and place orders.

## Merchant OS

`merchant-os/` is a Next.js 16 modular monolith using TypeScript, PostgreSQL,
Prisma, Auth.js, Zod, and Tailwind CSS.

The expected dependency flow is:

```text
Page / Route / Server Action
        ↓
Module action or API adapter
        ↓
Domain service
        ↓
Tenant-scoped repository
        ↓
Prisma / PostgreSQL
```

Cross-tenant identifiers from request bodies must never establish tenancy.
Merchant or distributor context comes from the authenticated session or from a
validated public resource such as a storefront slug.

Public route handlers must validate input, rate-limit abuse-sensitive actions,
avoid leaking internal exceptions, and return the smallest required data shape.

## Flutter customer application

The Flutter app uses feature-first folders, Riverpod, GoRouter, Dio, Firebase
Messaging, secure storage, and generated Freezed/JSON models.

`API_BASE_URL` is the deployment boundary. Debug builds may use the Android
emulator host alias; release builds must receive an explicit HTTPS endpoint.

API models intentionally represent nullable backend fields as nullable. UI
components must render honest unavailable/empty states rather than invented
ratings, images, fees, locations, or ETAs.

## Authentication boundaries

- Staff portals use Auth.js credential sessions and role/tenant context.
- Flutter customers use 15-minute access tokens backed by revocable server-side
  sessions. Opaque 30-day refresh tokens rotate on every use; only their
  SHA-256 hashes are stored, and reuse revokes the complete token family.
- Drivers use a distinct per-driver location token.
- Public storefront browsing is anonymous, while sensitive order/customer data
  requires either ownership authentication or a scoped, short-lived token.

Flutter serializes concurrent refresh attempts, retries a failed protected
request once, and clears local credentials when rotation fails. Logout revokes
the server-side session before clearing secure device storage.

## Deployment

The production container runs as a non-root user behind a controlled reverse
proxy. Database migrations execute through the container entrypoint. Persistent
uploads require S3-compatible storage; local disk is suitable only for a single,
persistent development instance.
