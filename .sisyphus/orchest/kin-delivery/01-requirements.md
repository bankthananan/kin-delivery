# Kin Delivery — Business Requirements Document (BRD)

## 1. Executive Summary
**Kin Delivery** is a food delivery platform optimized for the Thai market. The platform connects customers, drivers, and restaurants through dedicated applications (Customer Mobile/Web, Driver Mobile, Restaurant Web, Backoffice Web). Key differentiators include delivery speed tiers (Fastest, Normal, Saver), strict multi-restaurant detour constraints (≤ 500m), and comprehensive local payment integrations (PromptPay, In-app Wallet, COD). 

## 2. Affected Components/Modules
*   **Customer App (React Native Mobile + Next.js Web):** Location selection, Restaurant discovery, Cart & Checkout (Speed tiers, Multi-restaurant), Real-time tracking, Payments (PromptPay, Wallet, Cards, COD).
*   **Driver App (React Native Mobile):** Geo-fenced dispatching (5km radius), Order capacity management (Tier-based), Real-time location streaming, Wallet ledger & Earnings.
*   **Restaurant App (Web/Tablet):** Order queue management (Manual acceptance), Menu & Pricing management, Operating hours, Wallet ledger & Earnings.
*   **Backoffice (Web):** Platform configuration (Fees, Commissions), Incentive management, User & Order management, Analytics & Reports.
*   **Core Backend (NestJS, PostgreSQL/PostGIS, Redis, BullMQ, Socket.io):** Order state machine, Mapbox routing engine, Omise payment gateway, Notification engine.

---

## 3. Functional Requirements (FR) & Acceptance Criteria

### FR1: Customer Location & Discovery
**Priority:** MUST
*   **FR1.1 (Location First):** The system must require the user to select a delivery location before browsing restaurants.
    *   *AC1.1:* **GIVEN** a user opens the app without a selected location, **WHEN** they attempt to browse the home feed, **THEN** they are prompted with a location selection modal that blocks browsing until an address is set.
*   **FR1.2 (GPS Auto-detect):** The system must auto-detect if the user is within 200m of a saved address and auto-select it.
    *   *AC1.2:* **GIVEN** a user has a saved address "Home" at [Lat, Lng], **WHEN** the user opens the app and their GPS location is ≤ 200m from "Home", **THEN** "Home" is automatically set as the delivery address.
*   **FR1.3 (Restaurant Filtering):** The system must display restaurants serviceable to the selected delivery location.
    *   *AC1.3:* **GIVEN** a delivery location is set, **WHEN** the user browses the feed, **THEN** only restaurants within the maximum allowed delivery radius (configurable) are displayed.

### FR2: Minimum Orders & Multi-Restaurant
**Priority:** MUST
*   **FR2.1 (Minimum Order):** The system must enforce a minimum order of 100 THB *per restaurant*.
    *   *AC2.1:* **GIVEN** a cart contains 80 THB from Restaurant A, **WHEN** the user proceeds to checkout, **THEN** the system blocks checkout and displays a validation error: "Minimum order is 100 THB for Restaurant A."
*   **FR2.2 (Multi-Restaurant Detour Limit):** The system allows ordering from multiple restaurants if the total route detour is ≤ 500m.
    *   *AC2.2:* **GIVEN** a cart has items from Restaurant A, **WHEN** the user attempts to add items from Restaurant B, **THEN** the system calculates the route detour using Mapbox. If detour > 500m, an error is shown and addition is blocked. If ≤ 500m, the items are successfully added.

### FR3: Delivery Speed Tiers
**Priority:** MUST
*   **FR3.1 (Tier Selection):** Customers must choose between Fastest (max 1 concurrent order), Normal (max 2), or Saver (max 3) at checkout.
    *   *AC3.1:* **GIVEN** a user is at checkout, **WHEN** selecting delivery options, **THEN** the system displays 3 tiers with dynamically calculated fees (Fastest = Premium, Normal = Standard, Saver = Discounted).

