# HomeChef - Cloud Kitchen Management Platform

## Product Vision

A platform that empowers home chefs and cloud kitchens (especially women operating from their apartments in Indian cities) to manage their food business seamlessly. **Customers interact via Telegram**, while **kitchen owners manage operations through a mobile web app (PWA)**. An **AI engine handles most customer conversations** automatically, reducing the manual workload on the kitchen owner.

### Core Philosophy

- **Customers** stay in Telegram — no app to download, no friction
- **Kitchen owners** get a simple, powerful dashboard to run their business
- **AI handles the chatter** — the owner focuses on cooking and delivering

---

## Architecture Overview

```
                      ┌─────────────────────────────┐
                      │  Telegram Bot (Per Kitchen)   │
                      │  - User Registration          │
                      │  - Menu Display               │
                      │  - Order Placement            │
                      │  - AI Chat (DeepSeek V4)     │
                      │  - Order Status Updates       │
                      └───────────┬───────────────────┘
                                  │
                      ┌───────────▼───────────────────┐
                      │     LangChain AI Engine        │
                      │  - Intent Classification        │
                      │  - Context Management           │
                      │  - Knowledge Base (Menu/Time)  │
                      │  - Customer Memory              │
                      └───────────┬───────────────────┘
                                  │
              ┌───────────────────┼─────────────────────┐
              │                   │                      │
    ┌─────────▼─────────┐ ┌──────▼──────┐ ┌──────────▼──────────┐
    │  Backend API       │ │  PostgreSQL │ │  Redis Cache         │
    │  (Node.js/TS)      │ │  + Redis    │ │  - Active orders     │
    │  - Order Service   │ │            │ │  - Session context   │
    │  - Menu Service    │ │  Primary DB │ │  - Rate limiting     │
    │  - Subscription    │ │            │ │                      │
    │  - Inventory       │ │  Storage   │ │                      │
    └─────────┬─────────┘ └────────────┘ └──────────────────────┘
              │
    ┌─────────▼──────────────────────────────────────────┐
    │  Mobile Web App (PWA - React)                       │
    │  - Kitchen Owner Dashboard                           │
    │  - Order Management                                  │
    │  - Menu Editor                                       │
    │  - Customer Management                               │
    │  - Analytics (Basic)                                 │
    └─────────┬──────────────────────────────────────────┘
              │
    ┌─────────▼──────────────────────────────────────────┐
    │  Super Admin Panel (Web)                            │
    │  - Create/manage kitchen tenants                    │
    │  - Provision Telegram bots                          │
    │  - Monitor system health                            │
    └──────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | Node.js + TypeScript + Express | Real-time capable, huge ecosystem |
| **Database** | PostgreSQL (primary) + Redis (cache) | Reliability + hot data performance |
| **AI Engine** | LangChain + DeepSeek V4 Flash (API) | Cheap ~$0.10/day per kitchen, powerful |
| **Telegram** | Telegraf.js | Mature, well-maintained, multi-bot support |
| **Owner App** | React PWA (mobile-first) | Works on Android, iOS, desktop; installable |
| **Admin Panel** | React (web) | Centralized management |
| **DevOps** | Docker + Docker Compose + VPS | Portable, easy deployment |

---

## Database Schema (Core Tables)

```sql
-- Kitchen (each is a tenant)
kitchens: id, name, owner_name, phone, address,
          lat/lng, delivery_radius_km, telegram_bot_token,
          is_active, created_at

-- Menu Items
menu_items: id, kitchen_id, name, description,
            category (breakfast/lunch/dinner),
            price, is_available, max_daily_qty,
            image_url, batch_time_slots[]

-- Customers (with Telegram identity)
customers: id, telegram_user_id, name, phone,
           default_kitchen_id, preferences (JSON)

-- Orders
orders: id, kitchen_id, customer_id, order_type (one_time/subscription),
        menu_item_id, quantity, total_amount,
        status (pending/confirmed/preparing/ready/delivered/cancelled),
        batch_time_slot, delivery_address,
        payment_status (pending/paid/unpaid/disputed),
        payment_screenshot_url, payment_verified_at,
        notes, created_at, ready_by_time, delivered_at

-- Subscriptions (post-MVP)
subscriptions: id, customer_id, kitchen_id,
               menu_item_ids[], days_of_week[],
               start_date, end_date,
               status (active/paused/cancelled),
               daily_quantity

