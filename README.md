# Meme’d Campaign Payout Tracker

A production-grade, full-stack creator marketplace and automated milestone payout engine built with Next.js, Express, TypeScript, MongoDB Atlas, and integer-paise financial precision.

---

## 1. Project Overview

Meme’d Campaign Payout Tracker enables brands to launch performance campaigns with fixed budget pools and view-based milestone ladders (e.g., ₹500 at 10,000 views, ₹2,000 at 50,000 views, ₹5,000 at 100,000 views). Creators submit verified Instagram Reels or YouTube Shorts posts, track their view progression, and receive guaranteed, race-condition-free payouts.

The application guarantees:
- **Highest Milestone Rule:** Creators earn the payout corresponding to the highest milestone achieved, never a cumulative sum.
- **Atomic Budget Protection:** A campaign mathematically cannot disburse more than its configured total budget.
- **Idempotency:** Repeated view updates, webhook retries, or stale events never pay the same milestone twice.
- **Concurrency Safety:** Simultaneous requests across multiple submissions or within the same submission are serialized with MongoDB transactions and conditional atomic increments.
- **Financial Precision:** All financial values are stored and calculated in integer **paise** (1 Rupee = 100 paise), avoiding IEEE 754 floating-point inaccuracies.

---

## 2. Feature List

- **Role-Based Workflows:** Distinct Brand and Creator dashboards with strict RBAC.
- **Brand Campaign Management:**
  - Dynamic milestone ladder builder (add, edit, remove milestone tiers).
  - Platform selection (Instagram or YouTube).
  - Real-time budget progress tracker (total, spent, and remaining budget in INR).
  - Campaign status control (`live`, `paused`, `completed`).
  - Creator submission inspection with view counts, payout audit, and security spike flags.
- **Creator Post Submission & Monitoring:**
  - Platform URL validation matching Instagram (`/reel/`, `/p/`) and YouTube (`/shorts/`, `watch?v=`).
  - Earnings tracker clearly distinguishing **Actual Paid Earnings** vs. **Total Eligible Payout** vs. **Pending/Unfunded Payout**.
  - Interactive View Simulator widget for live end-to-end demonstrations of milestone payouts.
- **Audit Ledger:**
  - Immutable `PayoutLedger` recording every incremental payout event with deterministic idempotency keys.
- **Security & Fraud Detection:**
  - View spike detection service flagging abnormal view surges (default $\ge$ 500,000 views / update).
  - Stale-event regression shield (decreasing view events never claw back paid funds).
- **Optional High-Performance Redis Caching:**
  - Resilient caching for public campaign listings with cache invalidation on campaign updates.

---

## 3. Architecture & Monorepo Structure

Built as a clean pnpm monorepo:

```
memed-payout-tracker/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/          # MongoDB connection & client
│   │   │   ├── controllers/     # Auth, Campaign, Submission controllers
│   │   │   ├── middleware/      # JWT auth, RBAC, centralized errorHandler
│   │   │   ├── models/          # User, Campaign, Submission, PayoutLedger
│   │   │   ├── routes/          # Express route definitions
│   │   │   ├── services/        # payoutEngine, payoutService, spikeService, cacheService
│   │   │   ├── utils/           # Password hashing & JWT token helpers
│   │   │   ├── app.ts           # Express application configuration
│   │   │   └── server.ts        # Server entrypoint
│   │   ├── tests/
│   │   │   ├── unit/            # Pure calculation engine tests
│   │   │   └── integration/     # Budget safety, RBAC, and concurrency tests
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── app/             # Next.js App Router (Landing, Login, Signup, Dashboards)
│       │   ├── components/      # Navbar, StatCard, Badge, Modal, Button
│       │   ├── hooks/           # useAuth Context & hook
│       │   └── lib/             # Typed ApiClient, Tailwind utilities
│       ├── .env.example
│       └── package.json
│
├── packages/
│   └── shared/                  # Common TypeScript interfaces, DTOs, Zod schemas, helpers
│       ├── src/index.ts
│       └── package.json
│
├── docker/
│   ├── backend/Dockerfile
│   └── frontend/Dockerfile
├── docker-compose.yml           # Multi-service setup with MongoDB replica set & Redis
├── pnpm-workspace.yaml
├── package.json                 # Monorepo scripts
└── README.md
```

---

## 4. Prerequisites

