# Kin Delivery — Full Implementation Plan

## TL;DR
> **Summary**: Build a complete food delivery platform (backend API + 4 frontend apps) from scratch using NestJS, React Native, and Next.js in a Turborepo monorepo.
> **Deliverables**: Working backend with all modules + 4 frontend app shells with core screens + database schema + Docker dev environment
> **Estimated Effort**: Large (20+ tasks across 7 waves)
> **Critical Path**: Monorepo scaffold → Prisma schema → Auth → Orders → Dispatch → Real-time → Frontend

## Context
Kin Delivery is a Thai market food delivery platform with 4 actors: Customer, Driver, Restaurant, Backoffice. Architecture is a modular monolith (single NestJS API) with shared Prisma DB, Redis for geo/cache/queues, and Socket.io for real-time. Full requirements in `01-requirements.md`, full design in `02-design.md`.

## Work Objectives
### Core Objective
Deliver a fully functional food delivery backend API with real-time tracking, multi-restaurant ordering, tiered delivery, wallet payments, and 4 frontend applications.

### Must Have
- Turborepo monorepo with all apps and packages
- PostgreSQL + PostGIS database with Prisma schema (13 models)
- NestJS API with all modules (auth, restaurants, orders, cart, dispatch, payments, wallet, geo, realtime)
- Order state machine with all transitions and side effects
- Driver matching with H3 + Redis GEO + capacity enforcement
- Wallet ledger system (immutable, double-entry)
- Payment integration (Omise + PromptPay QR)
- Real-time order tracking (Socket.io)
- BullMQ job queues (dispatch, timeout, payments, notifications)
- React Native apps (customer + driver) with core screens
- Next.js apps (restaurant + backoffice) with core pages
- Docker Compose for local development
- Unit tests for critical services (pricing, state machine, dispatch)

### Must NOT Have (Guardrails)
- No scheduled/advance ordering (MVP)
- No in-app chat
- No grocery/parcel delivery
- No multi-region/inter-provincial
- No microservices — single NestJS API (modular monolith)
- No production deployment config (just Docker for dev)
- No CI/CD pipeline (manual for now)
- No analytics visualization (backoffice has routes but chart implementation is placeholder)

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 — Foundation (parallel):
├── Task 1: Scaffold Turborepo monorepo        [medium]
├── Task 2: Create Prisma schema + DB package   [medium]
└── Task 3: Create shared contracts package      [quick]

Wave 2 — Core Services (parallel, depends on Wave 1):
├── Task 4: Auth module (JWT + Passport + roles) [medium]
├── Task 5: Geo service (Redis GEO + Mapbox)     [medium]
└── Task 6: Wallet & Payment module (Omise)       [deep]

Wave 3 — Business Logic (parallel, depends on Wave 2):
├── Task 7: Restaurant module (CRUD + menu + PostGIS) [medium]
├── Task 8: Cart & Pricing service                     [medium]
├── Task 9: Order module + State machine               [deep]
└── Task 10: Driver dispatch (BullMQ + matching)       [deep]

Wave 4 — Real-time & Supporting (parallel, depends on Wave 3):
├── Task 11: Socket.io real-time gateway          [medium]
├── Task 12: Notification service (BullMQ + FCM)  [medium]
├── Task 13: Rating system                         [quick]
└── Task 14: Backoffice admin module               [medium]

Wave 5 — Frontend Apps (parallel, depends on Wave 2 for types):
├── Task 15: Customer mobile app (React Native)   [deep]
├── Task 16: Driver mobile app (React Native)     [deep]
├── Task 17: Restaurant web app (Next.js)         [medium]
└── Task 18: Backoffice web app (Next.js)         [medium]

Wave 6 — Testing & DevOps (depends on Wave 4):
├── Task 19: Unit tests (pricing, state machine, dispatch) [medium]
├── Task 20: Integration tests (API endpoints)              [medium]
└── Task 21: Docker Compose (PG + Redis + API)              [quick]

Wave FINAL — Verify:
└── Task 22: Full build + lint + test verification  [quick]
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 (Monorepo) | — | 2, 3, all apps |
| 2 (Prisma) | 1 | 4, 5, 6, 7, 8, 9, 10 |
| 3 (Contracts) | 1 | 4, 5, 6, 7, 8, 9, 10 |
| 4 (Auth) | 2, 3 | 7, 8, 9, 14 |
| 5 (Geo) | 2 | 7, 8, 10 |
| 6 (Wallet) | 2, 3 | 8, 9, 14 |
| 7 (Restaurant) | 4, 5 | 8, 9 |
| 8 (Cart/Pricing) | 5, 6, 7 | 9 |
| 9 (Orders) | 4, 6, 7, 8 | 10, 11, 12, 13 |
| 10 (Dispatch) | 5, 9 | 11 |
| 11 (Real-time) | 9, 10 | 15, 16 |
| 12 (Notifications) | 9 | — |
| 13 (Ratings) | 9 | — |
| 14 (Backoffice) | 4, 6 | 18 |
| 15 (Customer app) | 3, 11 | — |
| 16 (Driver app) | 3, 11 | — |
| 17 (Restaurant web) | 3, 7 | — |
| 18 (Backoffice web) | 3, 14 | — |
| 19 (Unit tests) | 8, 9, 10 | 22 |
| 20 (Integration tests) | 9 | 22 |
| 21 (Docker) | 1, 2 | 22 |
| 22 (Verify) | ALL | — |

