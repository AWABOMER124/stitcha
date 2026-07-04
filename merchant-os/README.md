# Waslak Merchant OS

> SaaS operating system for merchants, restaurants, cafes, stores, pharmacies, and groceries.

## 🏗️ Architecture

**Modular Monolith** — the codebase is divided into self-contained modules with clear boundaries and dependency rules. Four portals share the same Next.js app and database:

| Portal | Route | Who |
|---|---|---|
| Merchant Dashboard | `/dashboard/*` | `MERCHANT_OWNER`, `MERCHANT_ADMIN`, and other merchant-scoped roles |
| Distributor Portal | `/distributor/*` | `DISTRIBUTOR_OWNER`, `DISTRIBUTOR_ADMIN` |
| Platform Admin | `/admin/*` | `PLATFORM_OWNER` |
| Public Storefront | `/store/[slug]/*` | Anyone — no auth required |

```
┌─────────────────────────────────────────────────┐
│              Next.js App Router                  │
│  ┌───────────┐ ┌───────────┐ ┌────────┐ ┌──────┐│
│  │ Dashboard │ │Distributor│ │ Admin  │ │ Store ││
│  │/dashboard │ │/distributor│ │/admin  │ │/store ││
│  └─────┬─────┘ └─────┬─────┘ └───┬────┘ └───┬───┘│
│        └─────────────┴────────────┴───────────┘  │
│                       │                            │
│        ┌──────────────▼──────────────────┐        │
│        │     Server Actions / API Routes  │        │
│        └──────────────┬──────────────────┘        │
│                        │                            │
│        ┌──────────────▼──────────────────┐        │
│        │         Module Services          │        │
│        └──────────────┬──────────────────┘        │
│                        │                            │
│        ┌──────────────▼──────────────────┐        │
│        │      Module Repositories         │        │
│        │  (Tenant-scoped, Decimal-safe)   │        │
│        └──────────────┬──────────────────┘        │
│                        │                            │
│        ┌──────────────▼──────────────────┐        │
│        │    Prisma ORM / PostgreSQL       │        │
│        └──────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

### Key Principles

| Principle | How |
|---|---|
| **Multi-tenancy** | Every merchant-owned entity scoped by `merchantId` (distributor-owned entities by `distributorId`). Context comes from the session, never from client input. |
| **Separation of Concerns** | UI → Actions → Services → Repositories → Prisma |
| **Module Boundaries** | Each module owns its domain, services, repos, schemas, types |
| **RBAC** | Role/permission checks at the layout level (page access) and action level (mutations) |
| **Storefront Isolation** | Public storefront has zero dependency on dashboard code |
| **Decimal safety** | Every repository return passes through `src/lib/serialization/` before crossing a Server Action or Server→Client boundary — see "Serialization rules" below |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7 |
| **Auth** | NextAuth.js v5 (Auth.js), credentials provider, JWT sessions |
| **Validation** | Zod |
| **Hosting** | Dokploy (Docker) |

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/             # Login, Register, Forgot/Reset password
│   ├── admin/               # Platform Admin portal
│   ├── distributor/         # Distributor portal
│   ├── dashboard/           # Merchant dashboard
│   ├── store/[slug]/        # Public storefront per merchant
│   └── api/
├── modules/                 # Business modules (modular monolith)
│   ├── admin/ merchants/ products/ categories/ orders/ inventory/
│   ├── customers/ crm/ branches/ delivery/ payments/ notifications/
│   ├── reports/ storefront/ users/ roles/ settings/ drivers/ finance/
│   └── tenancy/
├── components/
│   ├── dashboard/ distributor/ admin/ storefront/  # portal-specific components
│   └── providers.tsx        # SessionProvider — required for any component using useSession()
├── lib/
│   ├── db/                  # Prisma singleton
│   ├── auth/                # NextAuth config, session helpers, guards
│   ├── permissions.ts        # RBAC checks
│   ├── errors/               # AppError hierarchy + handleActionError
│   ├── serialization/         # Decimal/Date-safe serializers (see below)
│   └── logger.ts              # Structured server-side logger
├── services/
│   ├── notifications/        # Notification providers (console-mock today)
│   └── storage/               # File storage providers (local + S3)
└── types/
```

### Module Pattern

```
modules/{name}/
├── schemas/          # Zod input validation
├── repositories/     # Data access (Prisma queries, always tenant-scoped, Decimal-safe)
├── services/         # Business logic
├── types.ts
├── actions.ts        # 'use server' entry points
└── index.ts
```

