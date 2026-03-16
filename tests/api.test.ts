import { describe, it, expect, beforeAll, vi } from 'vitest'
import { runRouter } from './utils/routerRunner'

// Mock Prisma for all imports that rely on it
const fakeNow = new Date()
const fakeProducts = [
  {
    id: 'p1',
    title: 'Test Product',
    slug: 'test-product',
    price: 199,
    type: 'goods',
    createdAt: fakeNow,
    ownerId: 1,
    description: 'A nice product',
    images: ["https://example.com/img1.jpg"],
    categoryId: null,
  },
]

type FakeUserUpsertArgs = {
  where?: { email?: string }
  update?: Record<string, unknown>
  create?: Record<string, unknown>
}

// Minimal fake prisma covering the methods our tests hit
const fakePrisma = {
  product: {
    findMany: async () => fakeProducts,
  },
  user: {
    findMany: async () => [
      { id: 1, name: 'Alice', email: 'alice@example.com', image: null },
    ],
    findUnique: async () => null,
    upsert: async (args: FakeUserUpsertArgs) => ({
      id: 1,
      email: args?.where?.email || 'user@example.com',
      name: null,
      image: null,
    }),
    deleteMany: async () => ({ count: 0 }),
  },
  userReputation: {
    findMany: async () => [
      { userId: 1, negativeCount: 1 },
    ],
  },
  orderReview: {
    groupBy: async () => [
      { sellerId: 1, _avg: { rating: 4.6 } },
    ],
    aggregate: async () => ({ _avg: { rating: 4.6 } }),
  },
}

// Vitest ESM mock before importing modules
vi.mock('../server/prisma.js', () => ({
  getPrisma: () => fakePrisma,
}))

import { createAuthRouter } from '../server/auth.js'
import { createApiRouter } from '../server/api.js'

let authRouter: ReturnType<typeof createAuthRouter>
let apiRouter: ReturnType<typeof createApiRouter>

beforeAll(() => {
  // Ensure AI route does not attempt network call in tests
  process.env.OPENAI_API_KEY = ''
  authRouter = createAuthRouter()
  apiRouter = createApiRouter()
})

describe('API routes', () => {
  it('GET /api/health returns ok', async () => {
    const res = await runRouter(apiRouter, 'GET', '/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/auth/me returns null when not authenticated', async () => {
    const res = await runRouter(authRouter, 'GET', '/me')
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('POST /api/products requires authentication', async () => {
    const res = await runRouter(apiRouter, 'POST', '/products', { body: { title: 'New Product' } })
    expect(res.status).toBe(401)
  })

  it('GET /api/products returns enriched list', async () => {
    const res = await runRouter(apiRouter, 'GET', '/products')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
    const p = res.body[0]
    expect(p.title).toBe('Test Product')
    // Enriched fields from server/api.js
    expect(p.ownerName).toBe('Alice')
    expect(p.ownerAvgRating).toBeTypeOf('number')
    expect(p.ownerNegativeCount).toBe(1)
    expect(p.ownerRating).toBeTypeOf('number')
  })

  it('POST /api/ai/description returns 400 without OPENAI_API_KEY', async () => {
    const res = await runRouter(apiRouter, 'POST', '/ai/description', {
      body: { title: 'A product' },
    })
    // Server route expects OPENAI_API_KEY; without it, 400
    expect(res.status).toBe(400)
  })
})
