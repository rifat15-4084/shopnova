# ShopNova

A production-quality MERN e-commerce platform: product catalog, cart, Stripe checkout, order history, reviews, coupons, wishlist, and a full admin dashboard.

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Server   | Node.js ≥ 20, Express, TypeScript, MongoDB (Mongoose), Zod validation, Pino logging, Stripe, Cloudinary, Swagger UI |
| Client   | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, React Hook Form + Zod, Framer Motion |
| Tooling  | npm workspaces, tsx, Vitest, Playwright, ESLint, Prettier, Husky |

## Features

- **Auth** — JWT access/refresh tokens in httpOnly cookies, register/login, role-based access (admin / customer)
- **Catalog** — product search, category & price filtering, sorting, product detail pages with variants, reviews & ratings
- **Cart & Checkout** — persistent cart, coupon codes, tax & shipping rules, Stripe test-mode payments
- **Orders** — order history, order detail, order tracking statuses
- **Account** — profile, addresses, wishlist
- **Admin dashboard** — manage products, orders, customers, coupons, and moderate reviews
- **Images** — Cloudinary uploads with local `/uploads` fallback
- **Hardening** — Helmet, CORS allow-list, rate limiting, Mongo sanitization
- **API docs** — interactive Swagger UI

## Project Structure

```
shopnova/
├── server/          # Express + TypeScript API (port 5000)
│   ├── src/
│   │   ├── routes/      # auth, catalog, commerce, admin
│   │   ├── models/      # Mongoose schemas
│   │   ├── services/    # business logic
│   │   └── seed/        # demo data seeder
│   └── .env.example
├── client/          # React + Vite storefront (port 5173)
│   └── src/
│       ├── app/         # router, providers
│       ├── features/    # auth, cart, catalog, checkout, admin…
│       └── components/  # shared UI
└── package.json     # workspace root scripts
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or any MongoDB connection string

### Setup

```bash
git clone https://github.com/rifat15-4084/shopnova.git
cd shopnova
npm install

# configure the server
copy server\.env.example server\.env    # Windows (use cp on macOS/Linux)
# edit server/.env — at minimum set MONGODB_URI

# load demo data (products, categories, users, coupons)
npm run seed

# start API + client together
npm run dev
```

### Environment Variables (`server/.env`)

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `MONGODB_URI` | yes | e.g. `mongodb://127.0.0.1:27017/shopnova` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes (prod) | dev defaults exist; generate with `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | for payments | test keys from the Stripe dashboard |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | optional | falls back to local `/uploads` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | optional | falls back to a console mail stub |

The client needs no `.env` in development — Vite proxies `/api` to the server automatically.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Run server + client concurrently |
| `npm run dev:server` / `npm run dev:client` | Run each individually |
| `npm run seed` | Seed demo data (additive) |
| `npm run reseed` | Drop and re-seed demo data |
| `npm run build` | Build server and client for production |
| `npm start` | Run the built server |
| `npm test` | Run server + client unit tests (Vitest) |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run typecheck` | Type-check both workspaces |

## URLs

| URL | Description |
| --- | ----------- |
| http://localhost:5173 | Storefront |
| http://localhost:5000/api/docs | Swagger API docs |
| http://localhost:5000/health | Health check |

## Seeded Test Accounts

| Role | Email | Password |
| ---- | ----- | -------- |
| Admin | `admin@shopnova.dev` | `Admin@12345` |
| Customer | `demo@shopnova.dev` | `Demo@12345` |

Stripe test card: `4242 4242 4242 4242` (any future expiry, any CVC).

## API Overview

All endpoints are mounted under `/api`:

- `/api/auth` — register, login, refresh, logout
- `/api/products`, `/api/products/:id/reviews`, `/api/categories` — public catalog
- `/api/cart`, `/api/checkout`, `/api/orders`, `/api/account`, `/api/uploads` — authenticated commerce
- `/api/admin/*` — admin-only management endpoints

## Deploying to Vercel

The repo is configured as a single Vercel project serving both apps:

- `vercel.json` builds the `client/` (Vite) as static output and rewrites `/api/*` to the serverless function in `api/index.ts`, which delegates to `server/src/vercel.ts` (the Express app with a per-instance cached MongoDB connection).
- The frontend calls same-origin `/api/*` — do **not** set `VITE_API_URL` on Vercel.

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `MONGODB_URI` | yes | Must be a cloud database (Atlas free tier works) — Vercel cannot reach `localhost` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes | The server refuses to start in production with the dev defaults; generate with `openssl rand -base64 32` |
| `COOKIE_SECURE` | recommended | `true` — marks auth cookies `Secure`/`SameSite=None` for HTTPS |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | recommended | Image uploads cannot persist to Vercel's read-only filesystem without Cloudinary |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | optional | Payments stay disabled until set |

Then import the GitHub repo at vercel.com/new and deploy — no extra build settings needed.

## License

Private / UNLICENSED.