## TODOs

- [ ] 1. Scaffold Turborepo monorepo
  **What to do**:
  - Initialize Turborepo with pnpm: `npx create-turbo@latest kin-delivery` in `~/Desktop/personal/`
  - OR manually set up: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
  - Create `apps/api/` as NestJS app (`nest new api --package-manager pnpm --skip-git`)
  - Create `apps/customer-app/` as React Native (Expo) app
  - Create `apps/driver-app/` as React Native (Expo) app
  - Create `apps/restaurant-web/` as Next.js app
  - Create `apps/backoffice-web/` as Next.js app
  - Create `packages/database/`, `packages/contracts/`, `packages/config/`, `packages/mapbox-client/`, `packages/omise-client/`
  - Set up shared TypeScript config in `packages/config/`
  - Set up ESLint + Prettier in `packages/config/`
  - Configure turbo.json with build/dev/test/lint pipelines
  **Must NOT do**: Install app-specific dependencies yet (only monorepo tooling). Don't write any business logic.
  **References**: `02-design.md` Section 2 (Monorepo Structure)
  **Acceptance Criteria**: `pnpm install` succeeds from root. `pnpm build` succeeds for all packages. Each app has a working `dev` script.
  **Commit**: YES — message: `feat: scaffold Turborepo monorepo with all apps and packages`

- [ ] 2. Create Prisma schema + database package
  **What to do**:
  - In `packages/database/`: `pnpm add prisma @prisma/client`
  - Create `prisma/schema.prisma` with ALL 13 models from design doc Section 3
  - Models: User, Customer, Driver, Restaurant, MenuCategory, MenuItem, Address, Order, OrderItem, Wallet, Transaction, Rating, Admin, PlatformConfig
  - Add `openingTime`/`closingTime` to Restaurant model
  - Add `deliveryNote`, `estimatedDurationMin` to Order model
  - Add `externalRefId` + unique constraint `[referenceId, type]` to Transaction model (webhook idempotency)
  - Add PlatformConfig model (key-value for base_fee, distance_rate, commission_pct, etc.)
  - Enable PostGIS extension in schema
  - Add spatial index on Restaurant.location (GIST)
  - Create initial migration: `pnpm prisma migrate dev --name init`
  - Export PrismaClient as package: `packages/database/src/index.ts`
  - Add seed script for test data (1 admin, 2 restaurants with menus, 1 customer, 1 driver)
  **Must NOT do**: Don't create raw SQL migrations — use Prisma migrate. Don't add business logic here.
  **References**: `02-design.md` Section 3 (Prisma Schema)
  **Acceptance Criteria**: `pnpm prisma generate` succeeds. `pnpm prisma migrate dev` creates all tables. Seed script populates test data. PostGIS extension enabled.
  **Commit**: YES — message: `feat: add Prisma schema with 13 models and PostGIS support`

- [ ] 3. Create shared contracts package
  **What to do**:
  - In `packages/contracts/src/enums/`: Create all enums matching Prisma (Role, OrderTier, OrderStatus, PaymentMethod, PaymentStatus, TransactionType)
  - In `packages/contracts/src/dto/`: Create DTOs with Zod validation:
    - `auth.dto.ts` (RegisterDto, LoginDto, TokenResponseDto)
    - `order.dto.ts` (CreateOrderDto, UpdateOrderStatusDto, CartValidationDto)
    - `restaurant.dto.ts` (CreateRestaurantDto, UpdateMenuItemDto)
    - `wallet.dto.ts` (TopupDto, WithdrawDto)
    - `address.dto.ts` (CreateAddressDto)
    - `driver.dto.ts` (UpdateLocationDto, UpdateStatusDto)
  - In `packages/contracts/src/types/`: Shared interfaces (ApiResponse, PaginatedResponse, ErrorResponse)
  - Export everything from `packages/contracts/src/index.ts`
  **Must NOT do**: Don't add NestJS-specific decorators — this is framework-agnostic. Use Zod, not class-validator.
  **References**: `02-design.md` Sections 4, 13 (APIs, Error Handling)
  **Acceptance Criteria**: Package builds cleanly. All DTOs have Zod schemas. Enums match Prisma exactly. Types are exported and importable from other packages.
  **Commit**: YES — message: `feat: add shared contracts package with DTOs, enums, and Zod schemas`