-- Ratings & Feedback
ratings: id, order_id, customer_id, kitchen_id,
         score (1-5), complaint_category,
         complaint_text, created_at

-- AI Context Memory
customer_context: id, customer_id, kitchen_id,
                  conversation_history (JSON),
                  preferences (JSON),
                  last_interaction_at

-- Daily Inventory Caps
daily_inventory: id, kitchen_id, date,
                 menu_item_id, max_qty,
                 booked_qty, remaining_qty
```

---

## AI Engine Design (LangChain + DeepSeek V4 Flash)

### Knowledge Base Sources
- Menu (items, prices, availability)
- Time Rules (batch windows, prep times)
- Kitchen Info (address, delivery range, timings)
- Customer Memory (past orders, preferences)
- Business Policy (min order, cut-off times, etc.)

### Intent Types (AI handles these automatically)
| Intent | Example |
|---|---|
| `menu_query` | "What's available for lunch?" |
| `order_placement` | "I want 2 dal makhani" |
| `order_status` | "Where is my order?" |
| `timing_query` | "When is lunch available?" |
| `availability` | "Is biryani still available?" |
| `pricing` | "How much for thali?" |
| `general` | "Are you open on Sundays?" |
| `complaint` | "The food was cold yesterday" |
| `modify_order` | "Can I change to roti instead?" |

**Fallback:** If AI confidence < 80%, alert the owner via the dashboard.

---

## Critical Technical Concerns & Solutions

### 1. Concurrency & The "Overselling" Problem

**Problem:** Home chefs deal in strict batch limits (e.g., exactly 15 portions of Biryani). If two users confirm an order via the AI at the exact same millisecond, a standard `SELECT` then `UPDATE` will result in a race condition, and the chef has to cancel on a customer.

**Solution: Dual-Layer Inventory Locking**

```
┌─ Order Placement Request ─────────────────────────────┐
│                                                        │
│  1. AI validates intent + checks menu availability     │
│                                                        │
│  2. REDIS ATOMIC LOCK (first line of defense)          │
│     ├─ DECR(key: "inv:kitchen123:biryani:2026-07-27") │
│     ├─ If result >= 0 → slot reserved, proceed         │
│     └─ If result < 0 → "Sorry, sold out!"             │
│                                                        │
│  3. POSTGRES ROW-LEVEL LOCK (backstop)                 │
│     ├─ BEGIN TRANSACTION                               │
│     ├─ SELECT ... FROM daily_inventory                 │
│     │  WHERE menu_item_id = X AND date = Y             │
│     │  FOR UPDATE                                      │
│     ├─ Verify booked_qty < max_qty                     │
│     ├─ INSERT order + UPDATE booked_qty                │
│     └─ COMMIT / ROLLBACK                               │
│                                                        │
│  4. If COMMIT fails (e.g., PG rejects):                │
│     └─ INCR(key) to release Redis slot                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Redis DECR is atomic** — no race condition possible at the millisecond level
- **Postgres `SELECT ... FOR UPDATE`** — second safety net in case Redis crashes between DECR and order creation
- **Rollback mechanism** — if Postgres rejects the order (constraint violation, etc.), the Redis slot is released via `INCR`
- **Daily inventory reconciliation** — a cron job at the end of each day compares Redis counters vs Postgres records and resolves discrepancies

### 2. AI Latency & UX

**Problem:** LLM APIs (DeepSeek V4 Flash) have latency spikes of 2-6 seconds. If the bot takes too long to reply to "What's for lunch?", the user will spam the chat, potentially duplicating orders or messing up the conversation state.

**Solution: Dual-Path Execution with Immediate Feedback**