### FR4: Payment & Wallet Ledger
**Priority:** MUST
*   **FR4.1 (Payment Methods):** Support PromptPay QR, App-generated QR, COD, Saved Cards, and In-app Wallet.
    *   *AC4.1:* **GIVEN** a user is confirming an order, **WHEN** they open the payment selector, **THEN** all 5 supported methods are available for selection.
*   **FR4.2 (Ledger Withdrawals):** Drivers and Restaurants must have a minimum balance of 100 THB to withdraw funds.
    *   *AC4.2:* **GIVEN** a driver has 90 THB in their wallet, **WHEN** they attempt to withdraw to their bank account, **THEN** the withdrawal is rejected with a validation error: "Minimum withdrawal is 100 THB."

### FR5: Driver Dispatch & Capacity
**Priority:** MUST
*   **FR5.1 (Dispatch Radius):** Drivers receive notifications ONLY if within a 5km radius of EITHER the customer OR the restaurant.
    *   *AC5.1:* **GIVEN** a new order is ready for dispatch, **WHEN** the system queries for drivers, **THEN** only drivers whose PostGIS location is ≤ 5km from the restaurant OR the customer receive the ping.
*   **FR5.2 (Capacity Enforcement):** Drivers cannot exceed the concurrent order limit defined by their active orders' tier (Fastest=1, Normal=2, Saver=3).
    *   *AC5.2:* **GIVEN** a driver has accepted a "Fastest" order, **WHEN** a new order appears in their radius, **THEN** the system does not dispatch the new order to this driver until the active order is delivered.

### FR6: Restaurant Order Management
**Priority:** MUST
*   **FR6.1 (Manual Acceptance):** Restaurants must explicitly accept an order before it proceeds.
    *   *AC6.1:* **GIVEN** a new order arrives, **WHEN** the restaurant views the queue, **THEN** the order state remains 'pending' until a staff member taps 'Accept', transitioning it to 'preparing'.
*   **FR6.2 (Menu & Operations):** Restaurants can manage menu items and toggle store open/close status.
    *   *AC6.2:* **GIVEN** a restaurant manager is logged in, **WHEN** they toggle the store status to 'Closed', **THEN** the restaurant immediately becomes un-orderable on the Customer App.

### FR7: Order State Machine & Tracking
**Priority:** MUST
*   **FR7.1 (State Machine):** Strict state flow: pending → confirmed → preparing → ready → picked_up → in_transit → delivered.
    *   *AC7.1:* **GIVEN** an order is 'pending', **WHEN** a driver attempts to mark it 'picked_up', **THEN** the system rejects the state transition because it skips intermediate states.
*   **FR7.2 (Real-time GPS):** Customers see the driver's location streaming on a map.
    *   *AC7.2:* **GIVEN** an order state is 'picked_up' or 'in_transit', **WHEN** the customer views the tracking screen, **THEN** the driver's location updates in real-time via Socket.io.

### FR8: Backoffice Admin
**Priority:** MUST
*   **FR8.1 (Config Management):** Admins can manage fee rules, commissions, and minimum amounts.
    *   *AC8.1:* **GIVEN** an admin updates the global commission rate to 30%, **WHEN** a new order is placed, **THEN** the platform fee is calculated using the new 30% rate.
*   **FR8.2 (Incentive & Reporting):** Admins can view analytics and manage incentives.
    *   *AC8.2:* **GIVEN** an admin navigates to the dashboard, **WHEN** the page loads, **THEN** daily revenue, top restaurants, and driver performance metrics are displayed.

### FR9: Ratings & Notifications
**Priority:** SHOULD
*   **FR9.1 (Rating System):** Customers rate driver/restaurant; drivers rate customers.
    *   *AC9.1:* **GIVEN** an order is 'delivered', **WHEN** the customer opens the app, **THEN** they are prompted to rate the order out of 5 stars.
*   **FR9.2 (Push Notifications):** Users receive push notifications on state changes.
    *   *AC9.2:* **GIVEN** a restaurant accepts an order, **WHEN** the state changes to 'confirmed', **THEN** the customer receives a push notification on their mobile device.

---