- [ ] 4. Auth module (JWT + Passport + roles)
  **What to do**:
  - Install in `apps/api/`: passport, passport-local, passport-jwt, @nestjs/passport, @nestjs/jwt, bcrypt
  - Create `src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`
  - Create `src/auth/strategies/jwt.strategy.ts`, `local.strategy.ts`
  - Create `src/auth/guards/jwt-auth.guard.ts`, `roles.guard.ts`
  - Create `src/auth/decorators/roles.decorator.ts`, `current-user.decorator.ts`
  - Endpoints: `POST /auth/register` (customer/driver/restaurant), `POST /auth/login`, `POST /auth/refresh`
  - JWT payload: `{ sub: userId, role: Role }`
  - Hash passwords with bcrypt (10 rounds)
  - RolesGuard checks `@Roles('CUSTOMER')` decorator against JWT role
  - Create `src/users/users.module.ts`, `users.service.ts` (CRUD on User model)
  - Create `src/addresses/addresses.controller.ts`, `addresses.service.ts`:
    - `GET /customer/addresses` — list saved addresses for current customer
    - `POST /customer/addresses` — create saved address (label, lat, lng, addressStr)
    - `DELETE /customer/addresses/:id` — delete saved address
  - GPS auto-detect endpoint: `POST /customer/addresses/nearest` — given lat/lng, return saved address within 200m if exists
  **Must NOT do**: Don't implement OTP for mobile (mock it). Don't implement OAuth/social login.
  **References**: `02-design.md` Section 11 (Auth System)
  **Acceptance Criteria**: Register creates user with hashed password. Login returns JWT. Protected routes reject without token (401). RolesGuard rejects wrong role (403). JWT refresh works.
  **Commit**: YES — message: `feat: add auth module with JWT, Passport, and role-based guards`

- [ ] 5. Geo service (Redis GEO + Mapbox wrapper)
  **What to do**:
  - In `packages/mapbox-client/`: Create Mapbox wrapper with:
    - `geocode(address: string)` → lat/lng
    - `reverseGeocode(lat, lng)` → address string
    - `distanceMatrix(origins, destinations)` → distance/duration matrix
    - `directions(waypoints)` → route with distance/duration
  - In `apps/api/src/geo/`: Create `geo.module.ts`, `geo.service.ts`
  - GeoService methods:
    - `findNearbyRestaurants(lat, lng, radiusKm)` → PostGIS ST_DWithin query
    - `findNearbyDrivers(lat, lng, radiusKm)` → Redis GEORADIUS
    - `updateDriverLocation(driverId, lat, lng)` → Redis GEOADD + publish event
    - `calculateDetour(restaurantLocations[], customerLocation)` → Mapbox distance matrix
    - `isWithinRadius(pointA, pointB, radiusMeters)` → haversine or PostGIS
  - Configure Redis connection for GEO commands (ioredis)
  **Must NOT do**: Don't implement H3 grid yet (optimization for scale — PostGIS + Redis GEO is sufficient for MVP). Don't hardcode API keys.
  **References**: `02-design.md` Sections 6, 12 (Driver Matching, Multi-Restaurant Routing)
  **Acceptance Criteria**: `findNearbyRestaurants` returns restaurants within radius. `findNearbyDrivers` returns drivers within radius. `calculateDetour` returns correct detour distance. Redis GEO commands work.
  **Commit**: YES — message: `feat: add geo service with PostGIS queries, Redis GEO, and Mapbox client`

