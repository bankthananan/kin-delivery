# Kin Delivery — Technical Design Document

## 1. Executive Summary & Tech Stack

This document outlines the technical architecture for the Kin Delivery food delivery platform. The system is designed as a modular monolith within a Turborepo monorepo, utilizing NestJS for the backend, PostgreSQL (with PostGIS) for relational and spatial data, Redis for caching/GEO/PubSub, and BullMQ for background job processing. 

### Decided Tech Stack
- **Framework**: NestJS (TypeScript)
- **Monorepo**: Turborepo 2.8 + pnpm
- **Database**: PostgreSQL 15 + Prisma + PostGIS
- **Cache/Geo**: Redis 7 (GEO, pub/sub, sessions)
- **Queue**: BullMQ (order dispatch, notifications, payments)
- **Real-time**: Socket.io via `@nestjs/websockets`
- **Auth**: Passport.js (JWT, multi-role)
- **Payment**: Omise (PromptPay, cards, wallets) + `promptparse` v1.5.0
- **Maps**: Mapbox (geocoding, distance matrix, routing)
- **Mobile**: React Native (Customer & Driver apps)
- **Web**: Next.js (Restaurant & Backoffice apps)
- **Push Notifications**: Firebase Cloud Messaging (FCM)

---

## 2. Monorepo Structure

```text
kin-delivery/
├── apps/
│   ├── api/                    # NestJS Core Backend (Modular Monolith)
│   ├── customer-app/           # React Native (Customer)
│   ├── driver-app/             # React Native (Driver)
│   ├── restaurant-web/         # Next.js (Restaurant portal)
│   └── backoffice-web/         # Next.js (Admin dashboard)
├── packages/
│   ├── database/               # Prisma schema, migrations, and generated client
│   ├── contracts/              # Shared TS interfaces, enums, DTOs, Zod schemas
│   ├── config/                 # ESLint, Prettier, TypeScript configs
│   ├── mapbox-client/          # Internal wrapper for Mapbox API (routing/detours)
│   └── omise-client/           # Internal wrapper for Omise API
├── turbo.json                  # Turborepo configuration
└── package.json                # Root dependencies & workspaces definition
```

---

## 3. Prisma Schema Design

The single database schema resides in `packages/database/prisma/schema.prisma`. It utilizes PostGIS for geospatial querying (`Unsupported("geometry(Point, 4326)")`).

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

enum Role { CUSTOMER DRIVER RESTAURANT ADMIN }
enum OrderTier { FASTEST NORMAL SAVER }
enum OrderStatus { PENDING CONFIRMED PREPARING READY PICKED_UP IN_TRANSIT DELIVERED CANCELLED FAILED }
enum PaymentMethod { PROMPTPAY APP_QR COD CARD WALLET }
enum PaymentStatus { PENDING SUCCESS FAILED REFUNDED }
enum TransactionType { TOPUP PAYOUT EARNING PAYMENT REFUND ADJUSTMENT }

model User {
  id            String      @id @default(uuid())
  email         String      @unique
  phone         String      @unique
  passwordHash  String
  role          Role
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  customer      Customer?
  driver        Driver?
  admin         Admin?
}

model Customer {
  id          String      @id
  user        User        @relation(fields: [id], references: [id], onDelete: Cascade)
  orders      Order[]
  addresses   Address[]
  wallet      Wallet?
  ratings     Rating[]    @relation("CustomerRatings")
}

model Driver {
  id             String     @id
  user           User       @relation(fields: [id], references: [id], onDelete: Cascade)
  vehiclePlate   String
  isOnline       Boolean    @default(false)
  currentLat     Float?
  currentLng     Float?
  wallet         Wallet?
  deliveries     Order[]
  ratings        Rating[]   @relation("DriverRatings")
}