## 4. Non-Functional Requirements (NFR)
1.  **Performance (NFR1):** Real-time GPS location streaming via Socket.io must have < 2 seconds latency. (Priority: MUST)
2.  **Scalability (NFR2):** The 5km radius dispatch engine must utilize PostGIS spatial indexes to resolve available drivers in < 200ms under load. (Priority: MUST)
3.  **Data Integrity (NFR3):** The Wallet Ledger must be immutable. All transactions (top-ups, payouts, refunds) are append-only. (Priority: MUST)
4.  **Reliability (NFR4):** Order dispatching must use BullMQ to ensure no order pings are lost during Redis/Node restarts. (Priority: MUST)

---

## 5. Edge Cases (CRITICAL)
1.  **Payment Fails Post-Confirmation:** A PromptPay QR expires or Omise webhook reports a failure *after* the restaurant has started preparing. Does the system auto-cancel and notify the restaurant to stop cooking?
2.  **Driver Goes Offline / GPS Lost:** If a driver's phone dies mid-delivery, how does the system detect the timeout and reassign the order? Who pays for the food if the driver absconds?
3.  **Restaurant Ignores Order:** If an order sits in 'pending' for > 5 minutes, it must auto-cancel. The customer must be refunded automatically (especially complex for PromptPay).
4.  **Multi-Restaurant Driver Capacity Conflict:** If a driver is on a "Saver" tier (max 3 orders) but picks up a multi-restaurant order (1 order ID, but 2 pickup spots), this must consume exactly 1 capacity slot, but the routing algorithm must account for both waypoints.
5.  **Customer Unreachable (COD):** The driver arrives but the customer is unresponsive, and the order is Cash on Delivery. The system needs a "Failed Delivery" flow to compensate the driver and absorb/charge the restaurant cost.
6.  **Surge Pricing during Cart Building:** If surge pricing kicks in *while* the user is building a multi-restaurant cart, the fee calculation must lock the surge multiplier at the start of checkout to avoid bait-and-switch.
7.  **Restaurant Rejects Order:** If a restaurant explicitly rejects a paid order, the state machine must trigger an immediate refund workflow and push notification to the user.

---

## 6. Out of Scope
*   Cross-city or inter-provincial deliveries (hyperlocal only).
*   Scheduled/Advance ordering (immediate fulfillment only for MVP).
*   In-app chat between Customer and Driver (reliance on direct phone calls for MVP).
*   Grocery, parcel, or prescription delivery (strictly restaurant food).

---

## 7. Resolved Stakeholder Questions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Auto-cancellation timeout | **5 minutes** | Industry standard (Grab/LINE MAN). Balances customer UX with restaurant reality. |
| 2 | PromptPay refund destination | **Refund to Kin Wallet** | Instant, zero cost, keeps money in ecosystem. Customer can withdraw later if needed. |
| 3 | COD cash handling limit | **1,500 THB max** | Grab standard. Driver must remit excess via PromptPay before accepting more COD orders. |
| 4 | Surge pricing trigger | **Driver-to-order ratio < 0.5 → 1.5x surge** | When 2x more orders than available drivers in an area, apply 1.5x multiplier. |
| 5 | Multi-restaurant + Saver tier | **Blocked** | Multi-restaurant orders can only use Fastest or Normal. Prevents food quality issues from too many driver stops. |
| 6 | Customer order cancellation | **Free cancel before restaurant accepts** | Customer can cancel for free while PENDING/CONFIRMED. Once PREPARING, cancellation blocked. Refund to Kin Wallet. |
| 7 | Driver stuck in transit | **Auto-fail after 2 hours** | BullMQ cron checks every 15 min. If IN_TRANSIT > 2hr with no GPS update, auto-fail, refund customer, flag driver. |
| 8 | VAT handling | **VAT-inclusive prices** | Menu prices include 7% VAT. Receipt shows VAT breakdown as informational. |
| 9 | Wallet refund legality | **Confirmed OK** | Standard practice (Grab/LINE MAN). ToS covers it. Users can withdraw to bank anytime. |
| 10 | Restaurant operating hours | **Add auto-schedule** | Restaurant sets hours (e.g., 10:00-22:00). System auto-hides outside hours. Manual override available. |
| 11 | Driver onboarding | **Self-service, no admin approval** | Driver registers and can go online immediately. No approval gate. |