- [ ] 6. Wallet & Payment module (Omise + PromptPay)
  **What to do**:
  - In `packages/omise-client/`: Create Omise wrapper with:
    - `createCharge(amount, source, metadata)` → charge object
    - `createPromptPaySource(amount)` → source with QR data
    - `createCardCharge(amount, cardToken)` → charge object
    - `handleWebhook(payload, signature)` → verified event
  - In `apps/api/src/payments/`: Create `payments.module.ts`, `payments.controller.ts`, `payments.service.ts`
  - PaymentsController: `POST /payments/webhook` (Omise webhook receiver)
  - In `apps/api/src/wallet/`: Create `wallet.module.ts`, `wallet.controller.ts`, `wallet.service.ts`
  - WalletService methods:
    - `getBalance(walletId)` → current balance
    - `topup(walletId, amount, omiseChargeId)` → creates TOPUP transaction
    - `debit(walletId, amount, referenceId)` → creates PAYMENT transaction (validates sufficient funds)
    - `credit(walletId, amount, type, referenceId)` → creates EARNING/REFUND transaction
    - `withdraw(walletId, amount, bankAccount)` → validates ≥ 100 THB, creates PAYOUT transaction
    - `splitCommission(orderId, subtotal, deliveryFee, commissionRate)` → credits restaurant + driver wallets, debits customer
  - All wallet operations must be atomic (Prisma transactions)
  - PromptPay QR generation using `promptparse` library
  **Must NOT do**: Don't implement actual bank transfers for withdrawal (mock it). Don't process real payments in dev. Don't use `as any` for Omise types.
  **References**: `02-design.md` Sections 7, 8 (Fee Calculation, Wallet & Ledger)
  **Acceptance Criteria**: Wallet topup creates immutable transaction. Debit fails if insufficient balance. Withdrawal rejects < 100 THB. Commission split creates correct transactions for all 3 parties. PromptPay QR generates valid EMV QRCPS payload. Omise webhook updates payment status. Duplicate webhooks with same externalRefId are idempotent (no double-credit).
  **Commit**: YES — message: `feat: add wallet ledger and Omise payment integration with PromptPay QR`

- [ ] 7. Restaurant module (CRUD + menu + PostGIS discovery)
  **What to do**:
  - Create `src/restaurants/restaurants.module.ts`, `restaurants.controller.ts`, `restaurants.service.ts`
  - Endpoints:
    - `GET /restaurants?lat=x&lng=y&radius=5` (PostGIS spatial query, uses GeoService)
    - `GET /restaurants/:id` (detail with menu)
    - `GET /restaurants/:id/menu` (full menu with categories + items)
    - `PUT /restaurant/status` (toggle isOpen — Restaurant role only)
    - `POST /restaurant/menu/categories` (create category)
    - `POST /restaurant/menu/items` (create item)
    - `PUT /restaurant/menu/items/:id` (update price, availability)
    - `DELETE /restaurant/menu/items/:id` (soft delete / mark unavailable)
  - Restaurant discovery: filter by isOpen, within radius, sort by distance
  - When restaurant toggles closed → all their orders in PENDING state get auto-cancelled
  - Operating hours enforcement: `GET /restaurants` query filters by current time vs openingTime/closingTime (in addition to isOpen toggle)
  - Restaurant is hidden from customer feed if: `isOpen=false` OR current time outside `openingTime-closingTime`
  **Must NOT do**: Don't implement cuisine search/filters (MVP). Don't implement restaurant images upload.
  **References**: `02-design.md` Sections 4, 3 (Restaurant API, Prisma schema)
  **Acceptance Criteria**: Nearby restaurants query returns only restaurants within radius and isOpen=true. Menu CRUD works. Toggle close auto-cancels pending orders.
  **Commit**: YES — message: `feat: add restaurant module with PostGIS discovery and menu management`

- [ ] 8. Cart & Pricing service
  **What to do**:
  - Create `src/cart/cart.module.ts`, `cart.controller.ts`, `cart.service.ts`, `pricing.service.ts`
  - CartService:
    - `POST /cart/validate` — validates: min 100 THB per restaurant, multi-restaurant detour ≤ 500m (via GeoService), Saver tier blocked for multi-restaurant
    - In-memory cart (no DB persistence for MVP — frontend holds cart state)
  - PricingService:
    - `calculateDeliveryFee(distanceKm, tier, surgeMultiplier)` → fee in THB
    - Formula: `(BaseFee + max(0, (distance - 2km) * DistanceRate)) * TierMultiplier * SurgeMultiplier`
    - Base fee: 15 THB (from config)
    - Distance rate: 10 THB/km after first 2km
    - Tier multipliers: Fastest=1.5, Normal=1.0, Saver=0.7
    - `calculateSurge(lat, lng, radiusKm)` → check driver/order ratio in area using Redis
    - If ratio < 0.5 → surge = 1.5x, else 1.0x
    - Lock surge rate in Redis key (TTL 10 min) when customer starts checkout
  **Must NOT do**: Don't persist cart to DB. Don't implement configurable fee rules via backoffice yet (hardcode for MVP).
  **References**: `02-design.md` Section 7 (Delivery Fee Calculation)
  **Acceptance Criteria**: Cart validation rejects < 100 THB per restaurant. Cart validation rejects > 500m detour. Saver tier blocked for multi-restaurant. Fee calculation matches formula. Surge locks for 10 min.
  **Commit**: YES — message: `feat: add cart validation and pricing service with surge and tier multipliers`

