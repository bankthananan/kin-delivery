# Intake: Kin Delivery — Food Delivery Platform

## Date
2026-04-13

## Request Type
New feature (complex) — Greenfield project

## Routing Decision
```
Roles: Analyst → Architect → Developer → Tester → Reviewer
Skipping: Monitor (no deployment yet)
```

## Raw Requirements (from user)

### Project
- **Name**: kin-delivery
- **Stack**: Node.js / NestJS / TypeScript
- **Scope**: Backend + Mobile (React Native) + Web (Next.js)
- **Apps**: Customer, Restaurant, Driver, Backoffice

### Client App
- Select delivery location first
- GPS auto-detect: if within 200m of a saved address (Home, Office, etc.), auto-select it
- Minimum order: 100 THB per order
- Multi-restaurant: allowed, but total route detour ≤ 500m extra
- Delivery tiers:
  - **Fastest**: driver carries only YOUR order (max 1). Premium price.
  - **Normal**: driver batches up to 2 orders. Standard price.
  - **Saver**: driver batches up to 3 orders. Cheapest.
- Payment methods: PromptPay QR, app-generated QR, cash, saved card, wallet (topup/prepaid)

### Driver App
- Notifications: only within 5km radius of either client location OR restaurant location
- Max concurrent orders per tier: Fastest=1, Normal=2, Saver=3
- Payment: into wallet, minimum withdrawal 100 THB

### Restaurant App
- Receives order notifications in queue
- Must accept order first (protects against forgotten open status)
- Payment: into wallet (same as driver)

### Backoffice
- Manage incentive costs (driver + restaurant)
- Analytics dashboards (client, driver, restaurant metrics)
- Platform management (users, orders, payments, disputes)

## Research Findings

### Architecture References
- Medusa Eats: workflow-driven order lifecycle (state machine)
- Enatega: multi-app separation (customer/driver/restaurant/admin)
- NextOrders: schema-driven typed contracts (Zod)

### Recommended Stack
| Layer | Choice |
|-------|--------|
| Framework | NestJS (multi-app monorepo) |
| Monorepo | Turborepo + pnpm |
| Database | PostgreSQL + Prisma + PostGIS |
| Real-time | Socket.io (@nestjs/websockets) |
| Queue | BullMQ + Redis |
| Auth | Passport.js (JWT, multi-role) |
| Payment | Omise (PromptPay + cards + wallets) |
| QR | promptparse (PromptPay) + app QR |
| Maps | Mapbox (geocoding, distance matrix) |
| Geospatial | PostGIS + Redis GEO + H3 hexagonal grid |
| Mobile | React Native |
| Web | Next.js |
| Notifications | Firebase Cloud Messaging + LINE Messaging API |

### Thai Market Specifics
- Omise: 1.5% PromptPay, 3.65% cards
- Mapbox: 100K free/month, premium Thailand coverage
- promptparse v1.5.0: actively maintained PromptPay QR generation
- LINE Login: 50M+ Thai users (optional social login)

## Skipped Roles
| Role | Reason |
|------|--------|
| Monitor | Greenfield — no deployment to monitor yet |