```
┌─ Webhook Received ───────────────────────────────────────────┐
│                                                               │
│  1. IMMEDIATE ACTION (sub-100ms)                              │
│     └─ Telegram sendChatAction("typing")                      │
│        → User sees "Bot is typing..." instantly               │
│                                                               │
│  2. FAST PATH DETECTION                                       │
│     └─ Simple regex/rule-based pre-classifier                 │
│        Checks: starts with number? contains "menu"?           │
│        known patterns?                                        │
│        ├─ If FAST PATH matched (e.g., "menu" / "1 biryani"): │
│        │  → Retrieve data from Redis cache (sub-50ms)        │
│        │  → Send response immediately in <500ms               │
│        └─ If NOT fast path:                                   │
│           → Fall through to SLOW PATH                         │
│                                                               │
│  3. SLOW PATH (LLM execution)                                 │
│     └─ Send another sendChatAction to keep "typing" alive     │
│     └─ LangChain pipeline executes:                           │
│        ├─ Step 1: Intent classification (call LLM)            │
│        ├─ Step 2: Knowledge base retrieval (DB query)         │
│        ├─ Step 3: Response generation (call LLM)              │
│        └─ Step 4: Send final response to Telegram             │
│                                                               │
│  4. DUPLICATE MESSAGE HANDLING                                │
│     └─ Deduplication key: (telegram_user_id + message_hash)   │
│        stored in Redis with 5-second TTL                      │
│        → If same user sends same message within 5s, ignore it │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Additional UX Safeguards:**
- **Inline keyboard lockout** — Once an order button is tapped, the callback data includes a nonce that expires immediately after first use
- **State machine per user** — Each user has a `conversation_state` in Redis. If they spam, the system processes only the latest message and drops all previous ones
- **Idempotency on order placement** — `(telegram_user_id, menu_item_id, date, batch_slot)` has a unique constraint in Postgres, so duplicate orders for the same item in the same batch are impossible

### 3. State Management Failure Modes

**Problem:** LangChain's default `ConversationBufferMemory` stores conversation history in-memory (a JavaScript array). If the Node.js process restarts (VPS reboot, deployment, crash), **all in-flight conversations are lost**. The customer who was mid-way through ordering "2 biryani and 1 dal makhani" suddenly has to start over from scratch, leading to frustration and drop-offs.

**Solution: Three-Layer Memory Architecture with Redis Persistence**

```
┌──────────────────────────────────────────────────────────┐
│                  AI MEMORY ARCHITECTURE                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  LAYER 1: EPHEMERAL (LangChain in-memory)               │
│  ───────────────────────────────────────                 │
│  - Current LLM context window (last ~10 messages)        │
│  - Lost on restart → OK, because Layer 2 restores it     │
│  - Purpose: Token efficiency (avoids re-sending history) │
│                                                          │
│  LAYER 2: SHORT-TERM (Redis, TTL = 2 hours)             │
│  ───────────────────────────────────────                 │
│  KEY NAMESPACE: session:{kitchen_id}:{user_id}           │
│                                                          │
│  ├─ conversation_history: JSON array of last 50 msgs    │
│  │  ↳ On restart → reload into LangChain memory          │
│  │                                                        │
│  ├─ user_state: {                                        │
│  │     flow: "ordering" | "checking_status" | "idle",   │
│  │     step: "awaiting_item" | "awaiting_qty" | ...,    │
│  │     pending_order: { menu_item_id, qty }              │
│  │   }                                                   │
│  │                                                        │
│  ├─ pending_actions: [                                   │
│  │     { type: "payment_reminder", trigger_at: ... },    │
│  │     { type: "rating_request", trigger_at: ... }       │
│  │   ]                                                   │
│  │                                                        │
│  └─ TTL: 7200 seconds (2 hours)                          │
│     ↳ Reset on each user interaction                     │
│     ↳ Sufficient for any ordering flow                   │
│                                                          │
│  LAYER 3: LONG-TERM (PostgreSQL)                         │
│  ───────────────────────────────────────                 │
│  - customer_context table:                               │
│    preferences (JSON), favorite_items[],                 │
│    dietary_restrictions, past_complaints,                │
│    payment_reliability_score                             │
│  - Order history (orders table)                          │
│  - Ratings & feedback (ratings table)                    │
│  ↳ Survives everything — used for AI personalization     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Recovery Flow on Restart:**

```
VPS Reboot / Node.js Crash
        ↓
Bot receives next message from user
        ↓
1. Check Redis for session:{kitchen}:{user}
        ├─ EXISTS → Load conversation_history + user_state
        │            → Rehydrate LangChain memory
        │            → Resume exactly where user left off
        └─ NOT EXISTS (TTL expired or first message)
             → Start fresh conversation
             → Load long-term context from PostgreSQL
             → "Sorry for the delay! How can I help you?"
        ↓
2. If user was in the middle of placing an order:
        → Bot: "I see you were ordering earlier. 
                Would you like to continue? [Yes] [No]"
        → On "Yes": Resume from last confirmed step
        → On "No": Reset state, start new order
```

