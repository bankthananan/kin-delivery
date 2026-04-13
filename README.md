# Kin Delivery 🍜

> **กิน** (kin) — Thai for "eat"

Food delivery platform for the Thai market. Multi-actor system: Customer, Driver, Restaurant, Backoffice.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (TypeScript) |
| Monorepo | Turborepo + pnpm |
| Database | PostgreSQL 15 + Prisma + PostGIS |
| Cache/Geo | Redis 7 |
| Queue | BullMQ |
| Real-time | Socket.io |
| Auth | Passport.js (JWT) |
| Payment | Omise + PromptPay QR |
| Maps | Mapbox |
| Mobile | React Native (Expo) |
| Web | Next.js + Tailwind CSS |

## Project Structure

```
kin-delivery/
├── apps/
│   ├── api/                  # NestJS backend (modular monolith)
│   ├── customer-app/         # React Native (Customer)
│   ├── driver-app/           # React Native (Driver)
│   ├── restaurant-web/       # Next.js (Restaurant portal)
│   └── backoffice-web/       # Next.js (Admin dashboard)
├── packages/
│   ├── database/             # Prisma schema + migrations
│   ├── contracts/            # Shared DTOs, enums, Zod schemas
│   ├── config/               # Shared ESLint, TS, Prettier configs
│   ├── mapbox-client/        # Mapbox API wrapper
│   └── omise-client/         # Omise payment wrapper
└── .sisyphus/                # AI orchestration artifacts
```

## Key Features

- **Delivery Tiers**: Fastest (exclusive), Normal (batch 2), Saver (batch 3)
- **Multi-Restaurant Orders**: ≤500m route detour constraint
- **Smart GPS**: Auto-detect nearest saved address within 200m
- **Thai Payments**: PromptPay QR, cards, cash, in-app wallet
- **Real-time Tracking**: Driver GPS streaming via Socket.io
- **Geofenced Dispatch**: 5km radius driver matching
- **Surge Pricing**: Driver-to-order ratio based (1.5x when < 0.5)
- **Wallet System**: Immutable ledger for all actors (customer, driver, restaurant)

## Documentation

| Document | Path |
|----------|------|
| Requirements (BA) | `.sisyphus/orchest/kin-delivery/01-requirements.md` |
| Technical Design (SA) | `.sisyphus/orchest/kin-delivery/02-design.md` |
| Execution Plan | `.sisyphus/plans/kin-delivery.md` |

## Getting Started

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker

# Start infrastructure
docker-compose up -d

# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Seed test data
pnpm db:seed

# Start all apps
pnpm dev
```

## License

Private — All rights reserved.
