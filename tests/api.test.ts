import { describe, it, expect, beforeAll, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

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
    upsert: async (args: any) => ({ id: 1, email: args?.where?.email || 'user@example.com', name: null, image: null }),
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

import { authMiddleware, createAuthRouter } from '../server/auth.js'
import { createApiRouter } from '../server/api.js'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  authMiddleware(app)
  app.use('/api/auth', createAuthRouter())
  app.use('/api', createApiRouter())
  return app
}

let app: express.Express
beforeAll(() => {
  // Ensure AI route does not attempt network call in tests
  process.env.OPENAI_API_KEY = ''
  app = buildApp()
})

describe('API routes', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/auth/me returns null when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('POST /api/products requires authentication', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ title: 'New Product' })
    expect(res.status).toBe(401)
  })

  it('GET /api/products returns enriched list', async () => {
    const res = await request(app).get('/api/products')
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
    const res = await request(app)
      .post('/api/ai/description')
      .send({ title: 'A product' })
    // Server route expects OPENAI_API_KEY; without it, 400
    expect(res.status).toBe(400)
  })
})