- [ ] 9. Order module + State machine
  **What to do**:
  - Create `src/orders/orders.module.ts`, `orders.controller.ts`, `orders.service.ts`, `order-state.service.ts`
  - OrdersController:
    - `POST /orders` — create order (validates cart, initiates payment, sets status PENDING)
    - `GET /orders/:id` — get order detail with items, driver, restaurant info
    - `GET /orders` — list orders for current user (customer: their orders, driver: assigned orders, restaurant: their orders)
    - `PUT /orders/:id/status` — transition order status (role-specific: restaurant accepts/prepares/ready, driver picks up/delivers)
  - OrderStateService: implements state machine from design doc Section 5
    - Validates transition is legal (rejects invalid transitions)
    - Executes side effects per transition:
      - PENDING → CONFIRMED: enqueue restaurant timeout (5 min), push notification to restaurant
      - CONFIRMED → PREPARING: cancel timeout, start driver dispatch, push to customer
      - CONFIRMED → CANCELLED: refund to Kin Wallet, push to customer
      - PREPARING → READY: update driver UI
      - READY → PICKED_UP: push to customer
      - PICKED_UP → IN_TRANSIT: start GPS streaming
      - IN_TRANSIT → DELIVERED: split commission, push rating prompt
  - For COD orders: skip payment, go directly to CONFIRMED
  - For PromptPay: generate QR via PaymentService, wait for webhook → CONFIRMED
  - For wallet: debit immediately → CONFIRMED
  - For card: charge via Omise → CONFIRMED
  - Customer cancellation: `POST /orders/:id/cancel`
    - Allowed only when status is PENDING or CONFIRMED (before restaurant PREPARING)
    - Refund to Kin Wallet if already paid (wallet/card/PromptPay)
    - COD: no refund needed, just cancel
    - Once PREPARING → reject cancel request (403)
  **Must NOT do**: Don't implement partial orders or refund for individual items. Don't implement order modification after creation.
  **References**: `02-design.md` Sections 4, 5 (Order API, State Machine)
  **Acceptance Criteria**: Order creation works for all 5 payment methods. State machine rejects invalid transitions. Side effects fire correctly (wallet credited, notifications sent, timeouts scheduled). Refund creates wallet transaction on cancellation.
  **Commit**: YES — message: `feat: add order module with state machine and payment flow`