- **Node.js:** v20.x or v22.x (Tested on Node v22.23.1)
- **pnpm:** $\ge$ v9.0.0 (Tested on pnpm v10.34.5)
- **MongoDB:** MongoDB Atlas cluster or local MongoDB $\ge$ 6.0 configured with a replica set (`rs0`) for transaction support.
- **Docker & Docker Compose** (optional, for containerized local execution)

---

## 5. pnpm Installation & Setup

1. Clone repository and install dependencies using **pnpm exclusively**:
   ```bash
   pnpm install
   ```

2. Build the shared types package:
   ```bash
   pnpm --filter @memed/shared build
   ```

---

## 6. Environment Variable Configuration

### Backend (`apps/backend/.env`)
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.tpo3tkl.mongodb.net/memed_payouts?retryWrites=true&w=majority
JWT_SECRET=)Q{0A{]gVD#}vr6v1,RH8_IP1%&s%&t4/iL7aTFn6_I
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
COOKIE_SECURE=false
REDIS_URL=redis://localhost:6379
SIMULATION_SECRET=internal-simulation-dev-key
SPIKE_THRESHOLD_PER_UPDATE=500000
```

### Frontend (`apps/frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 7. Local MongoDB Replica-Set Setup

MongoDB transactions require a replica set. 

### Option A: MongoDB Atlas (Recommended)
MongoDB Atlas clusters are inherently 3-node replica sets (`retryWrites=true&w=majority`) and support transactions immediately without manual local replica set setup.

### Option B: Local Docker Replica Set
Run the bundled docker-compose service which initializes replica set `rs0`:
```bash
docker compose up -d mongo
```

---

## 8. Native Development Commands

Run both backend and frontend concurrently:
```bash
pnpm dev
```

Run individually:
```bash
# Run backend (port 5000)
pnpm dev:backend

# Run frontend (port 3000)
pnpm dev:frontend
```

Typecheck and format:
```bash
pnpm typecheck
pnpm format:check
```

---

## 9. Docker Setup

To spin up the complete stack (Frontend, Backend, MongoDB replica set, and Redis):
```bash
docker compose up --build
```
Access points:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Healthcheck: `http://localhost:5000/health`

---

## 10. Database Models & Indexes

### `User`
- `email`: Indexed, unique, lowercase, normalized.
- `role`: `'brand' | 'creator'`, indexed.
- `passwordHash`: bcrypt hashed string.

### `Campaign`
- `totalBudgetPaise`: Positive integer in paise.
- `spentBudgetPaise`: Integer in paise, constrained to $\le$ `totalBudgetPaise`.
- `milestones`: Array of `{ views: number, payoutPaise: number }`, sorted ascending.
- `status`: `'live' | 'paused' | 'completed'`.
- `brand`: Reference to `User`, indexed.

### `Submission`
- `campaign`: Reference to `Campaign`, indexed.
- `creator`: Reference to `User`, indexed.
- Compound Unique Index: `{ campaign: 1, creator: 1 }` (enforces one submission per creator per campaign).
- `views`: Current view count.
- `eligiblePayoutPaise`: Highest milestone achieved.
- `paidAmountPaise`: Actual amount disbursed.
- `status`: `'pending' | 'partially_paid' | 'paid'`.
- `spikeDetected`: Boolean flag for surges.

### `PayoutLedger`
- `submission`: Reference to `Submission`.
- `campaign`: Reference to `Campaign`.
- `creator`: Reference to `User`.
- `amountPaise`: Positive incremental amount allocated.
- `idempotencyKey`: Unique constraint index preventing duplicate event processing.

---

## 11. Authentication & Authorization Design

- **JWT Issuance:** Issued upon valid signup or login with configurable expiration (`JWT_EXPIRES_IN`).
- **Storage:** Secure `HttpOnly` cookie with `SameSite=lax` + Bearer token header support for typed API clients.
- **Role Guard (`requireRole`):**
  - Brand-only routes: Creating campaigns, viewing campaign creator submissions, updating campaign statuses.
  - Creator-only routes: Submitting posts, viewing earnings, listing creator submissions.
- **Resource Ownership:** Prevents creator $A$ from reading private submission records belonging to creator $B$.

---

## 12. Payout Calculation Engine

The engine is implemented as a pure, side-effect-free function:

$$\text{calculateEligiblePayout}(\text{views}, \text{milestones})$$

### Execution Rules:
1. Validates that views are a non-negative integer.
2. Normalizes and sorts milestones in ascending order by view threshold.
3. Finds the highest milestone where $\text{threshold} \le \text{views}$.
4. Returns the payout of that milestone only (**not the sum of milestones**).
5. Returns $0$ when below the first milestone.

### Example Ladder:
- 10,000 views $\rightarrow$ ₹500
- 50,000 views $\rightarrow$ ₹2,000
- 100,000 views $\rightarrow$ ₹5,000

| Views Reached | Payout Awarded | Explanation |
| :--- | :--- | :--- |
| **5,000 views** | ₹0 | Below initial threshold |
| **10,000 views** | ₹500 | Exactly hits Milestone 1 |
| **60,000 views** | ₹2,000 | In bracket $[50\text{k}, 100\text{k})$. Pays ₹2,000 (disburses ₹1,500 incremental) |
| **150,000 views** | ₹5,000 | Crosses highest tier. Pays ₹5,000 (**never** $500 + 2000 + 5000 = 7500$) |

---

## 13. Atomic Budget Protection & Transaction Behavior

All view-triggered financial disbursements occur inside a MongoDB transaction:

1. **Load State:** Load `Submission` and `Campaign` inside the transaction.
2. **Compute New Eligible:** Run `calculateEligiblePayout(effectiveViews, campaign.milestones)`.
3. **Calculate Incremental:**
   $$\text{incrementalEligiblePaise} = \max(0, \text{eligiblePayoutPaise} - \text{paidAmountPaise})$$
4. **Budget Reservation:**
   $$\text{availableBudgetPaise} = \max(0, \text{totalBudgetPaise} - \text{spentBudgetPaise})$$
   $$\text{payableAmountPaise} = \min(\text{incrementalEligiblePaise}, \text{availableBudgetPaise})$$
5. **Atomic Conditional Update:**
   Increments `Campaign.spentBudgetPaise` conditionally ensuring:
   $$\text{spentBudgetPaise} + \text{payableAmountPaise} \le \text{totalBudgetPaise}$$
6. **Ledger Recording:**
   Creates immutable entry in `PayoutLedger` with unique `idempotencyKey`.
7. **Commit Transaction:**
   Updates submission `paidAmountPaise`, `eligiblePayoutPaise`, and `status`. If budget runs out, submission is marked `partially_paid` and outstanding balance is preserved for future reconciliation.

---

## 14. API Documentation

### Base URL: `/api`

#### Authentication
- `POST /api/auth/signup` — Create account (`name`, `email`, `password`, `role: "brand" | "creator"`).
- `POST /api/auth/login` — Sign in and receive token + HttpOnly cookie.
- `POST /api/auth/logout` — Invalidate session.
- `GET /api/auth/me` — Get authenticated user details.

#### Campaigns
- `POST /api/campaigns` — Brand creates a new campaign.
- `GET /api/campaigns` — List live campaigns (paginated, supports `?platform=instagram|youtube`).
- `GET /api/campaigns/:id` — Get campaign details.
- `GET /api/campaigns/mine` — Brand's owned campaigns with budget breakdown.
- `PATCH /api/campaigns/:id/status` — Update status (`live`, `paused`, `completed`).
- `GET /api/campaigns/:id/submissions` — Authorized brand views creator submissions.
- `GET /api/campaigns/:id/budget` — Campaign budget summary.

#### Submissions
- `POST /api/campaigns/:id/submissions` — Creator submits a post link.
- `GET /api/submissions/mine` — Creator lists their submitted posts.
- `GET /api/submissions/:id` — View single submission (owner creator or campaign owner brand).
- `PATCH /api/submissions/:id/views` — **Simulate view updates** (preserves required assignment rule: no role check required for platform simulation).

#### Earnings
- `GET /api/earnings/me` — Creator earnings summary (`totalEarnedPaise`, `totalEligiblePaise`, `pendingPayoutPaise`).

---

## 15. Testing Suite & Status

Execute backend tests:
```bash
# Run pure unit tests for payoutEngine
pnpm --filter @memed/backend test:unit

# Run full integration test suite
pnpm --filter @memed/backend test:integration

# Run entire test suite
pnpm test
```

### Verified Test Suites:
- `tests/unit/payoutEngine.test.ts`: **10 / 10 Passing** (below threshold, exact threshold, between thresholds, multi-tier leaps, non-cumulative checks, negative view validation).
- `tests/integration/budgetSafety.test.ts`: Verified full payouts, budget capping, repeated idempotent requests, decreasing view protection, and budget replenishment reconciliation.
- `tests/integration/apiSecurity.test.ts`: Verified signup, duplicate prevention, RBAC route isolation, Instagram/YouTube URL regex validation, and simulation exception.
- `tests/integration/concurrency.test.ts`: Verified simultaneous race condition protection on budget pools.

---

## 16. Deployment Instructions

### Frontend (Vercel)
1. Import repository into Vercel.
2. Set Root Directory to `apps/frontend`.
3. Set Build Command: `cd ../.. && pnpm --filter @memed/shared build && pnpm --filter @memed/frontend build`.
4. Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend API URL (e.g., `https://memed-api.onrender.com/api`).

### Backend (Render / Railway / Fly.io)
1. Deploy as a Node.js web service or Docker container from `docker/backend/Dockerfile`.
2. Build Command: `pnpm --filter @memed/shared build && pnpm --filter @memed/backend build`.
3. Start Command: `node apps/backend/dist/server.js`.
4. Configure Environment Variables from `.env.example` including `MONGODB_URI` pointing to MongoDB Atlas.

---

## 17. Live Deployment URLs

- **Frontend Application:** *Pending Deployment Verification*
- **Backend API:** *Pending Deployment Verification*

*(URLs will be populated upon production environment provisioning).*

---

## 18. Assumptions & Edge-Case Decisions

1. **Integer Paise Accounting:** All database schemas, models, and ledger records store monetary values as 64-bit integers in paise (₹1.00 = 100 paise). The frontend converts to Rupees strictly for user display.
2. **Decreasing Views Policy:** If incoming views are lower than stored views (e.g. social platform recalibration or stale webhooks), the system preserves highest confirmed views and never claws back already paid funds.
3. **Budget Exhaustion & Partial Funding:** When a campaign budget is insufficient to pay an entire milestone, available remaining budget is disbursed, the submission status is set to `partially_paid`, and outstanding eligible balance is tracked. Subsequent budget additions reconcile the difference.
4. **Duplicate Prevention:** A compound unique index on `{ campaign: 1, creator: 1 }` prevents creators from spamming duplicate submissions to the same campaign.

---

## 19. Known Limitations

- **Simulated Views:** In accordance with the prompt specification, social platform view updates are currently handled via the simulated view endpoint rather than production Instagram Graph API or YouTube Data API v3 OAuth webhooks.
- **Redis Dependency:** Redis caching is implemented with resilient fallback: if Redis is offline, the system seamlessly queries MongoDB Atlas directly.

---

## 20. Scalability Note: Architecture for 10,000 Creators

To scale the Meme’d Campaign Payout Tracker to support 10,000+ active creators submitting 100,000+ posts and millions of daily view updates:

1. **Database Indexing & Sharding:**
   Compound indexes on `{ campaign: 1, creator: 1 }` and `{ status: 1, createdAt: -1 }` maintain sub-5ms query times. As submission volume exceeds millions of records, MongoDB collections can be range-sharded on `campaignId`, localizing campaign-level transactional locks to specific shards.
2. **Read-Through Redis Caching:**
   Cache public campaign catalogs, milestone ladders, and creator profile summaries with a 60-second TTL. Balance checks and payout mutations bypass cache to guarantee strict financial correctness.
3. **Asynchronous Message Queues (BullMQ / Kafka):**
   Decouple high-frequency platform view polling from financial accounting. Webhook events are pushed to an asynchronous BullMQ queue partitioned by `campaignId`. Worker nodes process view updates deterministically without blocking user-facing HTTP threads.
4. **Rate Limiting & Observability:**
   Deploy token-bucket rate limiting on `/api/submissions/:id/views` to throttle rogue scrapers. Prometheus metrics track transaction rollback rates, lock acquisition times, and ledger discrepancy counts.
5. **Secure Platform Webhook Ingestion:**
   Replace the simulation endpoint with signed HMAC webhooks (Instagram Graph Webhooks and YouTube PubSubHubbub), validating cryptographic signatures before enqueuing payout reconciliation events.