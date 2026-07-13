# Hedgetech Marketplace

Interactive marketplace and commerce cockpit where Hedgetech buyers and sellers trade with confidence. Built with React, Vite, TailwindCSS, and Radix UI on top of an Express + Prisma API that ships with adapters for Vercel and Netlify.

![Hedgetech Marketplace](public/images/hedgetech-social.svg)

This repo includes:
- Hedgetech-themed marketplace UI with discovery, dashboards, and trust signals powered by shadcn/ui primitives
- Express API with authentication, products, services, orders, cart, categories, blog, and AI helper endpoints
- Prisma schema and Postgres integration (Neon/Vercel Postgres compatible)
- Serverless adapters for Vercel API routes and Netlify Functions

Quick links:
- docs/API.md — Complete API reference with routes and payloads
- docs/hedgetech-marketplace-redesign.md — Brand, IA, and UX redesign plan

## Features

- Light/dark mode, responsive layout, accessible components
- Marketplace discovery experience with hero, category rail, and spotlight listings
- Buyer toolkit: cart, trust badges, structured checkout, order tracking, guest access
- Seller cockpit: KPI overview, product manager, POS, fulfilment pipelines, CSV import
- Auth with JWT cookie and Google Sign-In helper
- Blog CRUD, reputation/reviews, AI product description generation via OpenAI
- Chat-based AI concierge that recommends catalogue items, books services, creates orders, and issues payment links

## AI Concierge

- Frontend: `/marketplace/assistant` — conversational UI that keeps the full chat context as JSON and surfaces cart/orders/appointments in a live side panel.
- Backend: `/api/assistant/chat` — Express endpoint that streams catalogue context into OpenAI and executes returned actions (cart staging, bookings, order creation, payment link generation).
- Payments: `/marketplace/order/pay?code=...` pairs with `/api/orders/pay-with-code` so buyers can finalise pending orders using the access code shared by the assistant.
- Requirements: set `OPENAI_API_KEY` and ensure products/services exist in the catalogue (falls back to demo seeds if empty).

## Tech Stack

- React 19, Vite 6, TypeScript
- TailwindCSS, Radix UI
- TanStack Router + TanStack Query
- Express 5, Prisma, PostgreSQL
- Serverless: Vercel API routes, Netlify Functions

## Getting Started

1) Install dependencies

- pnpm install

2) Configure environment

Copy `.env` and set values for your environment. Required keys vary by feature. Common keys:
- DATABASE_URL / POSTGRES_URL: Postgres connection URL
- JWT_SECRET / NEXTAUTH_SECRET: JWT signing secret (cookies)
- VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID: Google OAuth Client ID
- OPENAI_API_KEY: required for the AI product description endpoint and the new sales assistant
- EXTERNAL_PRODUCTS_API_KEY: optional legacy read-only shared secret for external product/category feeds. New integrations should use managed API applications.

3) Database

- Generate Prisma client: pnpm prisma:generate
- Push schema (creates tables): pnpm prisma:push

4) Run in development

- pnpm dev
- App: http://localhost:5173
- API: http://localhost:5173/api
- Docs: http://localhost:5173/docs
 - User Guide: http://localhost:5173/docs/user-guides

5) Build & serve

- Build: pnpm build
- Serve production build: pnpm serve (serves dist and mounts the API)

## API Overview

Base path in dev/prod: `/api`

Auth
- POST /api/auth/google — exchange Google credential for a session cookie
- GET /api/auth/me — current user profile or null
- POST /api/auth/logout — clear session
- PUT|POST /api/auth/me — update current user profile (auth)

Health
- GET /api/health — { ok: true }

Products & Categories
- GET /api/products — list products (enriched with owner metrics)
- POST /api/products — create product (auth)
- PUT /api/products — update product (auth)
- DELETE /api/products — delete product (auth)
- GET /api/categories — list categories
- POST|PUT|DELETE /api/categories — manage categories (auth)

