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
const fakeApiApplications: Array<Record<string, unknown>> = []
const fakeOauthAuthorizationCodes: Array<Record<string, unknown>> = []
const fakeOauthAccessTokens: Array<Record<string, unknown>> = []
const fakeUsers = [
  { id: 1, name: 'Alice', email: 'alice@example.com', image: null, role: 'driver' },
  { id: 99, name: 'Admin User', email: 'admin@example.com', image: null, role: 'admin' },
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
    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) =>
      fakeProducts.find((product) => product.id === where.id || product.slug === where.slug) || null,
    findFirst: async ({ where }: { where: { OR?: Array<{ id?: string; slug?: string }> } }) =>
      fakeProducts.find((product) => where.OR?.some((entry) => product.id === entry.id || product.slug === entry.slug)) || null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const product = {
        id: `p${fakeProducts.length + 1}`,
        createdAt: fakeNow,
        updatedAt: fakeNow,
        ...data,
      }
      fakeProducts.push(product as typeof fakeProducts[number])
      return product
    },
  },
  apiApplication: {
    findMany: async () => fakeApiApplications,
    findUnique: async ({ where }: { where: { id?: string; apiKeyHash?: string; clientId?: string } }) =>
      fakeApiApplications.find((application) =>
        application.id === where.id || application.apiKeyHash === where.apiKeyHash || application.clientId === where.clientId
      ) || null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const application = {
        id: `app_${fakeApiApplications.length + 1}`,
        createdAt: fakeNow,
        updatedAt: fakeNow,
        lastUsedAt: null,
        ...data,
      }
      fakeApiApplications.push(application)
      return application
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = fakeApiApplications.findIndex((application) => application.id === where.id)
      if (index < 0) throw Object.assign(new Error('Not found'), { code: 'P2025' })
      fakeApiApplications[index] = { ...fakeApiApplications[index], ...data, updatedAt: fakeNow }
      return fakeApiApplications[index]
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = fakeApiApplications.findIndex((application) => application.id === where.id)
      if (index < 0) throw Object.assign(new Error('Not found'), { code: 'P2025' })
      return fakeApiApplications.splice(index, 1)[0]
    },
  },
  oauthAuthorizationCode: {
    findUnique: async ({ where }: { where: { codeHash: string } }) =>
      fakeOauthAuthorizationCodes.find((entry) => entry.codeHash === where.codeHash) || null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const code = {
        id: `code_${fakeOauthAuthorizationCodes.length + 1}`,
        createdAt: fakeNow,
        usedAt: null,
        ...data,
      }
      fakeOauthAuthorizationCodes.push(code)
      return code
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = fakeOauthAuthorizationCodes.findIndex((entry) => entry.id === where.id)
      if (index < 0) throw Object.assign(new Error('Not found'), { code: 'P2025' })
      fakeOauthAuthorizationCodes[index] = { ...fakeOauthAuthorizationCodes[index], ...data }
      return fakeOauthAuthorizationCodes[index]
    },
  },
  oauthAccessToken: {
    findUnique: async ({
      where,
      include,
    }: {
      where: { accessTokenHash?: string; refreshTokenHash?: string }
      include?: Record<string, boolean>
    }) => {
      const token = fakeOauthAccessTokens.find((entry) =>
        entry.accessTokenHash === where.accessTokenHash || entry.refreshTokenHash === where.refreshTokenHash
      ) || null
      if (!token || !include) return token
      return {
        ...token,
        application: include.application ? fakeApiApplications.find((application) => application.id === token.applicationId) || null : undefined,
        user: include.user ? fakeUsers.find((user) => user.id === token.userId) || null : undefined,
      }
    },
    findFirst: async ({ where }: { where: { applicationId?: string; OR?: Array<{ accessTokenHash?: string; refreshTokenHash?: string }> } }) =>
      fakeOauthAccessTokens.find((entry) =>
        entry.applicationId === where.applicationId
        && where.OR?.some((candidate) => entry.accessTokenHash === candidate.accessTokenHash || entry.refreshTokenHash === candidate.refreshTokenHash)
      ) || null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const token = {
        id: `token_${fakeOauthAccessTokens.length + 1}`,
        createdAt: fakeNow,
        updatedAt: fakeNow,
        revokedAt: null,
        lastUsedAt: null,
        ...data,
      }
      fakeOauthAccessTokens.push(token)
      return token
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = fakeOauthAccessTokens.findIndex((entry) => entry.id === where.id)
      if (index < 0) throw Object.assign(new Error('Not found'), { code: 'P2025' })
      fakeOauthAccessTokens[index] = { ...fakeOauthAccessTokens[index], ...data, updatedAt: fakeNow }
      return fakeOauthAccessTokens[index]
    },
  },
  $transaction: async (callback: (tx: typeof fakePrisma) => Promise<unknown>) => callback(fakePrisma),
  user: {
    findMany: async () => fakeUsers.filter((user) => user.id === 1),
    findUnique: async ({ where }: { where: { email?: string; id?: number } }) =>
      fakeUsers.find((user) => user.email === where.email || user.id === where.id) || null,
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

  it('POST /api/oauth/applications creates a scoped API key for admins', async () => {
    const res = await runRouter(apiRouter, 'POST', '/oauth/applications', {
      user: { uid: 99, role: 'admin', email: 'admin@example.com' },
      body: {
        name: 'Warehouse sync',
        scopes: ['products:read', 'products:write'],
      },
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      application: {
        name: 'Warehouse sync',
        scopes: ['products:read', 'products:write'],
        active: true,
      },
    })
    expect(String(res.body?.apiKey)).toMatch(/^hgt_live_/)
    expect(String(res.body?.application?.apiKeyPrefix).length).toBeGreaterThan(8)
  })

  it('GET /api/external/products accepts a managed bearer API key', async () => {
    const created = await runRouter(apiRouter, 'POST', '/oauth/applications', {
      user: { uid: 99, role: 'admin', email: 'admin@example.com' },
      body: {
        name: 'Mobile catalog',
        scopes: ['products:read'],
      },
    })
    const apiKey = String(created.body?.apiKey)
    const res = await runRouter(apiRouter, 'GET', '/external/products', {
      headers: { authorization: `Bearer ${apiKey}` },
    })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      products: [expect.objectContaining({ id: 'p1', title: 'Test Product' })],
    })
  })

  it('POST /api/external/products requires a write scope', async () => {
    const created = await runRouter(apiRouter, 'POST', '/oauth/applications', {
      user: { uid: 99, role: 'admin', email: 'admin@example.com' },
      body: {
        name: 'Read only catalog',
        scopes: ['products:read'],
      },
    })
    const apiKey = String(created.body?.apiKey)
    const res = await runRouter(apiRouter, 'POST', '/external/products', {
      headers: { 'x-api-key': apiKey },
      body: { title: 'Blocked write' },
    })
    expect(res.status).toBe(403)
  })

  it('completes an OAuth authorization code flow and returns user info', async () => {
    const application = await runRouter(apiRouter, 'POST', '/oauth/applications', {
      user: { uid: 99, role: 'admin', email: 'admin@example.com' },
      body: {
        name: 'Gangledger',
        scopes: ['products:read', 'orders:read', 'sales:read', 'refunds:read', 'profile:read'],
        oauthEnabled: true,
        redirectUris: ['https://gangledger.example.com/oauth/callback'],
      },
    })

    expect(application.status).toBe(201)
    expect(String(application.body?.clientSecret)).toMatch(/^hgt_cls_/)

    const authorize = await runRouter(apiRouter, 'POST', '/oauth/authorize', {
      user: { uid: 99, role: 'admin', email: 'admin@example.com' },
      body: {
        client_id: application.body?.application?.clientId,
        redirect_uri: 'https://gangledger.example.com/oauth/callback',
        response_type: 'code',
        scope: 'products:read profile:read',
        state: 'abc123',
      },
    })

    expect(authorize.status).toBe(200)
    const redirectTo = new URL(String(authorize.body?.redirectTo))
    const code = redirectTo.searchParams.get('code')
    expect(code).toBeTruthy()
    expect(redirectTo.searchParams.get('state')).toBe('abc123')

    const token = await runRouter(apiRouter, 'POST', '/oauth/token', {
      body: {
        grant_type: 'authorization_code',
        client_id: application.body?.application?.clientId,
        client_secret: application.body?.clientSecret,
        code,
        redirect_uri: 'https://gangledger.example.com/oauth/callback',
      },
    })

    expect(token.status).toBe(200)
    expect(String(token.body?.access_token)).toMatch(/^hgt_oat_/)
    expect(String(token.body?.refresh_token)).toMatch(/^hgt_ort_/)

    const userinfo = await runRouter(apiRouter, 'GET', '/oauth/userinfo', {
      headers: { authorization: `Bearer ${token.body?.access_token}` },
    })

    expect(userinfo.status).toBe(200)
    expect(userinfo.body).toMatchObject({
      sub: '99',
      email: 'admin@example.com',
    })
  })

  it('POST /api/ai/description returns 400 without OPENAI_API_KEY', async () => {
    const res = await runRouter(apiRouter, 'POST', '/ai/description', {
      body: { title: 'A product' },
    })
    // Server route expects OPENAI_API_KEY; without it, 400
    expect(res.status).toBe(400)
  })
})