- [ ] 10. Driver dispatch service (BullMQ + matching)
  **What to do**:
  - Create `src/dispatch/dispatch.module.ts`, `dispatch.service.ts`, `dispatch.processor.ts`
  - DispatchProcessor (BullMQ worker on `order-dispatch` queue):
    1. Find eligible drivers via `GeoService.findNearbyDrivers(restaurantLat, restaurantLng, 5km)` UNION `GeoService.findNearbyDrivers(customerLat, customerLng, 5km)`
    2. Filter by capacity: check active order count vs tier limit (Fastest=0, Normal<2, Saver<3)
    3. Filter out drivers with active FASTEST orders (can't batch)
    4. Score remaining by distance (nearest first)
    5. Send `order.ping` to top 5 via Socket.io
    6. If no driver accepts in 30s → retry (max 3 retries)
  - Driver acceptance: `POST /driver/orders/:id/accept`
    - Redis SETNX lock `order:{orderId}:driver` → first one wins
    - Update order.driverId in DB
    - Notify customer + restaurant via Socket.io
  - Driver status: `PUT /driver/status` (online/offline)
    - Online: add to Redis GEO set `drivers:active`
    - Offline: remove from Redis GEO set
  - Driver location: `PUT /driver/location` (lat, lng)
    - Update Redis GEO + publish to Socket.io rooms
  - In-transit monitor: BullMQ repeatable job (every 15 min)
    - Query orders WHERE status=IN_TRANSIT AND updatedAt < NOW()-2hours
    - For each: auto-transition to FAILED, refund customer wallet, flag driver for backoffice review
    - Push notification to customer: "Your order could not be delivered. Refund has been issued."
  **Must NOT do**: Don't implement complex scoring (rating, acceptance rate) — distance-only for MVP. Don't implement driver reassignment on timeout (just retry dispatch).
  **References**: `02-design.md` Section 6 (Driver Matching Algorithm)
  **Acceptance Criteria**: Only drivers within 5km get pinged. Capacity is correctly enforced per tier. SETNX prevents double-booking. Retry works after 30s. Online/offline updates Redis GEO set.
  **Commit**: YES — message: `feat: add driver dispatch with geofenced matching and capacity enforcement`

- [ ] 11. Socket.io real-time gateway
  **What to do**:
  - Create `src/realtime/realtime.module.ts`, `realtime.gateway.ts`
  - Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
  - Gateway configuration:
    - Namespace `/tracking` for order tracking
    - Auth: verify JWT on connection handshake
    - Rooms: `order:{orderId}` — customer + driver + restaurant join
  - Events:
    - `join_order(orderId)` — join room
    - `leave_order(orderId)` — leave room
    - `driver_location_update({ orderId, lat, lng })` — driver emits, gateway broadcasts to room
    - `order_status_update({ orderId, status })` — server emits to room on state change
    - `order_ping({ orderId, restaurantName })` — server emits to specific driver socket
  - Integration: OrderStateService and DispatchService emit events through gateway
  **Must NOT do**: Don't implement separate namespaces per role (single `/tracking` namespace is simpler for MVP). Don't implement connection pooling or Redis adapter (single-instance for MVP).
  **References**: `02-design.md` Section 9 (Real-time Architecture)
  **Acceptance Criteria**: Client can connect with JWT. Join room for specific order. Driver location broadcasts to room. Order status updates broadcast to room. Disconnect cleans up rooms.
  **Commit**: YES — message: `feat: add Socket.io real-time gateway for order tracking and driver location`

- [ ] 12. Notification service (BullMQ + FCM)
  **What to do**:
  - Create `src/notifications/notifications.module.ts`, `notifications.service.ts`, `notification.processor.ts`
  - BullMQ queue: `notifications`
  - NotificationService:
    - `sendPush(userId, title, body, data)` → enqueue FCM push
    - `notifyOrderStatus(orderId, status)` → determine recipients + messages
  - NotificationProcessor (BullMQ worker):
    - Dequeue notification job
    - Look up FCM token from User table
    - Send via Firebase Admin SDK
    - Log success/failure
  - Add `fcmToken` field to User model (update Prisma schema)
  - Endpoint: `PUT /users/fcm-token` — update FCM token after login
  **Must NOT do**: Don't implement email or SMS. Don't implement notification preferences. Don't implement in-app notification center.
  **References**: `02-design.md` Section 10 (Queue Architecture)
  **Acceptance Criteria**: Push notification delivered via FCM. Notification job retries on failure. FCM token updates correctly.
  **Commit**: YES — message: `feat: add notification service with BullMQ queue and FCM push`

- [ ] 13. Rating system
  **What to do**:
  - Create `src/ratings/ratings.module.ts`, `ratings.controller.ts`, `ratings.service.ts`
  - Endpoints:
    - `POST /orders/:id/rate` — customer rates (score 1-5, optional comment, rates both driver + restaurant)
    - `GET /restaurants/:id/ratings` — get restaurant ratings (avg + list)
    - `GET /drivers/:id/rating` — get driver average rating
  - Business rules:
    - Can only rate after order is DELIVERED
    - Can only rate once per order
    - Rating updates Restaurant.averageRating and Driver.averageRating (calculated fields or materialized)
  **Must NOT do**: Don't implement driver-rates-customer. Don't implement rating moderation.
  **References**: `01-requirements.md` FR9.1
  **Acceptance Criteria**: Rating created for delivered order. Duplicate rating rejected. Average rating calculated correctly.
  **Commit**: YES — message: `feat: add rating system for orders`

- [ ] 14. Backoffice admin module
  **What to do**:
  - Create `src/admin/admin.module.ts`, `admin.controller.ts`, `admin.service.ts`
  - Endpoints (all require ADMIN role):
    - `GET /admin/dashboard` — aggregated stats (today's orders, revenue, active drivers, active restaurants)
    - `GET /admin/users?role=CUSTOMER&page=1` — paginated user list with filters
    - `GET /admin/orders?status=DELIVERED&page=1` — paginated order list with filters
    - `GET /admin/restaurants` — restaurant list with earnings
    - `GET /admin/drivers` — driver list with earnings and ratings
    - `GET /admin/finances/summary` — total revenue, commission earned, payouts
    - `GET /admin/finances/transactions?type=EARNING` — transaction list
    - `PUT /admin/config` — update platform config (base fee, distance rate, commission %, min order, min withdrawal)
  - Store config in a `PlatformConfig` table (key-value pairs) or simple JSON
  - Dashboard queries: use Prisma aggregations (count, sum, avg)
  **Must NOT do**: Don't build chart visualizations (just return JSON data). Don't implement user ban/suspend. Don't implement dispute resolution flow.
  **References**: `02-design.md` Section 4 (Backoffice API), `01-requirements.md` FR8
  **Acceptance Criteria**: Dashboard returns correct aggregated stats. User/order/restaurant lists are paginated. Config updates affect pricing calculations. Only ADMIN role can access.
  **Commit**: YES — message: `feat: add backoffice admin module with dashboard and config management`

- [ ] 15. Customer mobile app (React Native)
  **What to do**:
  - In `apps/customer-app/`: Set up React Native (Expo) with TypeScript
  - Core screens:
    - **LocationSelect**: Map with GPS auto-detect (200m saved address), address picker
    - **Home/Feed**: Restaurant list (cards with name, rating, distance, delivery time)
    - **RestaurantDetail**: Menu with categories, add-to-cart
    - **Cart**: Items grouped by restaurant, tier selector, fee breakdown
    - **Checkout**: Payment method selector, PromptPay QR display, confirm
    - **OrderTracking**: Map with driver location (Socket.io), order status timeline
    - **OrderHistory**: List of past orders
    - **Profile**: Saved addresses, wallet balance, payment methods
    - **WalletTopup**: Amount input, payment method for topup
  - API client using fetch/axios pointing to `apps/api`
  - Socket.io client for real-time tracking
  - State management: Zustand
  - Navigation: React Navigation (stack + tabs)
  **Must NOT do**: Don't implement pixel-perfect UI (functional screens with basic styling). Don't implement push notification handling (just register FCM token). Don't implement image upload.
  **References**: `02-design.md` Section 2 (Monorepo), `01-requirements.md` FR1-FR4
  **Acceptance Criteria**: All core screens render. API calls work end-to-end. Order tracking shows real-time driver location. Cart validation enforces min order and detour limit. Payment flow works for all methods.
  **Commit**: YES — message: `feat: add customer mobile app with core screens and order flow`

- [ ] 16. Driver mobile app (React Native)
  **What to do**:
  - In `apps/driver-app/`: Set up React Native (Expo) with TypeScript
  - Core screens:
    - **Login**: Email/password
    - **Home/Dashboard**: Online/offline toggle, current earnings, active orders count
    - **OrderPing**: Incoming order notification with restaurant name, distance, fee, accept/reject
    - **ActiveOrders**: List of current orders with status, tap to navigate
    - **OrderDetail**: Pickup address, dropoff address, items, customer info, status buttons (picked up → in transit → delivered)
    - **Navigation**: Map with route to pickup/dropoff (Mapbox directions)
    - **Wallet**: Balance, transaction history, withdraw button
    - **WithdrawRequest**: Amount input, bank account, confirm (min 100 THB)
  - Background location tracking (publish to API every 5s when online)
  - Socket.io client for order pings
  **Must NOT do**: Don't implement background location when app is closed (foreground only for MVP). Don't implement driver onboarding/document upload.
  **References**: `02-design.md` Section 4 (Driver API), `01-requirements.md` FR5
  **Acceptance Criteria**: Online toggle updates Redis GEO. Location updates stream to API. Order pings appear in real-time. Accept/reject works with SETNX lock. Status transitions update order. Wallet withdrawal enforces 100 THB minimum.
  **Commit**: YES — message: `feat: add driver mobile app with dispatch, tracking, and wallet`

- [ ] 17. Restaurant web app (Next.js)
  **What to do**:
  - In `apps/restaurant-web/`: Set up Next.js with TypeScript + Tailwind CSS
  - Core pages:
    - **Login**: Email/password
    - **Dashboard**: Open/close toggle, today's orders count, today's revenue
    - **OrderQueue**: Live incoming orders (Socket.io), accept/reject buttons, status progression (preparing → ready)
    - **MenuManagement**: Categories list, items CRUD (name, price, availability toggle)
    - **OrderHistory**: Past orders with filters
    - **Wallet**: Balance, transaction history, withdraw
    - **Settings**: Operating hours, restaurant info
  - Socket.io client for real-time order notifications
  **Must NOT do**: Don't implement multi-staff accounts. Don't implement analytics charts. Don't implement menu item images.
  **References**: `02-design.md` Section 4 (Restaurant API), `01-requirements.md` FR6
  **Acceptance Criteria**: Order queue shows incoming orders in real-time. Accept/reject transitions order status. Menu CRUD works. Open/close toggle works. Wallet shows correct balance.
  **Commit**: YES — message: `feat: add restaurant web app with order queue and menu management`

- [ ] 18. Backoffice web app (Next.js)
  **What to do**:
  - In `apps/backoffice-web/`: Set up Next.js with TypeScript + Tailwind CSS
  - Core pages:
    - **Login**: Email/password (ADMIN role only)
    - **Dashboard**: Key metrics cards (orders today, revenue, active drivers, active restaurants)
    - **Orders**: Paginated table with filters (status, date, restaurant), detail drawer
    - **Users**: Paginated table (customers, drivers, restaurants) with filters
    - **Restaurants**: Restaurant list with earnings, detail page
    - **Drivers**: Driver list with ratings, earnings, detail page
    - **Finances**: Revenue summary, transaction table with filters
    - **Config**: Form to edit platform settings (fees, commissions, minimums)
  - Data tables using server-side pagination
  **Must NOT do**: Don't implement chart visualizations (tables with numbers only). Don't implement export to CSV. Don't implement incentive management UI.
  **References**: `02-design.md` Section 4 (Backoffice API), `01-requirements.md` FR8
  **Acceptance Criteria**: Dashboard displays correct aggregated numbers. All tables paginate correctly. Config form saves and affects pricing. Only ADMIN role can access.
  **Commit**: YES — message: `feat: add backoffice web app with dashboard, tables, and config`

- [ ] 19. Unit tests for critical services
  **What to do**:
  - `apps/api/src/cart/__tests__/pricing.service.spec.ts`:
    - Test fee calculation with all tier multipliers
    - Test surge multiplier application
    - Test edge cases (0 distance, max distance)
  - `apps/api/src/orders/__tests__/order-state.service.spec.ts`:
    - Test all valid state transitions
    - Test rejection of invalid transitions (e.g., PENDING → DELIVERED)
    - Test side effects are triggered (mock wallet, notification services)
  - `apps/api/src/dispatch/__tests__/dispatch.service.spec.ts`:
    - Test capacity filtering per tier
    - Test 5km radius filtering
    - Test SETNX lock prevents double-booking
  - `apps/api/src/wallet/__tests__/wallet.service.spec.ts`:
    - Test debit with insufficient balance
    - Test withdrawal with < 100 THB
    - Test commission split creates correct transactions
  - Use Jest with mocked Prisma client and Redis
  **Must NOT do**: Don't write tests for CRUD endpoints (integration tests cover those). Don't aim for 100% coverage — focus on business logic.
  **References**: `02-design.md` Section 14 (Testing Strategy)
  **Acceptance Criteria**: All tests pass. Business logic edge cases are covered. No tests depend on external services (all mocked).
  **Commit**: YES — message: `test: add unit tests for pricing, state machine, dispatch, and wallet`

- [ ] 20. Integration tests (API endpoints)
  **What to do**:
  - Set up test database (separate PostgreSQL database for tests)
  - Create `apps/api/test/setup.ts` with test DB initialization, migration, and teardown
  - Test files:
    - `test/auth.e2e-spec.ts`: register, login, protected route access, role guard
    - `test/orders.e2e-spec.ts`: create order (wallet payment), full lifecycle (PENDING → DELIVERED)
    - `test/restaurants.e2e-spec.ts`: nearby query, menu CRUD
    - `test/wallet.e2e-spec.ts`: topup, debit, withdrawal
  - Use Supertest for HTTP assertions
  - Seed test data before each test suite
  **Must NOT do**: Don't test Socket.io in integration tests (unit test the gateway). Don't test external services (mock Omise, Mapbox).
  **References**: `02-design.md` Section 14 (Testing Strategy)
  **Acceptance Criteria**: All integration tests pass against test DB. Auth flow works end-to-end. Order lifecycle completes without errors. Wallet operations are atomic.
  **Commit**: YES — message: `test: add integration tests for auth, orders, restaurants, and wallet`

- [ ] 21. Docker Compose for local development
  **What to do**:
  - Create `docker-compose.yml` at project root with:
    - PostgreSQL 15 with PostGIS extension (`postgis/postgis:15-3.3`)
    - Redis 7 (`redis:7-alpine`)
    - (Optional) Bull Board for queue monitoring
  - Create `.env.example` with all environment variables
  - Create `scripts/setup.sh`: install deps, run migrations, seed DB
  - Update root `package.json` with scripts: `db:up`, `db:down`, `db:migrate`, `db:seed`
  **Must NOT do**: Don't containerize the NestJS app itself (dev runs natively). Don't add production configs.
  **References**: Project root
  **Acceptance Criteria**: `docker-compose up -d` starts PG + Redis. `pnpm db:migrate` runs migrations against Docker PG. `pnpm db:seed` populates test data. `.env.example` documents all required vars.
  **Commit**: YES — message: `feat: add Docker Compose for local PostgreSQL and Redis`

- [ ] 22. Full build + lint + test verification
  **What to do**:
  - Run `pnpm build` from root — all packages and apps compile
  - Run `pnpm lint` from root — no lint errors
  - Run `pnpm test` from root — all tests pass
  - Run `pnpm prisma migrate status` — no pending migrations
  - Verify API starts: `pnpm --filter api dev` → health check endpoint responds
  - Verify frontend apps start: each `pnpm dev` renders without errors
  - Fix any issues found during verification
  **Must NOT do**: Don't fix pre-existing issues in dependencies. Don't add new features.
  **References**: All files
  **Acceptance Criteria**: Zero build errors. Zero lint errors. All tests pass. All apps start without crashes. API health check returns 200.
  **Commit**: YES — message: `chore: verify full build, lint, and test suite`
