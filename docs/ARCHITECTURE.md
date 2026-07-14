# SpareBolt — Project Architecture

## System overview

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────┐
│  React PWA  │◄──────────────────►│  NestJS API      │
│  (Vite)     │   /api/* proxy      │  JWT + REST      │
└──────┬──────┘                     └────────┬─────────┘
       │ IndexedDB cart                      │
       │ Service Worker cache                │ Prisma
       ▼                                     ▼
  Offline listings                   PostgreSQL 16
                                     ┌───────────────┐
                                     │ ClickPesa API │
                                     │ (payments)    │
                                     └───────────────┘
```

## Modules (API)

| Module | Responsibility |
|--------|----------------|
| `auth` | Register/login, phone OTP, become seller/driver, JWT |
| `listings` | Catalog search, CRUD for sellers, categories, vehicles |
| `orders` | Addresses, checkout, confirm receipt, disputes, reviews |
| `payments` | ClickPesa initiate + webhook; mock mode for local dev |
| `deliveries` | Driver jobs, status machine, location, earnings |
| `seller` | Analytics & sales for sellers |
| `admin` | Dashboard, approvals, escrow list, dispute resolution |
| `notifications` | In-app feed + push token registry |

## Order / delivery status machine

```
PENDING_PAYMENT
      │ (payment success)
      ▼
AWAITING_DRIVER ──► DRIVER_ASSIGNED ──► PICKED_UP ──► IN_TRANSIT ──► DELIVERED
                                                                          │
                                                    confirm ──────────────┤
                                                                          ▼
                                                                     CONFIRMED
                                                                          │
                                                    dispute ◄─────────────┤
                                                                          ▼
                                                              DISPUTED → REFUNDED | CONFIRMED
```

## Escrow

- Created when payment completes (`HELD`)
- `sellerAmount = subtotal - platformFee`
- Released on customer confirm or admin resolve-for-seller
- Refunded on admin resolve-for-customer

## Frontend routes

| Path | Access |
|------|--------|
| `/`, `/browse`, `/parts/:id` | Public |
| `/cart` | Public (guest cart) |
| `/checkout`, `/orders` | Auth |
| `/seller/*` | Seller |
| `/driver` | Driver |
| `/admin` | Admin |

## Database

See `apps/api/prisma/schema.prisma` for full models: User, SellerProfile, DriverProfile, Listing, Order, Payment, Escrow, Delivery, Review, Dispute, Notification, Category, VehicleMake/Model.
