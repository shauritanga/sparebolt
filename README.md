# SpareBolt

**Vehicle spare parts marketplace PWA** — customers buy, sellers list, drivers deliver. Payments are held in **escrow** until the customer confirms receipt.

Mobile-first · English + Swahili · ClickPesa-ready · NestJS + React + PostgreSQL

---

## Architecture

```
sparebolt/
├── apps/
│   ├── web/          # React + Vite + TypeScript + Tailwind + PWA
│   └── api/          # NestJS + Prisma + PostgreSQL
├── docker-compose.yml
└── package.json      # npm workspaces
```

### Roles

| Role     | Capabilities |
|----------|--------------|
| **Customer** | Browse without login, guest cart (IndexedDB), checkout requires auth, track orders, confirm receipt, rate seller/driver |
| **Seller**   | List parts, manage inventory, sales & analytics |
| **Driver**   | Nearby jobs, accept/update delivery, earnings |
| **Admin**    | Users, escrow, disputes, platform stats |

### Escrow flow

1. Customer pays (ClickPesa / mock in dev) → funds **HELD**
2. Driver delivers → status **DELIVERED**
3. Customer confirms → funds **RELEASED_TO_SELLER** (minus platform fee)
4. Or dispute → admin refunds customer or releases to seller

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Zustand, localforage, i18next, Leaflet-ready |
| PWA | `vite-plugin-pwa` (installable, offline listing cache) |
| Backend | NestJS 11, Passport JWT, class-validator |
| DB | PostgreSQL 16 + Prisma |
| Payments | ClickPesa (mock auto-complete when keys absent) |
| Maps | Leaflet (frontend-ready) |
| Uploads | Local disk (`apps/api/uploads`) via `POST /api/uploads` (JWT); swap for S3/MinIO later |

---

## Quick start

### Prerequisites

- Node.js 20+
- PostgreSQL (local Homebrew install **or** Docker)

### 1. Database

**Option A — Local PostgreSQL (no Docker)**  
If Homebrew Postgres is already running (e.g. `postgresql@17`):

```bash
# Create app role + database (once)
psql -d postgres -c "CREATE ROLE sparebolt LOGIN PASSWORD 'sparebolt' CREATEDB;"
psql -d postgres -c "CREATE DATABASE sparebolt OWNER sparebolt;"
```

`apps/api/.env` already points at:
`postgresql://sparebolt:sparebolt@localhost:5432/sparebolt`

**Option B — Docker**  
Requires the **Docker daemon** (Docker Desktop or Colima), not only the `docker` CLI:

```bash
# Start the engine first (pick one):
open -a Docker          # if Docker Desktop is installed
# or: colima start

cd sparebolt
docker compose up -d postgres
```

> **Note:** `failed to connect to ... docker.sock` means the CLI is installed but the daemon is not running. This machine often has no Docker Desktop — use Option A instead.

### 2. API

```bash
cd apps/api
cp .env.example .env   # already has local defaults if .env exists
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

API: `http://localhost:3001/api`  
Health: `http://localhost:3001/api/health`

### 3. Web

```bash
cd apps/web
npm install
npm run dev
```

App: `http://localhost:5173`  
Vite proxies `/api` → `http://localhost:3001`.

---

## Demo accounts

Password for all: **`password123`**

| Email | Role |
|-------|------|
| `admin@sparebolt.tz` | Admin |
| `customer@sparebolt.tz` | Customer |
| `seller@sparebolt.tz` | Seller |
| `driver@sparebolt.tz` | Driver |

Seed also creates categories, vehicle makes/models, and sample listings in Dar es Salaam.

---

## Environment variables

### API (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `PORT` | Default `3001` |
| `CORS_ORIGIN` | Frontend origin |
| `PLATFORM_FEE_PERCENT` | Default `5` |
| `CLICKPESA_API_KEY` | Leave empty for mock payments |
| `CLICKPESA_WEBHOOK_SECRET` | Webhook validation |

### Web (`apps/web/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Default `/api` (use proxy) or full API URL |

---

## Key API routes

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Email/phone + password |
| POST | `/api/auth/otp/request` | Phone OTP (dev returns `debugCode`) |
| POST | `/api/auth/otp/verify` | Verify OTP |
| GET | `/api/listings` | Search + filters (public) |
| POST | `/api/orders` | Checkout + payment initiate |
| POST | `/api/orders/:id/confirm` | Release escrow |
| GET | `/api/driver/jobs/available` | Nearby delivery requests |
| GET | `/api/admin/dashboard` | Platform stats |
| POST | `/api/payments/webhook/clickpesa` | Payment webhook |

---

## Deployment notes

1. **API**: Build with `npm run build`, run `node dist/main`, set production `DATABASE_URL` + secrets.
2. **Web**: `npm run build` → static assets in `dist/` (serve with nginx/CDN). Point `VITE_API_URL` to your API.
3. **DB**: `npx prisma migrate deploy` on release.
4. **PWA**: Serve over HTTPS for install + service worker.
5. **ClickPesa**: Set API keys; configure webhook URL to `/api/payments/webhook/clickpesa`.

---

## Design

- **Palette**: Teal bolt (`#0F766E`) + steel neutrals + amber CTAs  
- **Type**: Barlow (display) + Source Sans 3 (UI)  
- **UX**: Mobile-first bottom nav, large touch targets, low-bandwidth image caching, EN/SW toggle  

---

## License

Private / proprietary unless otherwise specified.