**Data Safety Guarantees:**
- **Redis AOF (Append-Only File) persistence enabled** — if Redis itself restarts, the session data survives
- **Redis maxmemory-policy: noeviction** — session keys are never evicted for space; only TTL expires them
- **PostgreSQL as system of record** — all confirmed orders, payments, and ratings are in Postgres. Redis is only for in-flight conversation state, so losing it is inconvenient but never loses confirmed data
- **Graceful degradation** — if Redis is down, LangChain falls back to in-memory only (ephemeral), and the system logs a critical alert
---

## Telegram Bot Conversation Flow (End-to-End)

```
Customer sends "Hi" to bot
        ↓
Bot: "Welcome to [Kitchen Name]! 🌸
     Choose an option:
     1️⃣ Today's Menu
     2️⃣ Place Order
     3️⃣ Check Status
     4️⃣ Talk to us
     Or just ask anything!"
        ↓
Customer: "What's for lunch today?"
        ↓
AI Engine understands intent → retrieves data → responds naturally
        ↓
Bot: "Today's Lunch Menu 🍛:
     1. Dal Makhani + Roti (₹120)
     2. Chicken Biryani (₹180)
     3. Veg Thali (₹150)
     Available from 12:30 PM - 2:00 PM
     Order by 11:30 AM for on-time delivery!"
        ↓
Customer: "Order 1 veg thali"
        ↓
AI Engine creates order → checks inventory → confirms
        ↓
Bot: "✅ Order confirmed!
     🍛 1x Veg Thali - ₹150
     ⏰ Ready by 1:10 PM
     📍 Delivery within [area]
     You'll be notified when it's ready!"
        ↓
[Owner marks order as "Preparing" in PWA]
        ↓
Bot sends: "👩‍🍳 Your Veg Thali is being prepared!"
        ↓
[Owner marks as "Ready" in PWA]
        ↓
Bot sends: "✅ Your order is ready for delivery! 🚗"
        ↓
[Owner marks as "Delivered" in PWA]
        ↓
Bot sends: "🎉 Enjoy your meal! Thank you for ordering!"
```

---

## Payment Confirmation Flow

Payments are handled P2P (UPI/Cash outside the platform), but the system tracks payment status.

### Flow
```
Order delivered → 30 min later → Bot sends:
"💵 Payment Reminder: ₹150 for Veg Thali
 Did you pay? [✅ I have paid] [❌ Not yet]

 (Optional: Upload UPI screenshot)"

Customer taps "✅ I have paid":
→ Bot: "Please upload a screenshot of the payment (optional).
        [📎 Upload Screenshot] or [⏭ Skip]"

After upload or skip:
→ Bot: "✅ Payment confirmation sent to the kitchen! Thank you!"

→ Owner PWA gets alert: "💰 Payment claimed by Priya - Order #42
    [Verify] [Dispute]"

Owner taps "Verify":
→ Payment marked as paid in system
→ Bot sends to customer: "✅ Payment verified by [Kitchen Name]. Thank you! 🙏"

If customer doesn't respond within 30 mins:
→ Bot sends reminder: "⏰ Friendly reminder: Payment of ₹150 is pending."

If customer marks "Not yet":
→ Bot: "No problem! Please pay via UPI to [UPI ID] or cash on next delivery.
     You can tap 'I have paid' anytime."
```

---

## Discovery & Growth Engine

Telegram is powerful for retention but poor for discovery. The system includes built-in growth tools.

### Shareable Assets (Auto-Generated in Owner PWA)

| Asset | Purpose | Where to Share |
|---|---|---|
| **QR Code** | Direct deep link to bot (`t.me/KitchenBot?start=kitchen123`) | Sticky on delivery boxes, printouts in apartment lobbies |
| **Deep Link** | `t.me/KitchenBot?start=promo` with referral tracking | WhatsApp groups, Instagram stories |
| **Share Card** | Branded image with menu highlights + bot link | Social media, local Facebook groups |

### In-Owner PWA (Menu → Share)

```
Menu Screen → Share Icon → [Download QR Code] [Copy Bot Link] [Share as Image]
```

### Super Admin Panel
- Track which kitchens are using QR codes
- Generate printable marketing sheets (QR + menu + timing)
- View bot join sources (deep link parameter analytics)

---

