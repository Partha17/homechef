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
        payment_status, notes, created_at,
        ready_by_time, delivered_at

-- Subscriptions (post-MVP)
subscriptions: id, customer_id, kitchen_id,
               menu_item_ids[], days_of_week[],
               start_date, end_date,
               status (active/paused/cancelled),
               daily_quantity

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

## Telegram Bot Conversation Flow

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

## PWA Owner Dashboard (Features)

### Home Screen (Today at a Glance)
- Active orders count
- Remaining inventory (percentage bars per item)
- Today's revenue
- Pending actions (new orders, unanswered AI fallbacks)

### Orders Tab
- List view with status filters (All/New/Preparing/Ready/Delivered)
- Each order: customer name, items, prep time remaining
- Tap to change status (with haptic feedback)
- Sound/vibration alert for new orders

### Menu Management
- Add/Edit/Remove menu items
- Set daily max quantity per item
- Toggle availability (available / sold out)
- Set batch timings (Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7-9 PM)

### Customers Tab
- List of all customers
- Order history per customer
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

---

## Super Admin Panel (Web)

- Create a new kitchen tenant
- Generate and assign Telegram bot tokens
- Configure kitchen details (name, address, delivery radius)
- View all kitchens and their status
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
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ...
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
- [ ] PostgreSQL schema + migrations
- [ ] Authentication (Telegram OTP for owners, JWT for admin)
- [ ] Telegram bot skeleton with multi-tenant support
- [ ] Docker setup + deploy to VPS

### Week 2-3: Core Ordering Flow
- [ ] Menu management CRUD API
- [ ] Order creation & management API
- [ ] Telegram: Menu display & order placement
- [ ] Telegram: Order status notifications
- [ ] Inventory tracking with auto cut-off

### Week 3-4: AI Engine
- [ ] LangChain + DeepSeek V4 Flash integration
- [ ] Intent classification pipeline
- [ ] Knowledge base construction
- [ ] Customer context memory
- [ ] Fallback mechanism when AI is uncertain

### Week 4-5: Owner PWA Dashboard
- [ ] React PWA setup (mobile-first design)
- [ ] Home dashboard (orders, revenue, inventory)
- [ ] Order management with status flow
- [ ] Menu editor interface
- [ ] Customer list with history

### Week 5-6: Admin Panel & Polish
- [ ] Super Admin Panel (kitchen creation, bot provisioning)
- [ ] Customer preference tracking
- [ ] Basic analytics
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
- **Payments:** Tracked as paid/unpaid (P2P payments outside platform)

### Customer Context
- System remembers past orders and preferences
- AI personalizes responses based on customer history
- Auto cut-off when daily max orders reached

---

## Future Considerations (Post-MVP)

- Subscription management (weekly/monthly tiffin)
- Delivery tracking with ETA
- Advanced analytics with forecasting
- Multi-language support (Hindi, Kannada, Tamil, Bengali)
- Payment gateway integration
- WhatsApp Business API integration (for users who prefer WhatsApp over Telegram)
- Multi-kitchen chain management
- Customer mobile app (optional)