OAuth/API Applications
- GET /api/oauth/scopes — list available API-key scopes (admin auth)
- GET|POST /api/oauth/applications — list or create third-party API applications (admin auth)
- GET|PUT|DELETE /api/oauth/applications/:id — view, update, or delete an API application (admin auth)
- POST /api/oauth/applications/:id/rotate-key — rotate an API key; the raw key is returned once (admin auth)
- POST /api/oauth/applications/:id/rotate-client-secret — rotate the OAuth client secret; the raw secret is returned once (admin auth)
- External apps authenticate with `Authorization: Bearer <apiKey>` or `x-api-key: <apiKey>`
- Scopes: `products:read`, `products:write`, `categories:read`, `categories:write`, `orders:read`, `orders:write`, `sales:read`, `refunds:read`, `refunds:write`, `profile:read`, `*`

OAuth Authorization Code Flow
- Browser entrypoint: `/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=products:read%20orders:read&state=...`
- Validation endpoint: `GET /api/oauth/authorize/request`
- Consent endpoint: `POST /api/oauth/authorize`
- Token exchange: `POST /api/oauth/token`
- Token revoke: `POST /api/oauth/revoke`
- User profile: `GET /api/oauth/userinfo`
- OAuth clients must be created with `oauthEnabled: true` and at least one `redirectUris` entry
- `POST /api/oauth/token` supports `grant_type=authorization_code` and `grant_type=refresh_token`

External CRUD
- GET|POST /api/external/products — list or create products by API key
- GET|PUT|DELETE /api/external/products/:id — read, update, or delete a product by id or slug
- GET|POST /api/external/categories — list or create categories by API key
- PUT|DELETE /api/external/categories/:id — update or delete a category by id or slug
- GET|POST /api/external/orders — list or create orders by API key
- GET|PUT|DELETE /api/external/orders/:id — read, update, or delete an order by API key
- GET /api/external/sales/summary — sales totals and revenue summary for a connected seller
- GET /api/external/refunds — list refunds for the connected account
- POST /api/external/orders/:id/refund — create a refund request
- POST /api/external/refunds/:id/review — accept, reject, or mark a refund as refunded

Cart & Checkout
- GET /api/cart — get a user cart (cookie-based or userId)
- POST /api/cart — add/update items (auth)
- DELETE /api/cart — remove items (auth)
- POST /api/checkout — create order from cart

Orders
- GET /api/orders — list orders for current user
- GET /api/orders/:id — order details (auth)
- GET /api/orders/track — public tracking by ID & email
- POST /api/orders/pay-with-code — mark an order as paid using an access code (guest checkout)
- POST /api/orders/:id/* — status transitions (auth)

Users & Reviews
- GET /api/users/:id — public profile summary
- GET /api/users/:id/reviews — seller reviews
- POST /api/users/:id/rate-negative — file negative report (auth)

Blog
- GET /api/blog/posts — list posts (public)
- GET /api/blog/posts/:slug — fetch post (public)
- POST /api/blog/posts — create (auth)
- PUT /api/blog/posts/:id — update (auth)
- DELETE /api/blog/posts/:id — delete (auth)

AI
- POST /api/ai/description — generate marketing text; requires `OPENAI_API_KEY`
- POST /api/assistant/chat — AI concierge for catalogue search, order creation, and scheduling (requires `OPENAI_API_KEY`)

See docs/API.md for payloads and responses.

## Serverless Adapters

- Vercel: API handlers live in `api/` mapping to Express via small wrappers; rewrites configured in `vercel.json`.
- Netlify: Functions in `netlify/functions/*`; redirects in `netlify.toml` map `/api/*` to functions.

## Testing

- Additions: Vitest + Supertest with example API tests.
- Run all tests: pnpm test
- Watch mode: pnpm test:watch

Notes
- Tests mock Prisma, so they do not require a live database.
- AI route test disables `OPENAI_API_KEY` to avoid network calls.

## Project Structure

- src/ — React app (routes, components, features)
- server/ — Express API, auth, prisma wiring
- api/ — Vercel API route adapters
- netlify/functions — Netlify Functions
- prisma/ — Prisma schema
- tests/ — API route tests (Vitest + Supertest)

## License

MIT