## 🔒 Tenant security rules

1. **Every merchant-scoped query must include `merchantId` in its `where` clause** (distributor-scoped: `distributorId`). Never trust a client-supplied ID alone — for `update`/`delete`, either verify ownership first (`findFirst({ id, merchantId })` then act) or scope the mutation itself with `updateMany`/`deleteMany({ where: { id, merchantId } })` so the database enforces it regardless of what called it.
2. **Layouts, not just UI, enforce role access.** `dashboard/layout.tsx`, `distributor/layout.tsx`, and `admin/layout.tsx` all redirect based on `session.user.role` — this is a server-side check on every request, not a client-side hide.
3. **`getCurrentMerchant()` / `getCurrentDistributor()` (`src/lib/auth/session.ts`) throw if the session has no tenant context** — use these (or the `withMerchant`/`withPermission` wrappers in `src/lib/auth/guards.ts`) rather than reading `session.user.merchantId` ad hoc.
4. If you add a new mutation, ask: *could a logged-in user of Merchant A pass Merchant B's ID and have this succeed?* If yes, it's an IDOR — scope the query.

## 🧮 Serialization rules

Prisma's `Decimal` type (used for all money/rate/rating fields) is not serializable across a Server Action boundary or as a prop from a Server Component to a `'use client'` component — Next.js throws mid-stream, which surfaces to users as a blank "page couldn't load" error, not a normal error message.

**Rule: any repository function that returns a Prisma result containing a `Decimal` field must wrap it before returning:**

```ts
import { serializePrismaObject, serializePrismaArray } from '@/lib/serialization';

export async function getThing(merchantId: string) {
  const thing = await prisma.thing.findFirst({ where: { merchantId } });
  return serializePrismaObject(thing); // handles null, nested objects/arrays, Decimal → number
}
```

Run `sh scripts/check-raw-prisma-returns.sh` before shipping — it's a heuristic grep for repository functions that `return prisma....` directly without an intermediate serialize step. Expect occasional false positives for models with no Decimal field; treat a clean run as "nothing obviously new," not a correctness guarantee.

## 🗄️ Database

Prisma schema at `prisma/schema.prisma` — 40+ models, 20+ enums. Core models: `User`, `Merchant`, `Distributor`, `MerchantUser`/`DistributorUser`, `Product`/`Category`, `Order`/`OrderItem` (with price snapshots — order totals never recompute from current product prices), `InventoryItem`/`StockMovement`, `Customer`/`CustomerAddress`, `Delivery`/`Payment`, `CommissionPlan`/`Settlement`/`FinancialTransaction`, `Driver`/`DriverAssignment`/`DriverEarning`, `NotificationLog`, `StorefrontSettings`, `PasswordResetToken`.

### Roles

| Role | Portal |
|---|---|
| `PLATFORM_OWNER` | Admin — full platform access |
| `DISTRIBUTOR_OWNER` / `DISTRIBUTOR_ADMIN` | Distributor portal |
| `MERCHANT_OWNER` / `MERCHANT_ADMIN` | Dashboard — full merchant access |
| `BRANCH_MANAGER`, `CASHIER`, `INVENTORY_MANAGER`, `DELIVERY_STAFF`, `CUSTOMER_SERVICE`, `FINANCE_AGENT` | Dashboard — scoped by permission |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+, PostgreSQL, npm

### Setup

```bash
cd merchant-os
npm install
cp .env.example .env       # edit DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL

npx prisma generate
npx prisma migrate deploy  # applies committed migrations — do NOT use `db push` in shared environments

npm run dev
```

### Seeding demo data (dev/staging only — never production)

`prisma/seed.ts` **deletes existing orders, products, customers, and most operational tables** before inserting demo data. It refuses to run when `NODE_ENV=production` unless you explicitly set `ALLOW_SEED=true`:

```bash
npx prisma db seed          # dev/staging
ALLOW_SEED=true npx prisma db seed   # explicit override, only if you're certain
```

Demo login after seeding: `admin@waslak.com` / `admin123`, store at `/store/chef-restaurant`. (The production admin account, if any, is created separately and does **not** use this password.)

