# Shadcn Admin + API (FleetOps)

Modern admin dashboard built with React, Vite, TailwindCSS, and Radix UI — paired with an Express API (Prisma + Postgres) and serverless adapters for Vercel/Netlify.

![Dashboard](public/images/shadcn-admin.png)

This repo includes:
- A responsive, accessible UI based on shadcn/ui
- An Express API with authentication, products, orders, cart, categories, blog, and AI helper endpoints
- Prisma schema and Postgres integration (Neon/Vercel Postgres compatible)
- Serverless adapters for Vercel API routes and Netlify Functions

Quick links:
- docs/API.md — Complete API reference with routes and payloads

## Features

- Light/dark mode, responsive layout, accessible components
- Sidebar navigation, global command menu, 10+ pages
- Auth with JWT cookie and Google Sign-In helper
- Products, Categories, Cart, Checkout, Orders workflows
- Blog CRUD and user reputation/reviews
- AI product description generation via OpenAI

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
- OPENAI_API_KEY: for AI description endpoint

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

Cart & Checkout
- GET /api/cart — get a user cart (cookie-based or userId)
- POST /api/cart — add/update items (auth)
- DELETE /api/cart — remove items (auth)
- POST /api/checkout — create order from cart

Orders
- GET /api/orders — list orders for current user
- GET /api/orders/:id — order details (auth)
- GET /api/orders/track — public tracking by ID & email
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