## Trust Loop & Feedback System

A post-delivery feedback mechanism that builds quality data and improves AI context.

### Flow

```
2 hours after "Delivered" status:

Bot sends: "🌟 How was your meal from [Kitchen Name] today?
           ⭐⭐⭐⭐⭐ (Tap to rate)"

Customer rates 4-5⭐:
→ Bot: "Wonderful! Glad you enjoyed it! 😊 We'd love to have you again!"
→ AI memory: records positive sentiment, reinforces item recommendation

Customer rates 1-3⭐:
→ Bot: "Sorry to hear that! 🙏 Could you tell us what went wrong?
        [👎 Too salty] [🕐 Late delivery] [🍛 Less quantity] [💬 Other]"
→ Owner PWA alert: "⚠️ Low rating alert! Priya gave 2⭐ for Veg Thali"
→ AI memory: records issue, adjusts future recommendations for that item
```

### Benefits
- **Quality control:** Owners see ratings trend per menu item over time
- **AI improvement:** Low-rated items get deprioritized in AI recommendations
- **Customer retention:** A quick follow-up shows the kitchen cares
- **Early warning:** Detect issues (salt level, timing, portion size) before they escalate

### Data in Owner PWA

```
Analytics Tab → Ratings Section:
  - Average rating today/week/month
  - Rating distribution (pie chart: 1⭐ to 5⭐)
  - Top complaints (grouped: taste, timing, quantity)
  - Per-item rating breakdown
```

---

## PWA Owner Dashboard (Features)

### Home Screen (Today at a Glance)
- Active orders count
- Remaining inventory (percentage bars per item)
- Today's revenue
- Pending actions (new orders, unanswered AI fallbacks, unverified payments)

### Orders Tab
- List view with status filters (All/New/Preparing/Ready/Delivered)
- Each order: customer name, items, prep time remaining
- Payment status badge (paid/unpaid/pending verification)
- Tap to change status (with haptic feedback)
- Sound/vibration alert for new orders

### Menu Management
- Add/Edit/Remove menu items
- Set daily max quantity per item
- Toggle availability (available / sold out)
- Set batch timings (Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7-9 PM)
- **Share** button → [Download QR Code] [Copy Bot Link] [Share as Image]

### Customers Tab
- List of all customers
- Order history per customer
- Payment reliability score (auto-calculated)
- Personal notes field ("Lives in A-block, prefers less oil")

### AI Knowledge Base Settings
- Edit FAQ answers
- Set business rules (cut-off times, delivery radius)
- View AI confidence scores per conversation

### Analytics
- Orders per day/week/month
- Popular items ranking
- Revenue trends (line chart)
- Customer retention metrics
- **Ratings & Feedback summary**
  - Average rating (daily/weekly/monthly)
  - Rating distribution chart
  - Top complaint categories

---

## Super Admin Panel (Web)

- Create a new kitchen tenant
- Generate and assign Telegram bot tokens
- Configure kitchen details (name, address, delivery radius, UPI ID)
- View all kitchens and their status
- Generate printable marketing materials (QR + menu card)
- System-wide monitoring

---

## Project Structure

```
homechef/
├── backend/
│   ├── src/
│   │   ├── api/                 # REST endpoints for PWA
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   └── middleware/
│   │   ├── telegram/            # Bot handlers (per kitchen)
│   │   │   ├── botManager.ts    # Multi-tenancy bot lifecycle
│   │   │   ├── handlers/       # Message, callback, command handlers
│   │   │   └── keyboards.ts    # Inline/Reply keyboard builders
│   │   ├── ai/                  # LangChain integration
│   │   │   ├── engine.ts       # Core AI orchestration
│   │   │   ├── intents.ts      # Intent classification
│   │   │   ├── knowledge.ts    # Knowledge base retrieval
│   │   │   └── memory.ts       # Customer context memory
│   │   ├── services/            # Business logic layer
│   │   │   ├── orderService.ts
│   │   │   ├── menuService.ts
│   │   │   ├── inventoryService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── ratingService.ts
│   │   │   └── customerService.ts
│   │   ├── models/              # Database models (Prisma or knex)
│   │   ├── config/              # Configs per kitchen
│   │   └── index.ts             # Entry point
│   ├── migrations/              # Database migrations
│   ├── Dockerfile
│   └── package.json
├── webapp/                      # React PWA (Owner Dashboard)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── Menu.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── AiSettings.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── PaymentVerifyCard.tsx
│   │   │   ├── RatingChart.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ShareSheet.tsx    # QR code + link generator
│   │   ├── hooks/
│   │   ├── services/            # API client
│   │   ├── store/               # State management (zustand)
│   │   └── App.tsx
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   └── sw.js                # Service worker
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── admin/                       # Super Admin Panel (web)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Kitchens.tsx
│   │   │   ├── CreateKitchen.tsx
│   │   │   └── SystemHealth.tsx
│   │   └── ...
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml           # Backend + DB + Redis
└── README.md
```