## 🌐 Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | NextAuth session secret |
| `NEXTAUTH_URL` | Yes | Public app URL, used by NextAuth |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL, used in emails/links (e.g. password reset) |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_CDN_URL` | No | If unset, file uploads fall back to local disk storage (`public/uploads/`) — fine for a single instance, not for multi-instance/ephemeral hosting |
| `ANTHROPIC_API_KEY` | No | Powers `/api/ai/generate-store`; the route returns a clean 503 if unset |
| `RESEND_API_KEY` / `SENDGRID_API_KEY` | No | Not yet wired to a real provider — see Known Limitations |
| `TWILIO_ACCOUNT_SID` / `AFRICASTALKING_API_KEY` | No | Same — SMS is console-mocked today |
| `ALLOW_SEED` | No | Must be `true` to run `db seed` when `NODE_ENV=production` |

## 🐳 Deployment

**Two Dockerfiles exist on purpose, not by accident** — keep both in sync if you change build/runtime logic:

- **`../Dockerfile`** (repo root) — what Dokploy actually builds in production. Build context is the repo root; `COPY` paths are prefixed with `merchant-os/`.
- **`Dockerfile`** (this folder) — used by `./docker-compose.yml` for local full-stack testing (`app` + `db` + `nginx`) without touching production. Build context is this folder; no path prefix.

Both need a placeholder `DATABASE_URL` set as a build-stage `ENV` — `prisma.config.ts` resolves it eagerly via `env()` even for `prisma generate`/`next build`, which don't need a live connection, and `.env` is intentionally excluded from the build context.

`entrypoint.sh` runs `prisma migrate deploy` then `npm start` on every boot — it never runs `db seed`.

## 🧪 Manual test checklist

No automated test suite exists yet (see Known Limitations). Before shipping a change, exercise:

- `/login` → correct redirect per role (`PLATFORM_OWNER` → `/admin`, distributor roles → `/distributor/dashboard`, merchant roles → `/dashboard`)
- `/forgot-password` → `/reset-password?token=...` → new password works on next login
- `/dashboard` as a non-merchant role → rejected and redirected correctly
- `/dashboard/products`, `/dashboard/categories`, `/dashboard/inventory` → create/edit/delete, no crash
- `/dashboard/finance`, `/dashboard/reports` → load without error
- `/distributor/drivers` → add a driver, open their detail page
- `/store/{merchantSlug}` with at least one priced product → loads, add to cart, checkout completes
- `sh scripts/check-raw-prisma-returns.sh` → review any new matches

## ⚠️ Known Limitations

- **Email/SMS are console-mocks.** `src/services/notifications/providers/{email,sms}.provider.ts` log to console/`NotificationLog` instead of sending real messages. Swap in a real provider by implementing `NotificationProvider` and updating `src/services/notifications/index.ts` — no other call site needs to change.
- **File storage defaults to local disk** unless `S3_*` env vars are set — not durable across redeploys on ephemeral hosting.
- **AI storefront generator is unconfigured** without `ANTHROPIC_API_KEY` (fails gracefully with a 503, doesn't crash).
- **No automated tests.** `scripts/check-raw-prisma-returns.sh` is a lightweight heuristic guard, not a substitute for real test coverage.
- Several dashboard action patterns catch errors ad hoc (`e instanceof Error ? e.message : 'Failed'`) rather than going through the centralized `handleActionError` (`src/lib/errors/handler.ts`) — functionally fine today, but a good target for consolidation so error logging and message-masking stay consistent everywhere.

## 📐 Architecture Decisions

1. **Modular Monolith over Microservices** — simplicity at this stage; modules can be extracted later.
2. **Row-level Tenancy** — `merchantId`/`distributorId` on every business entity, not separate databases.
3. **Server Actions** — used instead of a REST API for the dashboard/admin/distributor portals; route handlers exist for auth and public/webhook-style endpoints.
4. **Product Snapshots in Orders** — `OrderItem.productSnapshot`/`unitPrice`/`total` are written once at order-creation time and are authoritative; historical orders never recompute from live product prices.
5. **Status Machine** — orders follow a strict state machine with validated transitions (`src/modules/orders/services/orders.service.ts`).
6. **Service → Repository pattern** — no direct Prisma calls from UI or actions; repositories are also the single place Decimal serialization is applied.

## Scope

This product is a **Merchant SaaS + generated storefront**. Marketplace discovery, a customer-facing mobile app, and a driver mobile app are explicitly out of scope for the current architecture — anything suggesting otherwise in older docs/commit history is stale.

## 📝 License

Private — Waslak © 2024–2026
