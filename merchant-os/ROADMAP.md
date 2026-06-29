# Wassalk Platform — Product & Technical Roadmap
**وصلك · نظام التوصيل والإتمام الشامل**

Version: 1.0 · Last updated: 2026-06-27  
Status: In Development · Platform: Next.js 16 + Flutter + PostgreSQL

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Phase 1 — Core Fulfillment Engine](#2-phase-1--core-fulfillment-engine)
3. [Phase 2 — Last Mile Delivery System](#3-phase-2--last-mile-delivery-system)
4. [Phase 3 — Merchant Power Features](#4-phase-3--merchant-power-features)
5. [Phase 4 — External Integrations](#5-phase-4--external-integrations)
6. [Phase 5 — Analytics & Reporting](#6-phase-5--analytics--reporting)
7. [Phase 6 — Platform & Infrastructure](#7-phase-6--platform--infrastructure)
8. [API Reference — Delivery Integrations](#8-api-reference--delivery-integrations)
9. [Database Schema Roadmap](#9-database-schema-roadmap)
10. [Priority Matrix](#10-priority-matrix)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WASSALK PLATFORM                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Flutter App  │  │ Merchant OS  │  │  Distributor Portal  │ │
│  │  (Customer)   │  │ (Next.js)    │  │  (Next.js)           │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                 │                       │             │
│  ┌──────▼─────────────────▼───────────────────────▼──────────┐ │
│  │                   API Gateway (Next.js API Routes)         │ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼─────────────────────────────┐  │
│  │              Core Services Layer                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │Fulfillmnt│ │Last Mile │ │ Finance  │ │Notifctn  │  │  │
│  │  │ Engine   │ │ Engine   │ │ Engine   │ │ Service  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              External Integrations Layer                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │Easy Del. │ │ Olivery  │ │  Zomato  │ │ Payment  │  │  │
│  │  │(Odoo RPC)│ │   API    │ │  Style   │ │ Gateway  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │    PostgreSQL + Redis (Cache) + WebSocket (Realtime)     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1 — Core Fulfillment Engine

**Timeline: Weeks 1-3 · Priority: CRITICAL**

The fulfillment engine is the brain of the platform. It manages the complete order lifecycle from placement to delivery.

### 2.1 Order Lifecycle State Machine

```
                    ┌─────────┐
           ┌───────►│  NEW    │◄──── Customer places order
           │        └────┬────┘
           │             │ Merchant accepts
           │        ┌────▼────┐
           │        │ACCEPTED │
           │        └────┬────┘
           │             │ Kitchen/Warehouse starts
           │        ┌────▼────┐
           │        │PREPARING│
           │        └────┬────┘
           │             │ Ready for pickup
           │        ┌────▼────┐
           │        │  READY  │
           │        └────┬────┘
           │             │ Driver picks up
           │     ┌───────▼──────┐
           │     │OUT_FOR_DELIV.│
           │     └───────┬──────┘
           │             │ Delivered
           │        ┌────▼────┐
           │        │DELIVERED│ ──── Terminal
           │        └─────────┘
           │
           └──── CANCELLED / REJECTED (from any state)
```

### 2.2 Fulfillment Workflows to Build

| Workflow | Description | File |
|---|---|---|
| Auto-accept | Auto-accept orders for merchants who opt in | `modules/fulfillment/workflows/auto-accept.ts` |
| Prep timer | Countdown timer for order preparation | `modules/fulfillment/workflows/prep-timer.ts` |
| Driver assignment | Auto or manual driver assignment | `modules/fulfillment/workflows/driver-assign.ts` |
| Delivery handoff | Handoff order to external delivery company | `modules/fulfillment/workflows/external-handoff.ts` |
| Failed delivery | Retry logic, return-to-sender flow | `modules/fulfillment/workflows/failed-delivery.ts` |

### 2.3 Files to Create

```
src/modules/fulfillment/
├── actions.ts                          # Server actions
├── index.ts
├── types.ts
├── schemas/
│   └── fulfillment.schemas.ts
├── services/
│   ├── fulfillment.service.ts          # Core orchestration
│   ├── order-lifecycle.service.ts      # State machine
│   └── driver-assignment.service.ts   # Driver matching
├── repositories/
│   └── fulfillment.repository.ts
└── workflows/
    ├── auto-accept.ts
    ├── prep-timer.ts
    ├── driver-assign.ts
    ├── external-handoff.ts
    └── failed-delivery.ts

src/app/dashboard/fulfillment/
├── page.tsx                            # Live order board (Kanban)
├── [orderId]/
│   └── page.tsx                        # Order detail + actions
└── _components/
    ├── order-kanban.tsx                # Drag-and-drop kanban
    ├── order-card.tsx
    └── prep-timer.tsx
```

### 2.4 Prisma Schema Additions

```prisma
model FulfillmentConfig {
  id                    String   @id @default(cuid())
  merchantId            String   @unique
  autoAcceptOrders      Boolean  @default(false)
  autoAssignDriver      Boolean  @default(false)
  defaultPrepTimeMinutes Int     @default(20)
  maxPrepTimeMinutes    Int      @default(60)
  alertOnDelayMinutes   Int      @default(10)
  merchant              Merchant @relation(fields: [merchantId], references: [id])
  @@map("fulfillment_configs")
}

model DriverAssignment {
  id          String   @id @default(cuid())
  orderId     String   @unique
  driverId    String
  assignedAt  DateTime @default(now())
  acceptedAt  DateTime?
  pickedUpAt  DateTime?
  deliveredAt DateTime?
  driverName  String
  driverPhone String
  vehicleType String?
  order       Order    @relation(fields: [orderId], references: [id])
  driver      Driver   @relation(fields: [driverId], references: [id])
  @@map("driver_assignments")
}
```

---

## 3. Phase 2 — Last Mile Delivery System

**Timeline: Weeks 3-6 · Priority: CRITICAL**

### 3.1 Driver Management

#### 3.1.1 Driver Model
```prisma
enum DriverStatus {
  OFFLINE
  ONLINE
  BUSY
  ON_BREAK
}

enum VehicleType {
  MOTORCYCLE
  CAR
  BICYCLE
  TRUCK
  VAN
}

model Driver {
  id             String       @id @default(cuid())
  distributorId  String
  name           String
  phone          String       @unique
  email          String?
  nationalId     String?
  photo          String?
  vehicleType    VehicleType  @default(MOTORCYCLE)
  vehiclePlate   String?
  status         DriverStatus @default(OFFLINE)
  isActive       Boolean      @default(true)
  isVerified     Boolean      @default(false)
  rating         Decimal      @default(5.0) @db.Decimal(3, 2)
  totalDeliveries Int         @default(0)
  currentLat     Float?
  currentLng     Float?
  lastSeenAt     DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  distributor    Distributor  @relation(fields: [distributorId], references: [id])
  assignments    DriverAssignment[]
  locationLogs   DriverLocationLog[]
  earnings       DriverEarning[]
  @@index([distributorId])
  @@index([status])
  @@map("drivers")
}

model DriverLocationLog {
  id        String   @id @default(cuid())
  driverId  String
  lat       Float
  lng       Float
  speed     Float?
  bearing   Float?
  timestamp DateTime @default(now())
  driver    Driver   @relation(fields: [driverId], references: [id])
  @@index([driverId, timestamp])
  @@map("driver_location_logs")
}

model DriverEarning {
  id          String   @id @default(cuid())
  driverId    String
  orderId     String?
  amount      Decimal  @db.Decimal(10, 2)
  currency    String   @default("SDG")
  type        String   // DELIVERY_FEE, BONUS, DEDUCTION
  description String?
  createdAt   DateTime @default(now())
  driver      Driver   @relation(fields: [driverId], references: [id])
  @@index([driverId])
  @@map("driver_earnings")
}
```

### 3.2 Route Optimization

```
Algorithm: Nearest Driver + Zone-based assignment

Input:
  - Order pickup location (merchant lat/lng)
  - Order delivery location (customer lat/lng)
  - Available drivers (status = ONLINE, not BUSY)
  - Driver current location

Scoring formula:
  score = (1 / distance_to_pickup) * zone_match_bonus * driver_rating

Output:
  - Ranked list of suitable drivers
  - Estimated pickup time
  - Estimated delivery time
```

### 3.3 Real-time Tracking Architecture

```
Customer App (Flutter)
       │
       │ WebSocket subscribe: /ws/order/{orderId}
       ▼
WebSocket Server (Next.js)
       │
       │ listens to Redis pub/sub channel: driver:{driverId}:location
       ▼
Redis Pub/Sub
       ▲
       │ Driver App publishes location every 5 seconds
Driver Mobile App (Flutter / React Native)
```

#### 3.3.1 WebSocket Events

```typescript
// Server → Client events
type TrackingEvent =
  | { type: 'DRIVER_LOCATION'; lat: number; lng: number; bearing: number }
  | { type: 'ORDER_STATUS_CHANGE'; status: OrderStatus }
  | { type: 'ETA_UPDATE'; etaMinutes: number }
  | { type: 'DRIVER_ARRIVED'; message: string }
  | { type: 'ORDER_DELIVERED'; timestamp: string }

// Client → Server events
type ClientEvent =
  | { type: 'SUBSCRIBE_ORDER'; orderId: string; token: string }
  | { type: 'PING' }
```

### 3.4 Pages to Build

```
src/app/distributor/drivers/
├── page.tsx                    # Driver list + status board
├── new/page.tsx                # Add driver form
├── [id]/page.tsx               # Driver profile + history
└── _components/
    ├── driver-card.tsx
    ├── driver-map.tsx          # Live map with all drivers
    └── driver-status-badge.tsx

src/app/distributor/dispatch/
├── page.tsx                    # Live dispatch board
└── _components/
    ├── order-queue.tsx         # Pending orders needing drivers
    ├── driver-availability.tsx # Online drivers on map
    └── assignment-modal.tsx    # Manual driver assignment

src/app/dashboard/tracking/
└── [orderId]/page.tsx          # Merchant view of delivery progress
```

### 3.5 Proof of Delivery (POD)

```prisma
model ProofOfDelivery {
  id              String   @id @default(cuid())
  orderId         String   @unique
  driverId        String
  photoUrl        String?
  signatureUrl    String?
  recipientName   String?
  notes           String?
  deliveredAt     DateTime @default(now())
  lat             Float?
  lng             Float?
  order           Order    @relation(fields: [orderId], references: [id])
  @@map("proof_of_deliveries")
}
```

---

## 4. Phase 3 — Merchant Power Features

**Timeline: Weeks 6-10 · Priority: HIGH**

### 4.1 Advanced Product Management

| Feature | Description | Priority |
|---|---|---|
| Product variants | Size, color, weight options | HIGH |
| Bulk import (CSV/Excel) | Import 100s of products at once | HIGH |
| Smart pricing rules | Time-based, quantity-based discounts | MEDIUM |
| Bundle products | Create product bundles/combos | MEDIUM |
| Digital products | Files, voucher codes, services | LOW |

### 4.2 Customer CRM

```
Features:
  ✓ Customer profiles (already exists)
  → Purchase history + spending analytics
  → Customer segmentation (VIP, Regular, Churned)
  → Loyalty points system
  → Blacklist management
  → Bulk SMS campaigns
  → Birthday/anniversary automations

Prisma additions needed:
  model LoyaltyAccount { ... }       # points balance
  model LoyaltyTransaction { ... }   # points history
  model CustomerSegment { ... }      # segmentation rules
  model CampaignMessage { ... }      # SMS campaigns
```

### 4.3 Promotions & Discounts Engine

```prisma
enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_DELIVERY
  BUY_X_GET_Y
}

enum DiscountTarget {
  ORDER_TOTAL
  SPECIFIC_PRODUCTS
  SPECIFIC_CATEGORIES
  DELIVERY_FEE
}

model Discount {
  id              String         @id @default(cuid())
  merchantId      String
  code            String?        // null = auto-applied
  name            String
  type            DiscountType
  target          DiscountTarget
  value           Decimal        @db.Decimal(10, 2)
  minOrderAmount  Decimal?       @db.Decimal(10, 2)
  maxUsageTotal   Int?
  maxUsagePerUser Int?           @default(1)
  usageCount      Int            @default(0)
  startsAt        DateTime
  endsAt          DateTime?
  isActive        Boolean        @default(true)
  conditions      Json?          // { productIds: [], categoryIds: [], userIds: [] }
  createdAt       DateTime       @default(now())
  merchant        Merchant       @relation(fields: [merchantId], references: [id])
  usages          DiscountUsage[]
  @@map("discounts")
}

model DiscountUsage {
  id         String   @id @default(cuid())
  discountId String
  orderId    String
  customerId String
  savedAmount Decimal @db.Decimal(10, 2)
  usedAt     DateTime @default(now())
  discount   Discount @relation(fields: [discountId], references: [id])
  @@index([discountId])
  @@map("discount_usages")
}
```

### 4.4 Multi-branch Operations

```
Features:
  ✓ Branch model (already exists)
  → Branch-specific menus (different products per branch)
  → Branch-level working hours
  → Branch-level delivery zones
  → Branch inventory sync
  → Branch performance comparison
  → Cross-branch stock transfer

Pages:
  /dashboard/branches                 # Branch list
  /dashboard/branches/[id]            # Branch management
  /dashboard/branches/[id]/inventory  # Branch stock
  /dashboard/branches/[id]/staff      # Branch staff
```

### 4.5 Working Hours & Availability

```prisma
model WorkingHours {
  id         String  @id @default(cuid())
  merchantId String?
  branchId   String?
  dayOfWeek  Int     // 0=Sunday, 6=Saturday
  openTime   String  // "09:00"
  closeTime  String  // "23:00"
  isClosed   Boolean @default(false)
  @@map("working_hours")
}

model SpecialClosure {
  id         String   @id @default(cuid())
  merchantId String
  date       DateTime
  reason     String?
  merchant   Merchant @relation(fields: [merchantId], references: [id])
  @@map("special_closures")
}
```

### 4.6 Merchant Analytics Dashboard

```
Metrics to show:
  ┌─────────────────────────────────────┐
  │ Today vs Yesterday comparison       │
  │  • Orders count      • Revenue      │
  │  • Avg order value   • New customers│
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │ 30-day Revenue Chart (line graph)   │
  └─────────────────────────────────────┘
  ┌────────────────┬────────────────────┐
  │ Top Products   │ Peak Hours         │
  │ (ranked list)  │ (heatmap)          │
  └────────────────┴────────────────────┘
  ┌─────────────────────────────────────┐
  │ Customer retention funnel           │
  │ New → Returning → VIP              │
  └─────────────────────────────────────┘
```

---

## 5. Phase 4 — External Integrations

**Timeline: Weeks 8-12 · Priority: HIGH**

### 5.1 Delivery Company Integration Architecture

```
                    ┌─────────────────────────┐
                    │   Wassalk Platform       │
                    │                          │
                    │  ┌────────────────────┐ │
                    │  │ DeliveryProvider   │ │
                    │  │ Adapter Interface  │ │
                    │  └────────┬───────────┘ │
                    └───────────┼─────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                   │
    ┌─────────▼──────┐ ┌───────▼──────┐ ┌────────▼───────┐
    │  EasyDelivery  │ │   Olivery    │ │  Custom REST   │
    │  (JSON-RPC 2.0)│ │  (REST API)  │ │  (Webhook)     │
    └────────────────┘ └──────────────┘ └────────────────┘
```

### 5.2 Delivery Provider Adapter Interface

```typescript
// src/services/delivery-providers/base.adapter.ts

export interface DeliveryOrder {
  externalRef?: string         // Wassalk order ID
  customerName: string
  customerPhone: string
  customerAddress: string
  customerArea: string
  customerLat?: number
  customerLng?: number
  merchantName: string
  merchantAddress: string
  merchantLat?: number
  merchantLng?: number
  description?: string
  codAmount?: number           // Cash on delivery amount
  notes?: string
}

export interface DeliveryResult {
  success: boolean
  trackingId: string           // Provider's tracking ID
  trackingUrl?: string
  estimatedPickupAt?: Date
  estimatedDeliveryAt?: Date
  driverName?: string
  driverPhone?: string
  rawResponse?: unknown
}

export interface DeliveryStatus {
  trackingId: string
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED'
  driverLat?: number
  driverLng?: number
  message?: string
  timestamp: Date
}

export interface IDeliveryProvider {
  name: string
  code: string                 // 'easy_delivery' | 'olivery' | 'custom'
  createOrder(order: DeliveryOrder): Promise<DeliveryResult>
  getStatus(trackingId: string): Promise<DeliveryStatus>
  cancelOrder(trackingId: string): Promise<boolean>
  getAreas?(): Promise<{ id: string; name: string; subAreas?: string[] }[]>
}
```

### 5.3 Easy Delivery Integration (JSON-RPC 2.0)

Easy Delivery uses Odoo's JSON-RPC 2.0 protocol.

**Base URL:** `https://easydelivery.olivery.io`

#### 5.3.1 Authentication

All requests use JSON-RPC 2.0 with credentials in params:

```typescript
interface JsonRpcParams {
  login: string        // Your account login
  password: string     // Your account password
  db: string          // Database name (e.g., "easydelivery")
}
```

#### 5.3.2 Endpoints

---

**POST** `/create_order`

Create a new delivery order.

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "login": "your_login",
    "password": "your_password",
    "db": "easydelivery",
    "customer_address": "الخرطوم، حي المنشية",
    "customer_mobile": "0912345678",
    "customer_area": "الخرطوم",
    "customer_name": "أحمد محمد",
    "order_note": "يرجى الاتصال قبل الوصول",
    "partner_order_id": "ORD-ABC123",
    "cod_amount": 150.00
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "tracking_id": "ED-78945",
    "message": "Order created successfully"
  }
}
```

**TypeScript Implementation:**
```typescript
// src/services/delivery-providers/easy-delivery.adapter.ts

export class EasyDeliveryAdapter implements IDeliveryProvider {
  name = 'Easy Delivery'
  code = 'easy_delivery'

  private readonly baseUrl: string
  private readonly credentials: { login: string; password: string; db: string }

  constructor(config: { baseUrl: string; login: string; password: string; db: string }) {
    this.baseUrl = config.baseUrl
    this.credentials = { login: config.login, password: config.password, db: config.db }
  }

  private async rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { ...this.credentials, ...params },
      }),
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error.message ?? 'Provider error')
    return json.result as T
  }

  async createOrder(order: DeliveryOrder): Promise<DeliveryResult> {
    const result = await this.rpc<{ tracking_id: string; status: string }>('create_order', {
      customer_name: order.customerName,
      customer_mobile: order.customerPhone,
      customer_address: order.customerAddress,
      customer_area: order.customerArea,
      partner_order_id: order.externalRef,
      cod_amount: order.codAmount ?? 0,
      order_note: order.notes,
    })
    return {
      success: result.status === 'success',
      trackingId: result.tracking_id,
    }
  }

  async getStatus(trackingId: string): Promise<DeliveryStatus> {
    const result = await this.rpc<{ status: string; driver_lat?: number; driver_lng?: number }>
      ('get_status', { tracking_id: trackingId })
    return {
      trackingId,
      status: this.mapStatus(result.status),
      driverLat: result.driver_lat,
      driverLng: result.driver_lng,
      timestamp: new Date(),
    }
  }

  async cancelOrder(trackingId: string): Promise<boolean> {
    const result = await this.rpc<{ status: string }>('cancel_order', { tracking_id: trackingId })
    return result.status === 'success'
  }

  async getAreas(): Promise<{ id: string; name: string }[]> {
    const result = await this.rpc<{ areas: { id: string; name: string }[] }>('get_areas', {})
    return result.areas
  }

  private mapStatus(raw: string): DeliveryStatus['status'] {
    const map: Record<string, DeliveryStatus['status']> = {
      'pending': 'PENDING',
      'assigned': 'ASSIGNED',
      'picked': 'PICKED_UP',
      'in_transit': 'IN_TRANSIT',
      'delivered': 'DELIVERED',
      'failed': 'FAILED',
      'returned': 'RETURNED',
    }
    return map[raw] ?? 'PENDING'
  }
}
```

---

**GET** `/get_areas`

Get all available delivery areas.

```typescript
const areas = await provider.getAreas()
// Returns: [{ id: "1", name: "الخرطوم" }, { id: "2", name: "أم درمان" }]
```

---

**GET** `/get_status`

Get current delivery status.

```typescript
const status = await provider.getStatus("ED-78945")
// Returns: { status: "IN_TRANSIT", driverLat: 15.5, driverLng: 32.5 }
```

---

**POST** `/solve_stuck_order`

Reassign a stuck order.

```json
{
  "jsonrpc": "2.0",
  "params": {
    "login": "...",
    "password": "...",
    "db": "easydelivery",
    "tracking_id": "ED-78945"
  }
}
```

---

### 5.4 Provider Registry

```typescript
// src/services/delivery-providers/registry.ts

import { EasyDeliveryAdapter } from './easy-delivery.adapter'
import { OliveryAdapter } from './olivery.adapter'

const providerRegistry = new Map<string, IDeliveryProvider>()

export function registerProvider(provider: IDeliveryProvider) {
  providerRegistry.set(provider.code, provider)
}

export function getProvider(code: string): IDeliveryProvider {
  const provider = providerRegistry.get(code)
  if (!provider) throw new Error(`Delivery provider '${code}' not found`)
  return provider
}

// Initialize providers from env/DB config
export async function initProviders() {
  registerProvider(new EasyDeliveryAdapter({
    baseUrl: process.env.EASY_DELIVERY_URL!,
    login: process.env.EASY_DELIVERY_LOGIN!,
    password: process.env.EASY_DELIVERY_PASSWORD!,
    db: process.env.EASY_DELIVERY_DB!,
  }))
}
```

### 5.5 External Provider DB Schema

```prisma
model ExternalDeliveryProvider {
  id           String  @id @default(cuid())
  distributorId String
  code         String  // 'easy_delivery', 'olivery', 'custom'
  name         String
  isActive     Boolean @default(true)
  config       Json    // encrypted credentials & settings
  webhookUrl   String? // their webhook to our system
  createdAt    DateTime @default(now())
  distributor  Distributor @relation(fields: [distributorId], references: [id])
  dispatches   ExternalDispatch[]
  @@unique([distributorId, code])
  @@map("external_delivery_providers")
}

model ExternalDispatch {
  id          String   @id @default(cuid())
  orderId     String   @unique
  providerId  String
  trackingId  String   // Provider's tracking ID
  trackingUrl String?
  status      String   @default("PENDING")
  lastSyncAt  DateTime?
  rawStatus   Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  order       Order    @relation(fields: [orderId], references: [id])
  provider    ExternalDeliveryProvider @relation(fields: [providerId], references: [id])
  @@map("external_dispatches")
}
```

### 5.6 Webhook Handler (Receive updates from providers)

```typescript
// src/app/api/webhooks/delivery/[provider]/route.ts

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const body = await req.json()
  const provider = params.provider  // 'easy_delivery', 'olivery'

  // Verify webhook signature
  const signature = req.headers.get('x-signature')
  if (!verifySignature(body, signature, provider)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Map provider-specific payload to our format
  const update = mapWebhookPayload(provider, body)

  // Update order status
  await updateExternalDispatchStatus(update.trackingId, update.status)

  // Notify customer via WebSocket
  await publishToWebSocket(`order:${update.orderId}`, {
    type: 'ORDER_STATUS_CHANGE',
    status: update.status,
  })

  return Response.json({ received: true })
}
```

### 5.7 Payment Gateway Integration

```typescript
// Supported providers roadmap:
// 1. Cash on Delivery (COD) — built-in, no integration needed
// 2. Bankak (Sudan mobile payment) — Phase 4
// 3. Fawry (Egypt) — Phase 5
// 4. Stripe (International) — Phase 5

interface PaymentProvider {
  initiate(amount: number, currency: string, orderId: string): Promise<{ url: string; ref: string }>
  verify(ref: string): Promise<{ paid: boolean; amount: number }>
  refund(ref: string, amount: number): Promise<boolean>
}
```

### 5.8 SMS Notifications

```typescript
// src/services/sms/providers/
// ├── twilio.provider.ts       # International
// ├── local-sms.provider.ts   # Sudan local providers
// └── mock.provider.ts        # Development

// Templates:
const SMS_TEMPLATES = {
  ORDER_CONFIRMED: (orderNum: string) =>
    `تم استلام طلبك رقم ${orderNum}. سيتم التوصيل قريباً.`,
  DRIVER_ASSIGNED: (driverName: string, phone: string) =>
    `المندوب ${driverName} في طريقه إليك. للتواصل: ${phone}`,
  ORDER_DELIVERED: (orderNum: string) =>
    `تم توصيل طلبك ${orderNum}. شكراً لاختياركم وصلك!`,
}
```

---

## 6. Phase 5 — Analytics & Reporting

**Timeline: Weeks 10-14 · Priority: MEDIUM**

### 6.1 Distributor Analytics

```
Reports:
  ├── Financial Summary (daily/weekly/monthly/custom)
  │     • Total GMV (Gross Merchandise Value)
  │     • Commission earned
  │     • Delivery fees collected
  │     • Outstanding settlements
  │
  ├── Merchant Performance
  │     • Top merchants by revenue
  │     • Growth rate per merchant
  │     • Order frequency analysis
  │     • Churn risk alerts
  │
  ├── Delivery Performance
  │     • Average delivery time
  │     • On-time delivery rate (%)
  │     • Failed delivery rate (%)
  │     • Driver performance rankings
  │
  └── Geographic Analysis
        • Revenue by area/zone
        • Delivery density heatmap
        • Underserved areas
```

### 6.2 Merchant Analytics

```
Reports:
  ├── Sales Dashboard
  │     • Revenue trend (chart)
  │     • Orders by hour heatmap
  │     • Average order value
  │
  ├── Product Analytics
  │     • Best/worst sellers
  │     • Category performance
  │     • Out-of-stock impact
  │
  ├── Customer Analytics
  │     • New vs returning ratio
  │     • Customer lifetime value
  │     • Repeat purchase rate
  │
  └── Operational
        • Peak hours analysis
        • Preparation time accuracy
        • Cancellation reasons breakdown
```

### 6.3 Data Export

```typescript
// Supported formats:
// - Excel (.xlsx) — merchants prefer this
// - CSV — for data processing
// - PDF — for formal reports

// Export endpoints:
// GET /api/distributor/export/settlements?format=xlsx&from=2026-01-01&to=2026-06-30
// GET /api/distributor/export/merchants?format=csv
// GET /api/merchant/export/orders?format=xlsx&status=DELIVERED
```

---

## 7. Phase 6 — Platform & Infrastructure

**Timeline: Ongoing · Priority: HIGH**

### 7.1 Event System (Internal)

```typescript
// src/services/events/
// Event-driven architecture for loose coupling

type PlatformEvent =
  | { type: 'ORDER_PLACED'; orderId: string; merchantId: string; total: number }
  | { type: 'ORDER_STATUS_CHANGED'; orderId: string; from: string; to: string }
  | { type: 'DRIVER_LOCATION_UPDATED'; driverId: string; lat: number; lng: number }
  | { type: 'SETTLEMENT_CREATED'; settlementId: string; merchantId: string }
  | { type: 'LOW_STOCK_ALERT'; productId: string; merchantId: string; quantity: number }

// Subscribers:
// ORDER_PLACED → trigger SMS to merchant, start prep timer
// ORDER_STATUS_CHANGED → notify customer via WS, update driver app
// LOW_STOCK_ALERT → notify merchant admin
```

### 7.2 Background Jobs

```typescript
// Jobs to implement (using node-cron or similar):

const jobs = [
  {
    name: 'sync-external-delivery-status',
    cron: '*/2 * * * *',          // every 2 minutes
    description: 'Poll external delivery providers for status updates',
  },
  {
    name: 'auto-generate-settlements',
    cron: '0 2 * * *',            // daily at 2 AM
    description: 'Auto-generate monthly settlements for merchants',
  },
  {
    name: 'check-overdue-orders',
    cron: '*/5 * * * *',          // every 5 minutes
    description: 'Alert on orders stuck in PREPARING for too long',
  },
  {
    name: 'cleanup-location-logs',
    cron: '0 3 * * 0',            // weekly Sunday 3 AM
    description: 'Delete driver location logs older than 30 days',
  },
  {
    name: 'send-daily-report',
    cron: '0 8 * * *',            // daily 8 AM
    description: 'Email daily summary to merchant owners',
  },
]
```

### 7.3 Redis Cache Strategy

```
Cache TTLs:
  ├── Store listings (home screen)     → 5 minutes
  ├── Product catalog                  → 10 minutes
  ├── Delivery zones & fees            → 1 hour
  ├── Driver positions                 → 10 seconds (real-time)
  ├── Session data                     → 24 hours
  └── Analytics aggregates             → 30 minutes

Cache invalidation:
  ├── On product update  → invalidate merchant product cache
  ├── On order placed    → invalidate daily analytics cache
  └── On driver move     → update driver position (TTL: 30 seconds)
```

### 7.4 API Rate Limiting

```typescript
// Per endpoint limits:
const rateLimits = {
  'POST /api/orders':              { requests: 20, window: '1m' },
  'POST /api/auth/login':          { requests: 5,  window: '15m' },
  'GET  /api/stores':              { requests: 60, window: '1m' },
  'POST /api/webhooks/delivery/*': { requests: 200, window: '1m' },
}
```

### 7.5 Security Checklist

```
Authentication:
  ✓ NextAuth v5 with JWT
  → API key authentication for external providers
  → Webhook signature verification (HMAC-SHA256)

Authorization:
  ✓ Role-based access control (RBAC)
  ✓ Tenant isolation (merchantId scoping)
  → Row-level security in PostgreSQL

Data:
  → Encrypt sensitive fields (provider credentials, payment tokens)
  → PII data handling compliance
  → Audit log for all financial operations

Network:
  → HTTPS enforced
  → CORS configuration per environment
  → Rate limiting on all public endpoints
```

---

## 8. API Reference — Delivery Integrations

### 8.1 Wassalk Internal API (for Flutter App)

**Base URL:** `https://api.wassalk.com/v1`

**Authentication:** Bearer token (JWT)

---

#### `POST /orders`
Place a new order.

```bash
curl -X POST https://api.wassalk.com/v1/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "clx1234abc",
    "items": [
      { "productId": "clx5678def", "quantity": 2, "modifiers": [] }
    ],
    "deliveryAddress": "الخرطوم، حي الرياض، شارع 15",
    "deliveryMethod": "WASLAK_DELIVERY",
    "paymentMethod": "CASH",
    "notes": "لا بصل من فضلك"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "clx9999xyz",
    "orderNumber": "ORD-A7B3C2D1",
    "status": "NEW",
    "total": 450.00,
    "estimatedDeliveryAt": "2026-06-27T14:30:00Z"
  }
}
```

---

#### `GET /orders/tracking/{orderId}`
WebSocket endpoint for real-time tracking.

```
ws://api.wassalk.com/v1/tracking/{orderId}?token={jwt}
```

**Messages received:**
```json
{ "type": "DRIVER_LOCATION", "lat": 15.5518, "lng": 32.5324, "bearing": 180 }
{ "type": "ORDER_STATUS_CHANGE", "status": "DELIVERING", "message": "المندوب في طريقه" }
{ "type": "ETA_UPDATE", "etaMinutes": 12 }
```

---

#### `GET /stores/featured`
Get featured stores for home screen.

```json
{
  "data": [
    {
      "id": "clx1234abc",
      "name": "مطعم الخليج",
      "category": "مطعم",
      "rating": 4.8,
      "deliveryFee": 15.00,
      "deliveryTime": "25-35 دقيقة",
      "imageUrl": "https://..."
    }
  ]
}
```

---

### 8.2 Merchant-Facing Webhook Events

When your platform receives events, we POST to your webhook URL:

```bash
POST https://your-merchant-system.com/webhook
X-Wassalk-Signature: sha256=abc123...
Content-Type: application/json

{
  "event": "order.placed",
  "timestamp": "2026-06-27T12:00:00Z",
  "data": {
    "orderId": "clx9999xyz",
    "orderNumber": "ORD-A7B3C2D1",
    "merchantId": "clx1234abc",
    "total": 450.00,
    "items": [...]
  }
}
```

**Event Types:**
| Event | Description |
|---|---|
| `order.placed` | New order received |
| `order.status_changed` | Order status updated |
| `order.cancelled` | Order was cancelled |
| `delivery.assigned` | Driver assigned |
| `delivery.delivered` | Order delivered |
| `settlement.created` | New financial settlement |
| `inventory.low_stock` | Product below threshold |

---

## 9. Database Schema Roadmap

### Current State (✓ = exists, → = to add)

```
Core ✓
  ✓ User, Account, Session
  ✓ Merchant, MerchantUser
  ✓ Distributor, DistributorUser
  ✓ Branch
  ✓ Product, Category, ProductModifier
  ✓ Order, OrderItem, OrderStatusHistory
  ✓ Delivery, Payment
  ✓ Customer, CustomerAddress
  ✓ InventoryItem, StockMovement
  ✓ NotificationLog, StorefrontSettings
  ✓ Role, Permission, RolePermission

Finance ✓
  ✓ CommissionPlan
  ✓ FinancialTransaction
  ✓ Settlement
  ✓ DeliveryZone

To Add (Phase 2) →
  → Driver
  → DriverLocationLog
  → DriverEarning
  → DriverAssignment
  → ProofOfDelivery
  → FulfillmentConfig

To Add (Phase 3) →
  → Discount, DiscountUsage
  → LoyaltyAccount, LoyaltyTransaction
  → WorkingHours, SpecialClosure
  → CampaignMessage

To Add (Phase 4) →
  → ExternalDeliveryProvider
  → ExternalDispatch
```

---

## 10. Priority Matrix

| Feature | Impact | Effort | Priority | Phase |
|---|---|---|---|---|
| Order fulfillment board (Kanban) | 🔴 Critical | Medium | P0 | 1 |
| Driver management | 🔴 Critical | High | P0 | 2 |
| Real-time tracking (WebSocket) | 🔴 Critical | High | P0 | 2 |
| Easy Delivery integration | 🔴 Critical | Medium | P0 | 4 |
| Discount engine | 🟠 High | Medium | P1 | 3 |
| SMS notifications | 🟠 High | Low | P1 | 4 |
| Analytics dashboard | 🟠 High | High | P1 | 5 |
| Proof of delivery | 🟠 High | Medium | P1 | 2 |
| Loyalty program | 🟡 Medium | High | P2 | 3 |
| Multi-branch ops | 🟡 Medium | High | P2 | 3 |
| Data export (Excel) | 🟡 Medium | Low | P2 | 5 |
| Background jobs | 🟡 Medium | Medium | P2 | 6 |
| Payment gateway (Bankak) | 🟢 Low | High | P3 | 4 |
| Route optimization | 🟢 Low | Very High | P3 | 2 |

---

## Sprint Suggestions

```
Sprint 1 (Week 1-2):   Fulfillment board (Kanban) + Order detail page
Sprint 2 (Week 3-4):   Driver model + Driver management pages
Sprint 3 (Week 5-6):   Real-time tracking + WebSocket architecture
Sprint 4 (Week 7-8):   Easy Delivery integration + External dispatch
Sprint 5 (Week 9-10):  Discount engine + Promotions
Sprint 6 (Week 11-12): Analytics dashboard + Data export
Sprint 7 (Week 13-14): Background jobs + SMS notifications
Sprint 8 (Week 15+):   Loyalty program + Advanced features
```

---

*Wassalk Platform Roadmap · Built for Sudan's delivery ecosystem*
*اللهم يسّر · وصلك — نوصّل في كل مكان*