---

## Development Roadmap (MVP: 4-6 Weeks)

### Week 1-2: Foundation
- [ ] Backend setup (Node.js + TypeScript + Express)
- [ ] PostgreSQL schema + migrations (including payments & ratings tables)
- [ ] Authentication (Telegram OTP for owners, JWT for admin)
- [ ] Telegram bot skeleton with multi-tenant support
- [ ] Docker setup + deploy to VPS

### Week 2-3: Core Ordering Flow + Payments
- [ ] Menu management CRUD API
- [ ] Order creation & management API
- [ ] Telegram: Menu display & order placement
- [ ] Telegram: Order status notifications
- [ ] Inventory tracking with auto cut-off
- [ ] Payment confirmation flow (I have paid button + owner verify)

### Week 3-4: AI Engine
- [ ] LangChain + DeepSeek V4 Flash integration
- [ ] Intent classification pipeline
- [ ] Knowledge base construction
- [ ] Customer context memory
- [ ] Fallback mechanism when AI is uncertain

### Week 4-5: Owner PWA Dashboard
- [ ] React PWA setup (mobile-first design)
- [ ] Home dashboard (orders, revenue, inventory)
- [ ] Order management with status flow & payment verification
- [ ] Menu editor interface with Share/QR code feature
- [ ] Customer list with history

### Week 5-6: Growth Tools + Feedback + Polish
- [ ] QR code & deep link generator (shareable marketing assets)
- [ ] Post-delivery rating & feedback system (Trust Loop)
- [ ] Ratings analytics in Owner PWA
- [ ] Super Admin Panel (kitchen creation, bot provisioning, marketing sheets)
- [ ] Error handling & edge cases
- [ ] Testing with a real pilot kitchen
- [ ] Performance optimization

---

## Estimated Monthly Costs (per kitchen)

| Item | Cost |
|---|---|
| VPS (2GB RAM, 2 vCPU) | ~$10-12/mo |
| DeepSeek V4 API (~500 queries/day) | ~$3-5/mo |
| PostgreSQL + Redis | Included in VPS |
| Domain (optional) | ~$10/yr |
| **Total per kitchen** | **~$15-20/mo** |

Multiple kitchens can share the same VPS. 10 kitchens ≈ same $10-12 VPS cost.

---

## Business Model Context

### Operations
- **Model:** One-to-many (one kitchen serves many nearby customers)
- **Menu:** Mostly fixed daily menu with ad-hoc changes
- **Order types:** Both per-order and subscription (post-MVP)
- **Batch production:** Meals produced in time-window batches (breakfast, lunch, dinner) with accommodation for special requests
- **Delivery:** Owner handles delivery within ~5km radius
- **Payments:** Tracked as paid/unpaid (P2P payments outside platform, verified by owner via "I have paid" button)

### Customer Context
- System remembers past orders and preferences
- AI personalizes responses based on customer history
- Auto cut-off when daily max orders reached
- Post-delivery ratings feed into AI quality data

### Discovery & Retention Strategy
- **Discovery:** QR codes on delivery boxes, deep links in WhatsApp groups, shareable menu cards
- **Retention:** Telegram bot (daily menu push, reminders), personalized AI interactions, feedback follow-ups
- **Trust:** Payment verification loop, post-delivery ratings, consistent quality tracking

---

## Future Considerations (Post-MVP)

- Subscription management (weekly/monthly tiffin)
- Delivery tracking with ETA
- Advanced analytics with forecasting
- Multi-language support (Hindi, Kannada, Tamil, Bengali)
- Payment gateway integration (UPI auto-collect)
- WhatsApp Business API integration (for users who prefer WhatsApp over Telegram)
- Multi-kitchen chain management
- Customer mobile app (optional)