# API Reference

Base URL (dev/prod): `/api`

Auth
- POST `/auth/google`
  - Body: `{ credential: string }` (Google ID token)
  - Sets `session` http-only cookie; returns `{ id, email, name, image }`
- GET `/auth/me`
  - Returns current user or `null` if not authenticated
- POST `/auth/logout`
  - Clears `session` cookie; status 204
- PUT `/auth/me` (auth)
  - Body: `{ name?, image?, phoneNo?, ABN?, bio? }`
  - Upserts and returns `{ id, email, name, image, phoneNo, ABN, bio }`

Health
- GET `/health` → `{ ok: true }`

Products
- GET `/products`
  - Returns array of products with owner metadata: `{ ownerName?, ownerImage?, ownerAvgRating?, ownerNegativeCount?, ownerRating }`
- POST `/products` (auth)
  - Body: `{ title, price, type: 'goods'|'service', slug?, images?: string[]|string, description?, categoryId? }`
  - Creates and returns product
- PUT `/products` (auth)
  - Body: `{ id, ...fieldsToUpdate }`
- DELETE `/products` (auth)
  - Body: `{ id }` → 204 on success

Categories
- GET `/categories` → list
- POST|PUT|DELETE `/categories` (auth)

Cart
- GET `/cart`
  - Query: `cartId?`, `userId?` (inferred from session when present)
- POST `/cart` (auth)
  - Body: `{ productId, quantity, meta? }` (adds/updates)
- DELETE `/cart` (auth)
  - Body: `{ itemId }` or `{ clear: true }`

Checkout
- POST `/checkout`
  - Body: `{ cartId?, email?, name?, address?, phone? }`
  - Returns created order `{ id, total, status, items[] }`

Orders
- GET `/orders` (auth) → orders for current user
- GET `/orders/:id` (auth) → order with items
- GET `/orders/track?orderId=...&email=...` → public tracking
- POST `/orders/:id/confirm-appointment` (auth) → seller confirms with `date`
- POST `/orders/:id/complete-service` (auth)
- POST `/orders/:id/appointment/reject-propose` (auth) → seller proposes alternates `{ proposals: string[] }`
- POST `/orders/:id/appointment/accept` (auth) → buyer accepts `{ date }`
- POST `/orders/:id/pay` (auth)
- POST `/orders/:id/ship` (auth) → `{ ackPaid: true }`
- POST `/orders/:id/received` (auth)
- GET `/orders/:id/review` (auth) → existing review if any
- POST `/orders/:id/review` (auth) → `{ rating: 1..5, feedback }`

Users
- GET `/users/:id` → summary
- GET `/users/:id/reviews` → seller reviews
- POST `/users/:id/rate-negative` (auth) → `{ reason, orderId? }`

Blog
- GET `/blog/posts` (public) → supports `?tag=` and `?authorId=`
- GET `/blog/posts/:slug`
- POST `/blog/posts` (auth) → `{ title, slug, content, coverImage?, tags?: string[], published?: boolean }`
- PUT `/blog/posts/:id` (auth) → partial update
- DELETE `/blog/posts/:id` (auth)

AI
- POST `/ai/description`
  - Requires env `OPENAI_API_KEY`
  - Body: `{ title, price?, type?, categoryName?, seller?, tone?, existing?|existingDescription?|description? }`
  - Returns `{ description }`

Errors
- JSON: `{ error: string, detail? }`
- Common statuses: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Error`

Authentication Notes
- Endpoints marked (auth) expect a `session` http-only cookie containing a JWT signed with `JWT_SECRET` (or `NEXTAUTH_SECRET`).
- In development, you can mint a token manually:
  - Node REPL: `require('jsonwebtoken').sign({ uid: 1, email: 'me@example.com' }, 'devsecret')`
  - Set the cookie in your client/tool: `session=<token>`

Examples
```bash
# Health
curl -s http://localhost:5173/api/health

# Products
curl -s http://localhost:5173/api/products

# Create product (auth)
curl -s -X POST http://localhost:5173/api/products \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=YOUR_JWT' \
  -d '{"title":"Sample","price":50,"type":"goods"}'

# Track an order (public)
curl -s 'http://localhost:5173/api/orders/track?orderId=ORDER_ID&email=user@example.com'
```