model Restaurant {
  id             String     @id @default(uuid())
  userId         String     @unique // Owner user
  name           String
  description    String?
  isOpen         Boolean    @default(false)
  openingTime    String?    // HH:mm format (e.g., "10:00")
  closingTime    String?    // HH:mm format (e.g., "22:00")
  lat            Float
  lng            Float
  location       Unsupported("geometry(Point, 4326)")?
  menuCategories MenuCategory[]
  orders         Order[]
  wallet         Wallet?
  ratings        Rating[]   @relation("RestaurantRatings")
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([location], name: "restaurant_location_idx", type: Gist)
}

model MenuCategory {
  id           String     @id @default(uuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  name         String
  items        MenuItem[]
}

model MenuItem {
  id           String       @id @default(uuid())
  categoryId   String
  category     MenuCategory @relation(fields: [categoryId], references: [id])
  name         String
  description  String?
  price        Decimal      @db.Decimal(10, 2)
  isAvailable  Boolean      @default(true)
  orderItems   OrderItem[]
}

model Address {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  label      String
  lat        Float
  lng        Float
  addressStr String
}

model Order {
  id               String        @id @default(uuid())
  customerId       String
  customer         Customer      @relation(fields: [customerId], references: [id])
  driverId         String?
  driver           Driver?       @relation(fields: [driverId], references: [id])
  tier             OrderTier
  status           OrderStatus   @default(PENDING)
  paymentMethod    PaymentMethod
  paymentStatus    PaymentStatus @default(PENDING)
  chargeId         String?       // Omise charge ID
  
  subtotal         Decimal       @db.Decimal(10, 2)
  deliveryFee      Decimal       @db.Decimal(10, 2)
  surgeMultiplier  Decimal       @default(1.0) @db.Decimal(4, 2)
  total            Decimal       @db.Decimal(10, 2)
  
  deliveryLat          Float
  deliveryLng          Float
  deliveryAddress      String
  deliveryNote         String?   // "Leave at lobby", "Call when arrive"
  estimatedDurationMin Int?      // ETA in minutes (Mapbox drive time + prep time)
  
  items            OrderItem[]
  // Implicitly supporting multi-restaurant through items referencing different restaurants
  restaurants      Restaurant[]  // Implicit Many-to-Many or specific relation table based on Prisma design
  
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

model OrderItem {
  id           String     @id @default(uuid())
  orderId      String
  order        Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId   String
  menuItem     MenuItem   @relation(fields: [menuItemId], references: [id])
  restaurantId String
  quantity     Int
  price        Decimal    @db.Decimal(10, 2)
  notes        String?
}

model Wallet {
  id           String        @id @default(uuid())
  balance      Decimal       @default(0.00) @db.Decimal(10, 2)
  customerId   String?       @unique
  customer     Customer?     @relation(fields: [customerId], references: [id])
  driverId     String?       @unique
  driver       Driver?       @relation(fields: [driverId], references: [id])
  restaurantId String?       @unique
  restaurant   Restaurant?   @relation(fields: [restaurantId], references: [id])
  transactions Transaction[]
}

model Transaction {
  id            String          @id @default(uuid())
  walletId      String
  wallet        Wallet          @relation(fields: [walletId], references: [id])
  amount        Decimal         @db.Decimal(10, 2) // Positive or Negative
  type          TransactionType
  referenceId   String?         // E.g., Order ID, Payout ID
  externalRefId String?         // Omise event ID (for webhook idempotency)
  description   String?
  createdAt     DateTime        @default(now())

  @@unique([referenceId, type])  // Prevent double-crediting from duplicate webhooks
}

model PlatformConfig {
  key       String   @id           // e.g., "base_fee", "distance_rate", "commission_pct"
  value     String                  // stored as string, parsed by app
  updatedAt DateTime @updatedAt
}

model Rating {
  id           String      @id @default(uuid())
  orderId      String      @unique
  customerId   String
  customer     Customer    @relation("CustomerRatings", fields: [customerId], references: [id])
  driverId     String?
  driver       Driver?     @relation("DriverRatings", fields: [driverId], references: [id])
  restaurantId String?
  restaurant   Restaurant? @relation("RestaurantRatings", fields: [restaurantId], references: [id])
  score        Int         // 1-5
  comment      String?
  createdAt    DateTime    @default(now())
}

model Admin {
  id     String @id
  user   User   @relation(fields: [id], references: [id], onDelete: Cascade)
  level  String // SuperAdmin, Support, etc.
}
```

---

## 4. API Endpoints

All endpoints are built in `apps/api` using NestJS controllers, prefixed by `/api/v1`. Auth is handled by `JwtAuthGuard` + `RolesGuard`.

### Customer App
- `POST /auth/register`, `POST /auth/login`
- `GET /customer/addresses`, `POST /customer/addresses`
- `GET /restaurants?lat=x&lng=y` (Queries PostGIS, applies 5km radius)
- `GET /restaurants/:id/menu`
- `POST /cart/validate` (Validates minimum order, detour ≤ 500m, tier compatibility)
- `POST /orders` (Creates order, returns PromptPay QR if chosen, enqueues payment timeout)
- `GET /orders/:id`
- `GET /wallet/balance`, `GET /wallet/transactions`, `POST /wallet/topup`
- `POST /orders/:id/rate`

### Driver App
- `POST /auth/driver/login`
- `PUT /driver/status` (Toggle online/offline, updates Redis GEO + PostgreSQL)
- `PUT /driver/location` (High-frequency GPS update, updates Redis GEO + streams to Socket.io)
- `GET /driver/orders/available` (Fetches pending pings)
- `POST /driver/orders/:id/accept` (Atomic accept via Redis lock)
- `PUT /driver/orders/:id/status` (Transitions: picked_up -> in_transit -> delivered)
- `GET /wallet/balance`, `POST /wallet/withdraw` (Checks ≥ 100 THB)

### Restaurant App
- `POST /auth/restaurant/login`
- `PUT /restaurant/status` (Toggle isOpen)
- `GET /restaurant/menu`, `PUT /restaurant/menu/:id` (Availability/Price)
- `GET /restaurant/orders/active`
- `POST /restaurant/orders/:id/accept` (Transitions PENDING -> CONFIRMED/PREPARING)
- `POST /restaurant/orders/:id/ready` (Transitions PREPARING -> READY)
- `GET /wallet/balance`, `POST /wallet/withdraw`

### Backoffice
- `POST /auth/admin/login`
- `GET /admin/users`, `GET /admin/drivers`, `GET /admin/restaurants`
- `GET /admin/orders`
- `GET /admin/finances/ledger`
- `PUT /admin/config/fees` (Update surge rules, base fees, commissions)

---

## 5. Order State Machine

Implemented using a NestJS service (`OrderStateService`) that handles transitions and side-effects.

| Current State | Target State | Triggered By | Side Effects |
|---|---|---|---|
| PENDING | CONFIRMED | Payment success webhook OR Cash checkout | Push notification to Restaurant; 5-min timeout BullMQ job starts. |
| PENDING | CANCELLED | 5-min payment timeout | Order dies. |
| CONFIRMED | PREPARING | Restaurant (Accept) | Stops 5-min timeout. Starts dispatch BullMQ job (ping drivers). Push to Customer. |
| CONFIRMED | CANCELLED | Restaurant (Reject) OR 5-min Restaurant Timeout | Triggers refund to Customer Kin Wallet. Push to Customer. |
| PREPARING | READY | Restaurant | Updates driver UI. |
| PREPARING/READY | PICKED_UP | Driver | Updates tracking UI. Customer notified. |
| PICKED_UP | IN_TRANSIT | Driver | Initiates real-time GPS streaming view for Customer. |
| IN_TRANSIT | DELIVERED | Driver | Completes order. Splits funds (Driver earning, Restaurant earning, Platform commission). Push to Customer to rate. |
| PENDING | CANCELLED | Customer (Cancel) | Free cancel. Refund to Kin Wallet if paid. Push notification. |
| CONFIRMED | CANCELLED | Customer (Cancel) | Free cancel (before restaurant accepts). Refund to Kin Wallet. Push notification. |
| IN_TRANSIT | FAILED | Driver (Unreachable) | Logs failed COD. Notifies support. |
| IN_TRANSIT | FAILED | System (2hr timeout) | BullMQ cron: no GPS > 2hr. Auto-fail, refund customer, flag driver for review. |

---

## 6. Driver Matching Algorithm

The matching algorithm balances proximity, tier capacity, and queueing.

1. **Location Indexing**: 
   - `H3` grid is used to map restaurant locations to hexagons.
   - Active drivers periodically ping their location. Redis GEO stores `driver:{id}:location`.
2. **Dispatch Trigger**: When order hits `PREPARING`, `OrderDispatchJob` runs.
3. **Filtering**:
   - `GEORADIUS` queries Redis for drivers within 5km of the Restaurant OR Customer.
   - Filter out drivers who are `isOnline = false`.
4. **Capacity & Tier Check**:
   - For each driver, calculate active load.
   - If order is `FASTEST`, driver must have 0 active orders.
   - If order is `NORMAL`, driver must have < 2 active orders (and none of them FASTEST).
   - If order is `SAVER`, driver must have < 3 active orders (and none FASTEST).
5. **Scoring & Broadcasting**:
   - Score based on Distance + Wait Time.
   - Broadcast `order.ping` via Socket.io to the top N eligible drivers.
   - First driver to call `POST /driver/orders/:id/accept` wins (Redis `SETNX` lock prevents double-booking).

---

## 7. Delivery Fee Calculation

Calculated at checkout in `PricingService`.

`Total Fee = (Base Fee + (Distance * DistanceRate)) * TierMultiplier * SurgeMultiplier`

- **Base Fee**: Configurable (e.g., 15 THB).
- **Distance Fee**: Configurable (e.g., +10 THB per km over 2km).
- **Tier Multiplier**: 
  - Fastest: 1.5x
  - Normal: 1.0x
  - Saver: 0.7x (Blocked for multi-restaurant).
- **Surge Multiplier**:
  - Query Redis for active drivers in 5km vs pending/active orders in 5km.
  - If `(Drivers / Orders) < 0.5`, SurgeMultiplier = 1.5x. Else 1.0x. Lock this rate in a Redis short-lived key during cart building to prevent bait-and-switch.

---

## 8. Wallet & Ledger System

Follows an immutable, double-entry ledger pattern. 
Table: `Transaction` referencing `Wallet`.

- **Top-up**: Customer adds funds via Omise. Creates `TOPUP` transaction (+ amount).
- **Payment (Wallet)**: Customer pays. Creates `PAYMENT` transaction (- amount).
- **Commission Split**: On `DELIVERED`:
  - `EARNING` to Restaurant Wallet (+ amount less commission).
  - `EARNING` to Driver Wallet (+ delivery fee less commission).
- **Refunds**: If order is cancelled post-payment, create `REFUND` transaction (+ amount) to Customer Wallet. Instant and zero cost.
- **Withdrawals**: Driver/Restaurant requests payout. Ensure `SUM(amount) >= 100`. Create `PAYOUT` transaction (- amount).

---

## 9. Real-time Architecture (Socket.io)

Managed by `@nestjs/websockets` Gateway.
- **Namespaces**: `/customer`, `/driver`, `/restaurant`
- **Rooms**: `order_{orderId}`
- **Events**:
  - `Driver`: Emits `driver.location.update` (lat, lng).
  - `Gateway`: Forwards `driver.location.update` to room `order_{orderId}`.
  - `Gateway`: Emits `order.status.update` to respective rooms.
  - `Gateway`: Emits `order.ping` to individual driver socket IDs.

---

## 10. Queue Architecture (BullMQ)

Redis-backed BullMQ handles async reliability.

- **`order-dispatch` Queue**: 
  - Job: Find drivers, send pings. Retries every 30s if no driver accepts.
- **`order-timeout` Queue**:
  - Job: Scheduled for 5 mins after CONFIRMED. If status is still CONFIRMED (restaurant didn't accept), auto-cancel, refund, and notify.
- **`payment-processing` Queue**:
  - Job: Process Omise webhooks asynchronously to ensure no dropped payment confirmations.
- **`notification` Queue**:
  - Job: Send FCM push notifications.

---

## 11. Auth System

- **Strategies**: `passport-local` (Email/Pass for Admin/Restaurant), `passport-jwt` (API auth).
- **Mobile Auth**: Phone number OTP (Mocked for MVP) -> issues JWT.
- **JWT Payload**: `{ sub: userId, role: Role }`.
- **Guards**: `@UseGuards(JwtAuthGuard, RolesGuard)` protecting endpoints.

---

## 12. Multi-Restaurant Routing

- **Validation**: When adding to cart from Restaurant B:
  - Call Mapbox Distance Matrix API.
  - Calculate `Distance(A -> Customer)` vs `Distance(A -> B -> Customer)`.
  - Detour = `Distance(A -> B -> Customer) - Distance(A -> Customer)`.
  - If Detour > 500m, reject.
- **Tier Check**: If multi-restaurant, `SAVER` tier is disabled in response.
- **Routing**: Driver app receives ordered waypoints: `Pickup A -> Pickup B -> Dropoff`. Capacity consumed = 1 order slot.

---

## 13. Error Handling Design

Standardized API response using NestJS Exception Filters.

```json
{
  "success": false,
  "error": {
    "code": "ERR_MIN_ORDER",
    "message": "Minimum order is 100 THB for Restaurant A.",
    "details": { "restaurantId": "xyz", "shortfall": 20 }
  }
}
```
Categories: `VALIDATION_ERROR`, `BUSINESS_LOGIC_ERROR` (e.g., Driver Capacity Exceeded), `PAYMENT_ERROR`, `SYSTEM_ERROR`.

---

## 14. Testing Strategy

- **Unit Tests (Jest)**: `PricingService` (fees, surges, tiers), `OrderStateService` (valid transitions), `RoutingService` (detour math).
- **Integration Tests (Supertest + Test DB)**: API endpoint behavior, Cart validation logic with actual DB state, Prisma spatial queries.
- **E2E Tests**: Core order flow (Create -> Pay -> Accept -> Dispatch -> Deliver) simulating multiple actors.

---

## 15. File Change Map (To be implemented by Developer)

### `packages/database/`
- `prisma/schema.prisma` (Create schema)
- `package.json` (Prisma dependencies)

### `apps/api/src/`
- `app.module.ts` (Root module)
- **`auth/`**: `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, `roles.guard.ts`
- **`users/`**: `users.service.ts`
- **`restaurants/`**: `restaurants.controller.ts`, `restaurants.service.ts`
- **`orders/`**: `orders.controller.ts`, `orders.service.ts`, `order-state.service.ts`
- **`cart/`**: `cart.controller.ts`, `cart.service.ts`, `pricing.service.ts`
- **`dispatch/`**: `dispatch.service.ts`, `dispatch.processor.ts` (BullMQ)
- **`payments/`**: `payments.controller.ts` (Webhooks), `payments.service.ts`, `wallet.service.ts`
- **`geo/`**: `geo.service.ts` (Redis GEO, Mapbox integration)
- **`realtime/`**: `realtime.gateway.ts` (Socket.io)
- **`common/`**: `filters/http-exception.filter.ts`, `decorators/roles.decorator.ts`

### `packages/contracts/`
- `src/dto/` (e.g., `CreateOrderDto.ts`, `CartValidationDto.ts`)
- `src/enums/` (Shared Enums matching Prisma)

*(Note: Frontend apps setup is omitted in this map for brevity but follows standard Next.js/React Native folder structures under `apps/`)*