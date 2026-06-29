# Waslak Merchant OS

> SaaS operating system for merchants, restaurants, cafes, stores, pharmacies, and groceries.

## 🏗️ Architecture

**Modular Monolith** — the codebase is divided into self-contained modules with clear boundaries and dependency rules.

```
┌─────────────────────────────────────────────────┐
│              Next.js App Router                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │  Dashboard    │  │  Storefront  │             │
│  │  /dashboard/* │  │  /store/*    │             │
│  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                     │
│  ┌──────▼──────────────────▼───────┐            │
│  │     Server Actions / API Routes  │            │
│  └──────────────┬──────────────────┘            │
│                 │                                │
│  ┌──────────────▼──────────────────┐            │
│  │         Module Services          │            │
│  │  products │ orders │ inventory   │            │
│  └──────────────┬──────────────────┘            │
│                 │                                │
│  ┌──────────────▼──────────────────┐            │
│  │      Module Repositories         │            │
│  │  (Tenant-scoped Prisma queries)  │            │
│  └──────────────┬──────────────────┘            │
│                 │                                │
│  ┌──────────────▼──────────────────┐            │
│  │    Prisma ORM / PostgreSQL       │            │
│  └──────────────────────────────────┘            │
└─────────────────────────────────────────────────┘
```

### Key Principles

| Principle | How |
|---|---|
| **Multi-tenancy** | Every entity scoped by `merchantId`. Tenant context injected via session. |
| **Separation of Concerns** | UI → Actions → Services → Repositories → Prisma |
| **Module Boundaries** | Each module owns its domain, services, repos, schemas, types |
| **RBAC** | Permission-based access control checked at action layer |
| **Storefront Isolation** | Public storefront has zero dependency on dashboard code |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15+ (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Auth** | NextAuth.js v5 (Auth.js) |
| **Validation** | Zod |
| **UI Components** | shadcn/ui (planned) |

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register
│   ├── dashboard/          # Merchant dashboard (protected)
│   │   ├── products/
│   │   ├── orders/
│   │   ├── categories/
│   │   ├── inventory/
│   │   ├── customers/
│   │   └── ...
│   ├── store/[slug]/       # Public storefront per merchant
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── order/[orderId]/
│   └── api/
├── modules/                # Business modules (modular monolith)
│   ├── tenancy/            # Tenant context & resolution
│   ├── merchants/          # Merchant CRUD & onboarding
│   ├── products/           # Product catalog management
│   ├── categories/         # Category management
│   ├── orders/             # Order lifecycle management
│   ├── inventory/          # Stock tracking & movements
│   ├── customers/          # Customer CRM
│   ├── branches/           # Branch/location management
│   ├── delivery/           # Delivery tracking
│   ├── payments/           # Payment recording
│   ├── notifications/      # Notification service
│   ├── reports/            # Analytics & reports
│   ├── storefront/         # Public store data access
│   ├── users/              # User management
│   ├── roles/              # Role & permission management
│   └── settings/           # Merchant & storefront settings
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   ├── storefront/         # Storefront-specific components
│   └── shared/             # Shared components
├── lib/                    # Core libraries
│   ├── db/                 # Prisma singleton
│   ├── auth/               # NextAuth config & helpers
│   ├── permissions/        # RBAC constants & checkers
│   ├── errors/             # Custom error classes
│   ├── utils/              # Utility functions
│   └── validation/         # Shared Zod schemas
├── services/               # Cross-cutting services
│   ├── notifications/      # Notification providers
│   ├── storage/            # File storage providers
│   └── queue/              # Job queue (stub)
├── types/                  # Global TypeScript types
└── config/                 # App configuration
```

### Module Pattern

Each module follows a consistent internal structure:

```
modules/{name}/
├── schemas/          # Zod input validation
├── repositories/     # Data access (Prisma queries, always tenant-scoped)
├── services/         # Business logic
├── types.ts          # Module-specific types
├── actions.ts        # Server actions (entry points)
└── index.ts          # Public API (barrel export)
```

## 🗄️ Database

**23 models** with **11 enums** — see `prisma/schema.prisma` for full details.

### Core Models

- **User** — Platform users (can belong to multiple merchants)
- **Merchant** — The tenant boundary
- **MerchantUser** — User-Merchant join with role
- **Product** / **Category** — Catalog with modifiers support
- **Order** / **OrderItem** — Full lifecycle with status history
- **InventoryItem** / **StockMovement** — Stock tracking
- **Customer** / **CustomerAddress** — CRM
- **Delivery** / **Payment** — Logistics & payments
- **NotificationLog** — Notification audit trail
- **StorefrontSettings** — Per-merchant store config

### Roles

| Role | Access Level |
|---|---|
| `PLATFORM_OWNER` | All permissions (super admin) |
| `MERCHANT_OWNER` | Full merchant access |
| `MERCHANT_ADMIN` | All except role management |
| `BRANCH_MANAGER` | Orders, inventory, customers |
| `CASHIER` | Orders + customer lookup |
| `INVENTORY_MANAGER` | Inventory + product read |
| `DELIVERY_STAFF` | Delivery + order read |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm

### Setup

```bash
# Navigate to project
cd merchant-os

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your database URL
# DATABASE_URL="postgresql://user:password@localhost:5432/waslak_merchant_os"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Seed demo data
npx prisma db seed

# Start development server
npm run dev
```

### Demo Credentials

- **Email:** admin@waslak.com
- **Password:** admin123
- **Store URL:** http://localhost:3000/store/chef-restaurant

## 🗺️ Roadmap

### Phase 1 — Foundation ✅
- [x] Project setup (Next.js, TypeScript, Tailwind)
- [x] Database schema (23 models, 11 enums)
- [x] Multi-tenant architecture
- [x] Auth with RBAC
- [x] Module scaffolding (16 modules)
- [x] Dashboard shell
- [x] Storefront shell
- [x] Core CRUD (products, categories, orders)

### Phase 2 — Core Features (Next)
- [ ] Full CRUD UI for all entities
- [ ] Real-time order notifications
- [ ] Image upload for products
- [ ] Working cart & checkout flow
- [ ] Order detail management page
- [ ] Inventory adjustment UI

### Phase 3 — Enhancement
- [ ] shadcn/ui component integration
- [ ] Dashboard analytics charts
- [ ] Advanced order filtering
- [ ] Customer order history view
- [ ] Email/SMS notification providers
- [ ] Arabic (RTL) support

### Phase 4 — Growth
- [ ] Marketplace discovery page
- [ ] Customer mobile app API
- [ ] Driver app API
- [ ] POS integration
- [ ] Payment gateway integration
- [ ] Advanced inventory (batches, expiry)
- [ ] AI customer support chatbot

## 📐 Architecture Decisions

1. **Modular Monolith over Microservices** — Simplicity at this stage; modules can be extracted later.
2. **Row-level Tenancy** — `merchantId` on every business entity, not separate databases.
3. **Server Actions** — Used instead of REST API for MVP; route handlers available for external APIs.
4. **Product Snapshots in Orders** — Order items store a JSON snapshot of product data at order time.
5. **Status Machine** — Orders follow a strict state machine with validated transitions.
6. **Service → Repository pattern** — No direct Prisma calls from UI or actions.

## 📝 License

Private — Waslak © 2024
