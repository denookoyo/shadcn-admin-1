import express from 'express'
import { z } from 'zod'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { getPrisma } from './prisma.js'
import { ensureAuth } from './auth.js'
import { sendMarketplaceEmail } from './email.js'
import { isMarketplaceConsumerMode, notSupportedInConsumerMode } from './consumer.js'

function imageForServer(query, w = 640, h = 640) {
  const provider = process.env.VITE_IMAGE_PROVIDER || 'brand'
  if (provider === 'brand') {
    const safeLabel = String(query || 'Hedgetech Marketplace').slice(0, 42)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${safeLabel}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f766e"/>
          <stop offset="100%" stop-color="#102534"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <circle cx="${Math.round(w * 0.78)}" cy="${Math.round(h * 0.22)}" r="${Math.round(Math.min(w, h) * 0.12)}" fill="rgba(255,255,255,0.08)"/>
      <circle cx="${Math.round(w * 0.16)}" cy="${Math.round(h * 0.82)}" r="${Math.round(Math.min(w, h) * 0.18)}" fill="rgba(255,255,255,0.06)"/>
      <text x="50%" y="46%" text-anchor="middle" fill="#ecfeff" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(20, Math.round(w / 18))}" font-weight="700">Hedgetech</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#d1fae5" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(12, Math.round(w / 34))}">${safeLabel}</text>
    </svg>`
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }
  if (provider === 'picsum') return `https://picsum.photos/seed/${encodeURIComponent(query)}/${w}/${h}`
  if (provider === 'placeholder') return `https://placehold.co/${w}x${h}?text=${encodeURIComponent(query)}`
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}

function landSlug(title = '', town = '') {
  return `${title}-${town}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const LAND_LISTING_SEEDS = [
  {
    slug: 'lanet-plains-signature-acreage',
    title: '5-acre serviced enclave in Lanet Plains',
    county: 'Nakuru',
    town: 'Lanet Plains',
    assetType: 'land',
    acreage: 5,
    priceKes: 42500000,
    pricePerAcreKes: 8500000,
    zoning: 'mixed-use',
    listingType: 'freehold',
    description:
      'Corner parcel touching the new Lanet bypass with red soil, piped water, and Kenya Power transformer at the gate. Perfect for a gated estate or hospitality build.',
    highlights: ['Beaconed & fenced', 'Clean freehold title', '2 min to bypass'],
    documents: ['Original title deed', 'Mutation map (2025)', 'Official search (Oct 2025)'],
    utilities: [
      { label: 'Kenya Power 3-phase', available: true, notes: 'Transformer installed on boundary' },
      { label: 'Piped water', available: true, notes: 'NAWASSCO line along boundary' },
      { label: 'Fiber internet', available: false, notes: 'Safaricom fiber terminating 1.2km away' },
    ],
    water: 'Piped + community borehole',
    roadAccess: '600m off tarmac via compacted murram road',
    coordinates: { lat: -0.2449, lng: 36.1504 },
    seller: { name: 'Mwangi Realty', company: 'Mwangi Realty', phone: '+254719555010', email: 'mwangi@mwrealty.co.ke', whatsapp: '+254719555010' },
    gallery: [
      imageForServer('Nakuru Lanet Plains aerial farmland', 1200, 800),
      imageForServer('Kenya gated community land beacons', 1200, 800),
      imageForServer('Nakuru bypass road infrastructure', 1200, 800),
    ],
    status: 'available',
  },
  {
    slug: 'kitengela-ridges-2-5ac',
    title: '2.5 acres along the Kitengela plains',
    county: 'Kajiado',
    town: 'Kitengela - Yukos',
    assetType: 'land',
    acreage: 2.5,
    priceKes: 27500000,
    pricePerAcreKes: 11000000,
    zoning: 'residential',
    listingType: 'freehold',
    description:
      'Flat, red soil land 1.8km off the Namanga Highway behind Yukos. Ideal for townhouses or a senior school campus with nearby borehole water.',
    highlights: ['Namanga highway frontage', 'Perimeter mesh fence', 'Neighbors developed estates'],
    documents: ['Freehold title', 'Stamped mutation', 'Approved change of user'],
    utilities: [
      { label: 'Borehole on site', available: true },
      { label: 'Power nearby', available: true, notes: 'Kenya Power line 200m away' },
      { label: 'Security patrols', available: true, notes: 'Controlled estate watch' },
    ],
    water: 'On-site borehole + community storage tank',
    roadAccess: 'All-weather murram road, 1.8km from Namanga highway',
    coordinates: { lat: -1.4506, lng: 36.9602 },
    seller: { name: 'Nalepo Holdings', company: 'Nalepo Holdings', phone: '+254733886644', email: 'hello@nalepo.co.ke', whatsapp: '+254733886644' },
    gallery: [
      imageForServer('Kitengela land sale aerial view', 1200, 800),
      imageForServer('Kitengela Namanga highway access road', 1200, 800),
      imageForServer('Kenya real estate development plots', 1200, 800),
    ],
    status: 'offer_received',
  },
  {
    slug: 'vipingo-ridge-ten-acres',
    title: '10 acres ocean-view ridge in Vipingo',
    county: 'Kilifi',
    town: 'Vipingo Ridge',
    assetType: 'land',
    acreage: 10,
    priceKes: 120000000,
    pricePerAcreKes: 12000000,
    zoning: 'commercial',
    listingType: 'leasehold',
    description:
      'Undulating ridge line bordering Vipingo Ridge Phase 2, overlooking the Indian Ocean and golf course. Best suited for villas or a boutique resort.',
    highlights: ['Titled + rent paid to 2098', 'Gated golf estate services', 'Unrestricted ocean views'],
    documents: ['Leasehold title (2098)', 'Survey map', 'County rates clearance (2025)'],
    utilities: [
      { label: 'Paved access', available: true },
      { label: 'Mains power', available: true, notes: 'Vipingo Ridge power network' },
      { label: 'Fiber internet', available: true, notes: 'POA fibre along inside road' },
    ],
    water: 'Vipingo Ridge desalination plant connection',
    roadAccess: 'Cabro internal roads connected to Malindi highway via paved entry',
    coordinates: { lat: -3.7836, lng: 39.8494 },
    seller: { name: 'Kahindi + Partners', company: 'Kahindi + Partners', phone: '+254720402040', email: 'sales@kahindipartners.com', whatsapp: '+254720402040' },
    gallery: [
      imageForServer('Vipingo ridge aerial land view indian ocean', 1200, 800),
      imageForServer('Vipingo ridge golf course view', 1200, 800),
      imageForServer('Kenya coast resort land plots', 1200, 800),
    ],
    status: 'available',
  },
  {
    slug: 'kiambu-garden-villas',
    title: '4-bedroom garden villas in Kiambu Road',
    county: 'Kiambu',
    town: 'Kiambu Road',
    assetType: 'house',
    acreage: 0.18,
    priceKes: 48500000,
    pricePerAcreKes: 269444444,
    zoning: 'residential',
    listingType: 'freehold',
    description:
      'Move-in-ready gated villas with private gardens, ensuite bedrooms, borehole backup, and quick access to Ridgeways plus the Northern Bypass.',
    highlights: ['4 beds all ensuite', 'Gated compound', 'Backup borehole + inverter'],
    documents: ['Mother title', 'Subdivision plan', 'Occupation certificate'],
    utilities: [
      { label: 'Borehole water', available: true },
      { label: 'Full-time security', available: true },
      { label: 'Fiber internet', available: true, notes: 'Safaricom and Zuku ready' },
    ],
    water: 'Borehole + county water backup',
    roadAccess: '150m off Kiambu Road on cabro access',
    coordinates: { lat: -1.2119, lng: 36.8427 },
    seller: { name: 'Karibu Homes', company: 'Karibu Homes', phone: '+254711002299', email: 'sales@karibuhomes.ke', whatsapp: '+254711002299' },
    gallery: [
      imageForServer('Kiambu road gated villas kenya', 1200, 800),
      imageForServer('Kenya modern family villa exterior', 1200, 800),
      imageForServer('Nairobi suburban property driveway', 1200, 800),
    ],
    status: 'available',
  },
  {
    slug: 'westlands-income-apartments',
    title: 'Serviced investment apartments in Westlands',
    county: 'Nairobi',
    town: 'Westlands',
    assetType: 'apartment',
    acreage: 0.05,
    priceKes: 18500000,
    pricePerAcreKes: 370000000,
    zoning: 'mixed-use',
    listingType: 'leasehold',
    description:
      'Furnished one and two-bedroom apartments positioned for short-stay income, within walking distance of major offices, malls, and nightlife in Westlands.',
    highlights: ['Serviced apartment block', 'High occupancy location', 'Rooftop gym + pool'],
    documents: ['Leasehold title', 'Management agreement template', 'Rates clearance'],
    utilities: [
      { label: 'Backup generator', available: true },
      { label: 'High-speed lifts', available: true },
      { label: 'Parking bay', available: true, notes: 'One per unit' },
    ],
    water: 'County water + 120,000L storage',
    roadAccess: 'Paved dual-access entry from Westlands Road',
    coordinates: { lat: -1.2678, lng: 36.8044 },
    seller: { name: 'Apex Residences', company: 'Apex Residences', phone: '+254722113355', email: 'invest@apexresidences.ke', whatsapp: '+254722113355' },
    gallery: [
      imageForServer('Westlands serviced apartments Nairobi', 1200, 800),
      imageForServer('Nairobi apartment lobby luxury', 1200, 800),
      imageForServer('Kenya rooftop pool residence', 1200, 800),
    ],
    status: 'offer_received',
  },
]

const SELLER_APPLICATION_SEEDS = [
  {
    email: 'kitengela@hedgetech.market',
    companyName: 'Kitengela Plains Estates',
    contactName: 'Grace Naliaka',
    phone: '+254 711 222333',
    location: 'Kitengela, Kajiado County',
    documents: ['Certificate of Incorporation', 'Tax compliance 2025'],
    pitch: 'Townhouse developer handling Namanga road projects.',
    status: 'pending',
    submittedAt: '2026-02-05T07:30:00.000Z',
  },
  {
    email: 'vipingo@hedgetech.market',
    companyName: 'Vipingo Ridge Holdings',
    contactName: 'Diana Kahindi',
    phone: '+254 721 000555',
    location: 'Vipingo, Kilifi County',
    documents: ['Title deeds portfolio', 'Bank letter of good standing'],
    pitch: 'Premium coastal developer with audited sales.',
    status: 'approved',
    submittedAt: '2025-12-12T10:00:00.000Z',
    reviewedAt: '2025-12-15T14:00:00.000Z',
    reviewerNotes: 'Documents verified by ops team.',
  },
]

const MARKETPLACE_CONSUMER_MODE = isMarketplaceConsumerMode()

// No seeding in API

export function createApiRouter() {
  const router = express.Router()
  const prisma = getPrisma()
  const externalApiKey = (process.env.EXTERNAL_PRODUCTS_API_KEY || '').trim()
  const apiKeyPrefix = 'hgt_live_'
  const apiKeyPreviewLength = 18
  const clientSecretPrefix = 'hgt_cls_'
  const accessTokenPrefix = 'hgt_oat_'
  const refreshTokenPrefix = 'hgt_ort_'
  const externalApiScopes = [
    'products:read',
    'products:write',
    'categories:read',
    'categories:write',
    'orders:read',
    'orders:write',
    'sales:read',
    'refunds:read',
    'refunds:write',
    'profile:read',
    '*',
  ]
  const externalApiScopeSet = new Set(externalApiScopes)
  const legacyExternalScopes = ['products:read', 'categories:read']
  const oauthTokenLifetimeMs = 60 * 60 * 1000
  const oauthRefreshTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000
  const oauthAuthorizationCodeLifetimeMs = 10 * 60 * 1000

  const apiApplicationCreateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    scopes: z.union([z.array(z.string()), z.string()]).optional(),
    description: z.string().trim().max(400).optional().nullable(),
    redirectUris: z.array(z.string().url()).max(10).optional(),
    oauthEnabled: z.boolean().optional(),
  })

  const apiApplicationUpdateSchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    scopes: z.union([z.array(z.string()), z.string()]).optional(),
    active: z.boolean().optional(),
    description: z.string().trim().max(400).optional().nullable(),
    redirectUris: z.array(z.string().url()).max(10).optional(),
    oauthEnabled: z.boolean().optional(),
  })

  function baseUrlFromRequest(req) {
    const protoHeader = req.headers['x-forwarded-proto'] || req.protocol || 'https'
    const proto = Array.isArray(protoHeader) ? protoHeader[0] : String(protoHeader).split(',')[0]
    const host = req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_URL || 'localhost:3000'
    const hostname = Array.isArray(host) ? host[0] : host
    return `${proto}://${hostname}`
  }
  // Compute composite rating from average order reviews and negative reports
  function compositeRating(baseAvg = 5, negCount = 0) {
    const avg = Number.isFinite(baseAvg) && baseAvg > 0 ? baseAvg : 5
    const negatives = Number.isFinite(negCount) && negCount > 0 ? negCount : 0
    const penalty = Math.min(2.5, negatives * 0.8)
    return Math.max(1, Math.min(5, avg - penalty))
  }

  const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const WEEKDAY_FROM_INDEX = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  function normalizeDayToken(token) {
    if (!token) return null
    const lower = String(token).trim().toLowerCase()
    if (!lower) return null
    const match = DAY_NAMES.find((day) => day.startsWith(lower))
    return match || null
  }

  function normalizeOpenDays(value) {
    if (!value) return []
    const parts = Array.isArray(value) ? value : String(value).split(/[,\s]+/)
    const seen = new Set()
    for (const part of parts) {
      const day = normalizeDayToken(part)
      if (day) seen.add(day)
    }
    return Array.from(seen)
  }

  function parseIntOrNull(value, { min = Number.NEGATIVE_INFINITY } = {}) {
    if (value === undefined || value === null || value === '') return null
    const num = Number(value)
    if (!Number.isFinite(num)) return null
    const rounded = Math.round(num)
    if (rounded < min) return null
    return rounded
  }

  function parseIntOrDefault(value, defaultValue = 0, options = {}) {
    const parsed = parseIntOrNull(value, options)
    if (parsed === null || parsed === undefined) return defaultValue
    return parsed
  }

  function normalizeTimeString(value) {
    if (!value && value !== 0) return null
    const str = String(value).trim()
    if (!str) return null
    const match = str.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return null
    const hours = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, '0')
    const minutes = String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  function normalizeStringArray(value, fallback = []) {
    if (Array.isArray(value)) {
      return value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    }
    if (typeof value === 'string') {
      return value
        .split(/[\n,]/)
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    }
    return [...fallback]
  }

  function normalizeSpaceProfile(raw) {
    if (!raw && raw !== 0) return null
    let profile = raw
    if (typeof raw === 'string') {
      try {
        profile = JSON.parse(raw)
      } catch {
        return null
      }
    }
    if (!profile || typeof profile !== 'object') return null
    const rentPerWeek = parseIntOrDefault(profile.rentPerWeek ?? profile.price ?? profile.rate, 0, { min: 0 })
    const bond = profile.bond === undefined || profile.bond === null ? undefined : parseIntOrDefault(profile.bond, 0, { min: 0 })
    const occupancy = profile.occupancy || {}
    const host = profile.host || {}
    const allowedKinds = ['roommate', 'desk-pass', 'lease-transfer']
    const requestedKind = typeof profile.listingKind === 'string' ? profile.listingKind.toLowerCase() : null
    const listingKind = allowedKinds.includes(requestedKind) ? requestedKind : profile.type === 'desk' ? 'desk-pass' : 'roommate'

    return {
      type: ['studio', 'desk'].includes(String(profile.type)) ? String(profile.type) : 'room',
      listingKind,
      rentPerWeek,
      bond,
      suburb: String(profile.suburb || '').trim(),
      city: String(profile.city || '').trim(),
      state: String(profile.state || '').trim(),
      availableFrom: profile.availableFrom ? new Date(profile.availableFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      stayLength: String(profile.stayLength || '').trim() || 'Flexible',
      occupancy: {
        current: parseIntOrDefault(occupancy.current, 0, { min: 0 }),
        total: Math.max(1, parseIntOrDefault(occupancy.total, 1, { min: 1 })),
      },
      furnished: Boolean(profile.furnished ?? true),
      amenities: normalizeStringArray(profile.amenities),
      vibe: normalizeStringArray(profile.vibe),
      host: host && (host.name || host.avatar || host.bio)
        ? {
            name: String(host.name || '').trim() || 'Host',
            avatar: host.avatar ? String(host.avatar) : null,
            bio: host.bio ? String(host.bio) : null,
          }
        : null,
      conciergeIntro: profile.conciergeIntro ? String(profile.conciergeIntro) : null,
    }
  }

  function normalizeSlug(value, fallback = 'item') {
    const source = String(value || fallback)
    return source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80) || fallback
  }

  function stripUndefined(record) {
    return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
  }

  function timingSafeStringEqual(left, right) {
    const leftBuffer = Buffer.from(String(left || ''))
    const rightBuffer = Buffer.from(String(right || ''))
    if (leftBuffer.length !== rightBuffer.length) return false
    return timingSafeEqual(leftBuffer, rightBuffer)
  }

  function hashSecret(value) {
    return createHash('sha256').update(String(value || '')).digest('hex')
  }

  function createApiCredential() {
    const apiKey = `${apiKeyPrefix}${randomBytes(32).toString('base64url')}`
    return {
      apiKey,
      apiKeyHash: hashSecret(apiKey),
      apiKeyPrefix: apiKey.slice(0, apiKeyPreviewLength),
    }
  }

  function createClientId() {
    return `hgt_client_${randomBytes(16).toString('hex')}`
  }

  function createClientSecretCredential() {
    const clientSecret = `${clientSecretPrefix}${randomBytes(32).toString('base64url')}`
    return {
      clientSecret,
      clientSecretHash: hashSecret(clientSecret),
      clientSecretPrefix: clientSecret.slice(0, apiKeyPreviewLength),
    }
  }

  function createOAuthTokenCredential(prefix) {
    const token = `${prefix}${randomBytes(32).toString('base64url')}`
    return {
      token,
      tokenHash: hashSecret(token),
      tokenPrefix: token.slice(0, apiKeyPreviewLength),
    }
  }

  function normalizeApiScopes(rawScopes, fallback = ['products:read']) {
    const raw = rawScopes === undefined || rawScopes === null || rawScopes === ''
      ? fallback
      : Array.isArray(rawScopes)
        ? rawScopes
        : String(rawScopes).split(/[,\s]+/)
    const requested = raw.map((scope) => String(scope || '').trim()).filter(Boolean)
    const invalid = requested.filter((scope) => !externalApiScopeSet.has(scope))
    const scopes = [...new Set(requested.filter((scope) => externalApiScopeSet.has(scope)))]
    return {
      scopes: scopes.length ? scopes : fallback,
      invalid,
    }
  }

  function normalizeRedirectUris(value) {
    if (!Array.isArray(value)) return []
    return [...new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean))]
  }

  function normalizeRequestedScopes(rawScopes, fallback = []) {
    const raw = rawScopes === undefined || rawScopes === null || rawScopes === ''
      ? fallback
      : Array.isArray(rawScopes)
        ? rawScopes
        : String(rawScopes).split(/[,\s]+/)
    return [...new Set(raw.map((scope) => String(scope || '').trim()).filter(Boolean))]
  }

  function apiApplicationToResponse(application) {
    if (!application) return null
    return {
      id: application.id,
      name: application.name,
      description: application.description || null,
      clientId: application.clientId,
      clientSecretPrefix: application.clientSecretPrefix || null,
      apiKeyPrefix: application.apiKeyPrefix,
      scopes: Array.isArray(application.scopes) ? application.scopes : [],
      active: Boolean(application.active),
      oauthEnabled: Boolean(application.oauthEnabled),
      redirectUris: Array.isArray(application.redirectUris) ? application.redirectUris : [],
      createdById: application.createdById ?? null,
      lastUsedAt: application.lastUsedAt?.toISOString?.() || null,
      createdAt: application.createdAt?.toISOString?.() || null,
      updatedAt: application.updatedAt?.toISOString?.() || null,
    }
  }

  function extractBearerToken(req) {
    const auth = String(req.get('authorization') || '').trim()
    return String(auth.match(/^Bearer\s+(.+)$/i)?.[1] || '').trim()
  }

  function extractExternalCredential(req) {
    return String(extractBearerToken(req) || req.get('x-api-key') || req.query.apiKey || req.query.api_key || '').trim()
  }

  function apiApplicationHasScope(application, scope) {
    const scopes = Array.isArray(application?.scopes) ? application.scopes : []
    const [resource] = String(scope || '').split(':')
    return scopes.includes('*') || scopes.includes(scope) || scopes.includes(`${resource}:*`)
  }

  function apiApplicationsUnavailable(res) {
    return res.status(503).json({ error: 'OAuth/API applications are not migrated. Run pnpm prisma:push to create the application and token tables.' })
  }

  function isMissingApiApplicationTable(error) {
    const message = String(error?.message || '')
    return error?.code === 'P2021'
      || error?.code === 'P2022'
      || message.includes('ApiApplication')
      || message.includes('OauthAuthorizationCode')
      || message.includes('OauthAccessToken')
  }

  async function resolveAuthenticatedUserId(req) {
    const direct = Number(req.user?.uid)
    if (Number.isFinite(direct) && direct > 0) return direct
    const email = typeof req.user?.email === 'string' ? String(req.user.email).trim().toLowerCase() : ''
    if (!email) return null
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
    return user?.id ?? null
  }

  function formatOAuthTimestamp(value) {
    return value?.toISOString?.() || null
  }

  function buildSafeRedirectUri(target, params = {}) {
    const url = new URL(target)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  function parseClientCredentials(req) {
    const auth = String(req.get('authorization') || '').trim()
    if (/^Basic\s+/i.test(auth)) {
      try {
        const decoded = Buffer.from(auth.replace(/^Basic\s+/i, ''), 'base64').toString('utf8')
        const separatorIndex = decoded.indexOf(':')
        if (separatorIndex >= 0) {
          return {
            clientId: decoded.slice(0, separatorIndex),
            clientSecret: decoded.slice(separatorIndex + 1),
          }
        }
      } catch {}
    }
    return {
      clientId: String(req.body?.client_id || req.body?.clientId || '').trim(),
      clientSecret: String(req.body?.client_secret || req.body?.clientSecret || '').trim(),
    }
  }

  function createAuthorizationCodeCredential() {
    return createOAuthTokenCredential('hgt_oac_')
  }

  function buildTokenPair() {
    const access = createOAuthTokenCredential(accessTokenPrefix)
    const refresh = createOAuthTokenCredential(refreshTokenPrefix)
    return {
      accessToken: access.token,
      accessTokenHash: access.tokenHash,
      refreshToken: refresh.token,
      refreshTokenHash: refresh.tokenHash,
    }
  }

  async function authenticateApiApplicationByCredential(provided) {
    if (!provided) return { ok: false, status: 401, error: 'API key required' }

    if (externalApiKey && timingSafeStringEqual(provided, externalApiKey)) {
      return {
        ok: true,
        application: {
          id: 'legacy-env-key',
          name: 'Legacy external API key',
          clientId: 'legacy-env-key',
          scopes: legacyExternalScopes,
          active: true,
          legacy: true,
        },
      }
    }

    if (!prisma.apiApplication) {
      return { ok: false, status: 503, error: 'API applications are not available. Run pnpm prisma:generate and pnpm prisma:push.' }
    }

    try {
      const application = await prisma.apiApplication.findUnique({ where: { apiKeyHash: hashSecret(provided) } })
      if (!application || !application.active) return { ok: false, status: 401, error: 'Invalid API key' }
      prisma.apiApplication.update({ where: { id: application.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
      return { ok: true, application }
    } catch (error) {
      if (isMissingApiApplicationTable(error)) {
        return { ok: false, status: 503, error: 'API applications are not migrated. Run pnpm prisma:push.' }
      }
      throw error
    }
  }

  async function authenticateOAuthAccessToken(req) {
    const bearer = extractBearerToken(req)
    if (!bearer || !prisma.oauthAccessToken) return { ok: false, status: 401, error: 'Bearer token required' }

    try {
      const token = await prisma.oauthAccessToken.findUnique({
        where: { accessTokenHash: hashSecret(bearer) },
        include: { application: true, user: true },
      })
      if (!token) return { ok: false, status: 401, error: 'Invalid access token' }
      if (token.revokedAt) return { ok: false, status: 401, error: 'Access token revoked' }
      if (new Date(token.expiresAt).getTime() <= Date.now()) return { ok: false, status: 401, error: 'Access token expired' }
      prisma.oauthAccessToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
      return {
        ok: true,
        token,
        application: token.application,
        user: token.user,
        scopes: Array.isArray(token.scopes) ? token.scopes : [],
      }
    } catch (error) {
      if (isMissingApiApplicationTable(error)) {
        return { ok: false, status: 503, error: 'OAuth tables are not migrated. Run pnpm prisma:push.' }
      }
      throw error
    }
  }

  async function authenticateExternalCredential(req) {
    const oauthAuth = await authenticateOAuthAccessToken(req)
    if (oauthAuth.ok) {
      return {
        ok: true,
        kind: 'oauth_token',
        application: oauthAuth.application,
        user: oauthAuth.user,
        token: oauthAuth.token,
        scopes: oauthAuth.scopes,
      }
    }

    const provided = extractExternalCredential(req)
    const apiKeyAuth = await authenticateApiApplicationByCredential(provided)
    if (!apiKeyAuth.ok) return apiKeyAuth
    return {
      ok: true,
      kind: 'api_key',
      application: apiKeyAuth.application,
      scopes: Array.isArray(apiKeyAuth.application?.scopes) ? apiKeyAuth.application.scopes : [],
    }
  }

  function requireApiScope(...requiredScopes) {
    return async (req, res, next) => {
      try {
        const auth = await authenticateExternalCredential(req)
        if (!auth.ok) return res.status(auth.status).json({ error: auth.error })
        const allowed = requiredScopes.length === 0 || requiredScopes.some((scope) => apiApplicationHasScope({ scopes: auth.scopes }, scope))
        if (!allowed) return res.status(403).json({ error: 'Credential does not have the required scope' })
        req.apiApplication = apiApplicationToResponse(auth.application)
        req.externalAuth = {
          kind: auth.kind,
          user: auth.user
            ? {
                id: auth.user.id,
                email: auth.user.email,
                name: auth.user.name || null,
                role: auth.user.role || null,
              }
            : null,
          scopes: auth.scopes,
          application: apiApplicationToResponse(auth.application),
          expiresAt: auth.token ? formatOAuthTimestamp(auth.token.expiresAt) : null,
        }
        return next()
      } catch (error) {
        console.error('External credential authentication error:', error)
        return res.status(500).json({ error: 'Unable to authenticate external credential' })
      }
    }
  }

  function startOfDay(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function addDays(date, days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function combineDateAndTime(baseDate, timeString) {
    const date = new Date(baseDate)
    if (!timeString) {
      date.setHours(9, 0, 0, 0)
      return date
    }
    const [hours, minutes] = timeString.split(':').map((value) => Number(value) || 0)
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const LAND_STATUS_VALUES = ['available', 'offer_received', 'reserved']
  const LAND_ZONING_VALUES = ['agricultural', 'mixed-use', 'residential', 'commercial']
  const LAND_LISTING_TYPES = ['freehold', 'leasehold']
  const LAND_ASSET_TYPE_VALUES = ['land', 'house', 'apartment', 'commercial', 'office']
  const SELLER_APPLICATION_ACTIONS = ['approve', 'reject']

  const landUtilitySchema = z.object({
    label: z.string().min(1),
    available: z.boolean(),
    notes: z.string().max(200).optional().nullable(),
  })

  const landSellerSchema = z.object({
    name: z.string().min(1),
    company: z.string().optional().nullable(),
    phone: z.string().min(6),
    email: z.string().email().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
  })

  const landListingInputSchema = z.object({
    title: z.string().min(3),
    county: z.string().min(2),
    town: z.string().min(2),
    assetType: z.enum(LAND_ASSET_TYPE_VALUES).default('land'),
    acreage: z.number().positive(),
    priceKes: z.number().int().nonnegative(),
    pricePerAcreKes: z.number().int().nonnegative().optional(),
    zoning: z.enum(LAND_ZONING_VALUES),
    listingType: z.enum(LAND_LISTING_TYPES).default('freehold'),
    description: z.string().min(10),
    highlights: z.array(z.string().min(1)).optional(),
    documents: z.array(z.string().min(1)).optional(),
    utilities: z.array(landUtilitySchema).optional(),
    water: z.string().optional(),
    roadAccess: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    seller: landSellerSchema,
    gallery: z.array(z.string().url()).optional(),
    status: z.enum(LAND_STATUS_VALUES).optional(),
  })

  const sellerApplicationInputSchema = z.object({
    companyName: z.string().min(2),
    contactName: z.string().min(1),
    phone: z.string().min(6),
    location: z.string().max(200).optional(),
    documents: z.array(z.string().min(1)).max(20).optional(),
    pitch: z.string().max(4000).optional(),
    resubmitForReview: z.boolean().optional(),
  })

  const sellerApplicationReviewSchema = z.object({
    action: z.enum(SELLER_APPLICATION_ACTIONS),
    reviewerNotes: z.string().max(4000).optional(),
  })

  function mapZoningToDb(value) {
    if (value === 'mixed-use') return 'mixed_use'
    return value
  }

  function mapZoningToApi(value) {
    if (value === 'mixed_use') return 'mixed-use'
    return value
  }

  function mapGallery(values, fallbackLabel) {
    const cleaned = Array.isArray(values) ? values.map((val) => String(val || '').trim()).filter(Boolean) : []
    if (cleaned.length) return cleaned
    return [imageForServer(`${fallbackLabel} real estate`, 1200, 800)]
  }

  function mapArrayField(values, defaultValues) {
    if (Array.isArray(values) && values.length) {
      return values.map((val) => String(val || '').trim()).filter(Boolean)
    }
    return [...defaultValues]
  }

  function mapUtilities(values) {
    if (!Array.isArray(values) || !values.length) return [{ label: 'Power nearby', available: true }]
    return values
      .map((util) => ({
        label: String(util.label || '').trim(),
        available: Boolean(util.available),
        notes: util.notes ? String(util.notes).trim() : null,
      }))
      .filter((util) => Boolean(util.label))
  }

  function mapSeller(input) {
    const placeholder = { name: 'Owner', phone: '+254700000000', whatsapp: '+254700000000' }
    if (!input || typeof input !== 'object') return placeholder
    const name = String(input.name || '').trim() || placeholder.name
    const phone = String(input.phone || '').trim() || placeholder.phone
    const whatsapp = String(input.whatsapp || '').trim() || phone
    return {
      name,
      company: input.company ? String(input.company).trim() || null : null,
      phone,
      email: input.email ? String(input.email).trim() || null : null,
      whatsapp,
    }
  }

  function mapCoordinates(coords) {
    if (!coords || typeof coords !== 'object') return null
    const lat = Number(coords.lat)
    const lng = Number(coords.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }

  function buildLandListingData(input, { slug } = {}) {
    const acreage = Number(input.acreage) || 1
    const priceKes = Math.max(0, Math.round(Number(input.priceKes) || 0))
    const pricePerAcre =
      input.pricePerAcreKes && input.pricePerAcreKes > 0 ? Math.round(input.pricePerAcreKes) : Math.round(priceKes / Math.max(acreage, 1))
    return {
      slug,
      title: String(input.title || '').trim(),
      county: String(input.county || '').trim(),
      town: String(input.town || '').trim(),
      assetType: input.assetType || 'land',
      acreage: acreage.toFixed(2),
      priceKes,
      pricePerAcreKes: pricePerAcre,
      zoning: mapZoningToDb(input.zoning),
      listingType: input.listingType || 'freehold',
      description: String(input.description || '').trim(),
      highlights: mapArrayField(input.highlights, ['Fresh listing']),
      documents: mapArrayField(input.documents, ['Title ready']),
      utilities: mapUtilities(input.utilities),
      water: input.water ? String(input.water).trim() : null,
      roadAccess: input.roadAccess ? String(input.roadAccess).trim() : null,
      coordinates: mapCoordinates(input.coordinates),
      seller: mapSeller(input.seller),
      gallery: mapGallery(input.gallery, input.county || input.town || 'Kenya'),
      status: input.status || 'available',
    }
  }

  function landRecordToResponse(record) {
    const utilities = Array.isArray(record.utilities) ? record.utilities : []
    const seller = (record.seller && typeof record.seller === 'object' ? record.seller : mapSeller(null))
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      county: record.county,
      town: record.town,
      assetType: record.assetType,
      acreage: Number(record.acreage),
      priceKes: record.priceKes,
      pricePerAcreKes: record.pricePerAcreKes ?? record.priceKes,
      zoning: mapZoningToApi(record.zoning),
      listingType: record.listingType,
      description: record.description,
      highlights: record.highlights || [],
      documents: record.documents || [],
      utilities,
      water: record.water || undefined,
      roadAccess: record.roadAccess || undefined,
      coordinates: record.coordinates || undefined,
      seller,
      gallery: record.gallery || [],
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }
  }

  async function generateLandSlug(title, town, preferredSlug) {
    const base = (preferredSlug && preferredSlug.trim()) || landSlug(title, town) || `land-${Date.now()}`
    let candidate = base
    let counter = 2
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.landListing.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${counter}`
      counter += 1
    }
    return candidate
  }

  async function ensureLandListingsSeeded() {
    for (const seed of LAND_LISTING_SEEDS) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await prisma.landListing.findUnique({ where: { slug: seed.slug } })
      if (existing) continue
      const slug = await generateLandSlug(seed.title, seed.town, seed.slug)
      const data = buildLandListingData(seed, { slug })
      // eslint-disable-next-line no-await-in-loop
      await prisma.landListing.create({ data })
    }
  }

  function normalizeSellerDocuments(values) {
    if (!Array.isArray(values)) return []
    return values.map((entry) => String(entry || '').trim()).filter(Boolean)
  }

  function sellerApplicationToResponse(record) {
    if (!record) return null
    return {
      id: record.id,
      email: record.email,
      companyName: record.companyName,
      contactName: record.contactName,
      phone: record.phone,
      location: record.location || undefined,
      documents: Array.isArray(record.documents) ? record.documents : [],
      pitch: record.pitch || undefined,
      status: record.status,
      submittedAt: record.submittedAt.toISOString(),
      reviewedAt: record.reviewedAt ? record.reviewedAt.toISOString() : undefined,
      reviewerNotes: record.reviewerNotes || undefined,
      createdAt: record.createdAt ? record.createdAt.toISOString() : undefined,
      updatedAt: record.updatedAt ? record.updatedAt.toISOString() : undefined,
    }
  }

  async function ensureSellerApplicationsSeeded() {
    for (const seed of SELLER_APPLICATION_SEEDS) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await prisma.sellerApplication.findUnique({ where: { email: seed.email.toLowerCase() } })
      if (existing) continue
      // eslint-disable-next-line no-await-in-loop
      const user = await prisma.user.findUnique({ where: { email: seed.email.toLowerCase() }, select: { id: true } }).catch(() => null)
      // eslint-disable-next-line no-await-in-loop
      await prisma.sellerApplication.create({
        data: {
          userId: user?.id ?? null,
          email: seed.email.toLowerCase(),
          companyName: seed.companyName,
          contactName: seed.contactName,
          phone: seed.phone,
          location: seed.location || null,
          documents: normalizeSellerDocuments(seed.documents),
          pitch: seed.pitch || null,
          status: seed.status,
          submittedAt: new Date(seed.submittedAt),
          reviewedAt: seed.reviewedAt ? new Date(seed.reviewedAt) : null,
          reviewerNotes: seed.reviewerNotes || null,
        },
      })
    }
  }

  async function resolveSellerActor(req) {
    const email = typeof req.user?.email === 'string' ? String(req.user.email).trim().toLowerCase() : ''
    const uid = Number.isFinite(Number(req.user?.uid)) ? Number(req.user.uid) : null
    let userId = uid
    if (!userId && email) {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
      userId = user?.id ?? null
    }
    return { email, userId }
  }

  async function findSellerApplicationForActor({ email, userId }) {
    if (userId && email) {
      return prisma.sellerApplication.findFirst({
        where: {
          OR: [{ userId }, { email }],
        },
      })
    }
    if (userId) return prisma.sellerApplication.findFirst({ where: { userId } })
    if (email) return prisma.sellerApplication.findUnique({ where: { email } })
    return null
  }

  function sellerStatusFromConsumerSession(req) {
    return req.user?.marketplaceEligible || req.user?.marketplaceCatalog || req.user?.marketplaceApi || req.user?.isAdmin
      ? 'approved'
      : 'not_submitted'
  }

  function buildConsumerSellerApplication(req, input = {}) {
    const email = typeof req.user?.email === 'string' ? String(req.user.email).trim().toLowerCase() : ''
    if (!email) return null
    const status = sellerStatusFromConsumerSession(req)
    const name = typeof req.user?.name === 'string' ? req.user.name : ''
    const now = new Date().toISOString()
    return {
      id: `gangledger-${email}`,
      email,
      companyName: String(input.companyName || '').trim() || name || 'Gang Ledger seller',
      contactName: String(input.contactName || '').trim() || name || 'Seller',
      phone: String(input.phone || '').trim(),
      location: input.location ? String(input.location).trim() : undefined,
      documents: normalizeSellerDocuments(input.documents),
      pitch: input.pitch ? String(input.pitch).trim() : undefined,
      status,
      submittedAt: now,
      reviewedAt: status === 'approved' ? now : undefined,
      reviewerNotes:
        status === 'approved' ? 'Seller access is already managed through your Gang Ledger account.' : undefined,
      createdAt: now,
      updatedAt: now,
    }
  }

  router.get('/health', (_req, res) => res.json({ ok: true }))

  // ---------------- Amazing Freight (Admin) ----------------
  // Simple role gate: requires req.user.role === 'admin' (tokens include role)
  function ensureAdmin(req, res, next) {
    if (req.user?.role === 'admin') return next()
    return res.status(403).json({ error: 'Forbidden' })
  }

  async function validateOauthAuthorizationRequest(source = {}) {
    const clientId = String(source.client_id || source.clientId || '').trim()
    const redirectUri = String(source.redirect_uri || source.redirectUri || '').trim()
    const responseType = String(source.response_type || source.responseType || 'code').trim()
    const state = String(source.state || '').trim()
    const scope = String(source.scope || '').trim()

    if (!clientId) return { ok: false, status: 400, error: 'Missing client_id' }
    if (!redirectUri) return { ok: false, status: 400, error: 'Missing redirect_uri' }
    if (responseType !== 'code') return { ok: false, status: 400, error: 'Unsupported response_type' }
    if (!prisma.apiApplication) return { ok: false, status: 503, error: 'OAuth clients are not available. Run pnpm prisma:push.' }

    const application = await prisma.apiApplication.findUnique({ where: { clientId } })
    if (!application || !application.active || !application.oauthEnabled) {
      return { ok: false, status: 404, error: 'OAuth application not found' }
    }

    const redirectUris = Array.isArray(application.redirectUris) ? application.redirectUris : []
    if (!redirectUris.includes(redirectUri)) {
      return { ok: false, status: 400, error: 'redirect_uri is not allowed for this application' }
    }

    const defaultScopes = application.scopes.includes('*')
      ? externalApiScopes.filter((entry) => entry !== '*')
      : application.scopes
    const requestedScopes = normalizeRequestedScopes(scope, defaultScopes)
    const invalidScopes = requestedScopes.filter((entry) => !apiApplicationHasScope(application, entry))
    if (invalidScopes.length) {
      return { ok: false, status: 400, error: 'Requested scopes are not allowed for this application', invalidScopes }
    }

    return {
      ok: true,
      application,
      redirectUri,
      state,
      scopes: requestedScopes.length ? requestedScopes : defaultScopes,
    }
  }

  router.get('/oauth/scopes', ensureAuth, ensureAdmin, (_req, res) => {
    res.json({ scopes: externalApiScopes })
  })

  router.get('/oauth/applications', ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const applications = await prisma.apiApplication.findMany({ orderBy: { createdAt: 'desc' } })
      res.json({ applications: applications.map(apiApplicationToResponse) })
    } catch (e) {
      console.error('GET /api/oauth/applications error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/oauth/applications/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing application id' })
      const application = await prisma.apiApplication.findUnique({ where: { id } })
      if (!application) return res.status(404).json({ error: 'API application not found' })
      res.json({ application: apiApplicationToResponse(application) })
    } catch (e) {
      console.error('GET /api/oauth/applications/:id error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/oauth/applications', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const parsed = apiApplicationCreateSchema.safeParse(req.body || {})
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid API application payload', details: parsed.error.flatten() })
      }
      const { scopes, invalid } = normalizeApiScopes(parsed.data.scopes, ['products:read'])
      if (invalid.length) return res.status(400).json({ error: 'Invalid scopes', invalidScopes: invalid, allowedScopes: externalApiScopes })
      const redirectUris = normalizeRedirectUris(parsed.data.redirectUris)
      const oauthEnabled = Boolean(parsed.data.oauthEnabled || redirectUris.length > 0)
      if (oauthEnabled && redirectUris.length === 0) {
        return res.status(400).json({ error: 'OAuth applications require at least one redirect URI' })
      }
      const credential = createApiCredential()
      const clientSecretCredential = oauthEnabled ? createClientSecretCredential() : null
      const createdById = Number.isFinite(Number(req.user?.uid)) ? Number(req.user.uid) : null
      const application = await prisma.apiApplication.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ? String(parsed.data.description).trim() : null,
          clientId: createClientId(),
          clientSecretHash: clientSecretCredential?.clientSecretHash || null,
          clientSecretPrefix: clientSecretCredential?.clientSecretPrefix || null,
          apiKeyHash: credential.apiKeyHash,
          apiKeyPrefix: credential.apiKeyPrefix,
          scopes,
          active: true,
          oauthEnabled,
          redirectUris,
          createdById,
        },
      })
      res.status(201).json({
        application: apiApplicationToResponse(application),
        apiKey: credential.apiKey,
        clientSecret: clientSecretCredential?.clientSecret || null,
        note: 'Store this API key now. It is only returned once.',
      })
    } catch (e) {
      console.error('POST /api/oauth/applications error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/oauth/applications/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing application id' })
      const parsed = apiApplicationUpdateSchema.safeParse(req.body || {})
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid API application payload', details: parsed.error.flatten() })
      }
      const data = {}
      if (parsed.data.name !== undefined) data.name = parsed.data.name
      if (parsed.data.active !== undefined) data.active = parsed.data.active
      if (parsed.data.description !== undefined) data.description = parsed.data.description ? String(parsed.data.description).trim() : null
      if (parsed.data.scopes !== undefined) {
        const { scopes, invalid } = normalizeApiScopes(parsed.data.scopes, [])
        if (invalid.length) return res.status(400).json({ error: 'Invalid scopes', invalidScopes: invalid, allowedScopes: externalApiScopes })
        data.scopes = scopes
      }
      if (parsed.data.redirectUris !== undefined) data.redirectUris = normalizeRedirectUris(parsed.data.redirectUris)
      if (parsed.data.oauthEnabled !== undefined) data.oauthEnabled = parsed.data.oauthEnabled
      if (data.oauthEnabled === true && (!Array.isArray(data.redirectUris) ? false : data.redirectUris.length === 0)) {
        const current = await prisma.apiApplication.findUnique({ where: { id }, select: { redirectUris: true } })
        const currentRedirectUris = Array.isArray(current?.redirectUris) ? current.redirectUris : []
        if (!(Array.isArray(data.redirectUris) && data.redirectUris.length > 0) && currentRedirectUris.length === 0) {
          return res.status(400).json({ error: 'OAuth applications require at least one redirect URI' })
        }
      }
      if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No application fields supplied' })
      const application = await prisma.apiApplication.update({ where: { id }, data })
      res.json({ application: apiApplicationToResponse(application) })
    } catch (e) {
      console.error('PUT /api/oauth/applications/:id error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      if (e?.code === 'P2025') return res.status(404).json({ error: 'API application not found' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/oauth/applications/:id/rotate-key', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing application id' })
      const credential = createApiCredential()
      const application = await prisma.apiApplication.update({
        where: { id },
        data: {
          apiKeyHash: credential.apiKeyHash,
          apiKeyPrefix: credential.apiKeyPrefix,
          lastUsedAt: null,
        },
      })
      res.json({
        application: apiApplicationToResponse(application),
        apiKey: credential.apiKey,
        note: 'Store this API key now. It is only returned once.',
      })
    } catch (e) {
      console.error('POST /api/oauth/applications/:id/rotate-key error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      if (e?.code === 'P2025') return res.status(404).json({ error: 'API application not found' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/oauth/applications/:id/rotate-client-secret', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing application id' })
      const credential = createClientSecretCredential()
      const application = await prisma.apiApplication.update({
        where: { id },
        data: {
          clientSecretHash: credential.clientSecretHash,
          clientSecretPrefix: credential.clientSecretPrefix,
          oauthEnabled: true,
        },
      })
      res.json({
        application: apiApplicationToResponse(application),
        clientSecret: credential.clientSecret,
        note: 'Store this client secret now. It is only returned once.',
      })
    } catch (e) {
      console.error('POST /api/oauth/applications/:id/rotate-client-secret error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      if (e?.code === 'P2025') return res.status(404).json({ error: 'API application not found' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/oauth/applications/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (!prisma.apiApplication) return apiApplicationsUnavailable(res)
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing application id' })
      await prisma.apiApplication.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/oauth/applications/:id error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      if (e?.code === 'P2025') return res.status(404).json({ error: 'API application not found' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/oauth/authorize/request', async (req, res) => {
    try {
      const validation = await validateOauthAuthorizationRequest(req.query || {})
      if (!validation.ok) {
        return res.status(validation.status).json({
          error: validation.error,
          invalidScopes: validation.invalidScopes || [],
        })
      }
      const userId = await resolveAuthenticatedUserId(req)
      return res.json({
        application: apiApplicationToResponse(validation.application),
        redirectUri: validation.redirectUri,
        scopes: validation.scopes,
        state: validation.state || null,
        loginRequired: !userId,
        loggedIn: Boolean(userId),
        user: userId
          ? {
              id: userId,
              email: req.user?.email || null,
              name: req.user?.name || null,
            }
          : null,
      })
    } catch (e) {
      console.error('GET /api/oauth/authorize/request error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/oauth/authorize', ensureAuth, async (req, res) => {
    try {
      const validation = await validateOauthAuthorizationRequest(req.body || {})
      if (!validation.ok) {
        return res.status(validation.status).json({
          error: validation.error,
          invalidScopes: validation.invalidScopes || [],
        })
      }

      const decision = String(req.body?.decision || 'approve').trim().toLowerCase()
      if (decision !== 'approve') {
        return res.json({
          redirectTo: buildSafeRedirectUri(validation.redirectUri, {
            error: 'access_denied',
            state: validation.state || undefined,
          }),
        })
      }

      const userId = await resolveAuthenticatedUserId(req)
      if (!userId) return res.status(401).json({ error: 'Sign in required' })

      if (!prisma.oauthAuthorizationCode) return apiApplicationsUnavailable(res)
      const codeCredential = createAuthorizationCodeCredential()
      await prisma.oauthAuthorizationCode.create({
        data: {
          applicationId: validation.application.id,
          userId,
          codeHash: codeCredential.tokenHash,
          redirectUri: validation.redirectUri,
          scopes: validation.scopes,
          expiresAt: new Date(Date.now() + oauthAuthorizationCodeLifetimeMs),
        },
      })

      return res.json({
        redirectTo: buildSafeRedirectUri(validation.redirectUri, {
          code: codeCredential.token,
          state: validation.state || undefined,
        }),
      })
    } catch (e) {
      console.error('POST /api/oauth/authorize error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/oauth/token', async (req, res) => {
    try {
      const { clientId, clientSecret } = parseClientCredentials(req)
      const grantType = String(req.body?.grant_type || req.body?.grantType || '').trim()
      if (!clientId || !clientSecret) return res.status(401).json({ error: 'Client authentication failed' })
      if (!prisma.apiApplication || !prisma.oauthAccessToken || !prisma.oauthAuthorizationCode) return apiApplicationsUnavailable(res)

      const application = await prisma.apiApplication.findUnique({ where: { clientId } })
      if (!application || !application.active || !application.oauthEnabled) {
        return res.status(401).json({ error: 'Client authentication failed' })
      }
      if (!application.clientSecretHash || !timingSafeStringEqual(application.clientSecretHash, hashSecret(clientSecret))) {
        return res.status(401).json({ error: 'Client authentication failed' })
      }

      if (grantType === 'authorization_code') {
        const code = String(req.body?.code || '').trim()
        const redirectUri = String(req.body?.redirect_uri || req.body?.redirectUri || '').trim()
        if (!code || !redirectUri) return res.status(400).json({ error: 'Missing code or redirect_uri' })
        const authCode = await prisma.oauthAuthorizationCode.findUnique({ where: { codeHash: hashSecret(code) } })
        if (!authCode || authCode.applicationId !== application.id || authCode.redirectUri !== redirectUri) {
          return res.status(400).json({ error: 'Invalid authorization code' })
        }
        if (authCode.usedAt) return res.status(400).json({ error: 'Authorization code already used' })
        if (new Date(authCode.expiresAt).getTime() <= Date.now()) return res.status(400).json({ error: 'Authorization code expired' })

        const tokenPair = buildTokenPair()
        const now = Date.now()
        const createToken = async (tx) => {
          await tx.oauthAuthorizationCode.update({ where: { id: authCode.id }, data: { usedAt: new Date() } })
          return tx.oauthAccessToken.create({
            data: {
              applicationId: application.id,
              userId: authCode.userId,
              accessTokenHash: tokenPair.accessTokenHash,
              refreshTokenHash: tokenPair.refreshTokenHash,
              scopes: authCode.scopes,
              expiresAt: new Date(now + oauthTokenLifetimeMs),
              refreshExpiresAt: new Date(now + oauthRefreshTokenLifetimeMs),
            },
          })
        }
        const tokenRecord = prisma.$transaction ? await prisma.$transaction(createToken) : await createToken(prisma)

        return res.json({
          access_token: tokenPair.accessToken,
          token_type: 'Bearer',
          expires_in: Math.round((new Date(tokenRecord.expiresAt).getTime() - now) / 1000),
          refresh_token: tokenPair.refreshToken,
          scope: authCode.scopes.join(' '),
        })
      }

      if (grantType === 'refresh_token') {
        const refreshToken = String(req.body?.refresh_token || req.body?.refreshToken || '').trim()
        if (!refreshToken) return res.status(400).json({ error: 'Missing refresh_token' })
        const tokenRecord = await prisma.oauthAccessToken.findUnique({ where: { refreshTokenHash: hashSecret(refreshToken) } })
        if (!tokenRecord || tokenRecord.applicationId !== application.id) return res.status(400).json({ error: 'Invalid refresh token' })
        if (tokenRecord.revokedAt) return res.status(400).json({ error: 'Refresh token revoked' })
        if (!tokenRecord.refreshExpiresAt || new Date(tokenRecord.refreshExpiresAt).getTime() <= Date.now()) {
          return res.status(400).json({ error: 'Refresh token expired' })
        }

        const tokenPair = buildTokenPair()
        const now = Date.now()
        const updated = await prisma.oauthAccessToken.update({
          where: { id: tokenRecord.id },
          data: {
            accessTokenHash: tokenPair.accessTokenHash,
            refreshTokenHash: tokenPair.refreshTokenHash,
            expiresAt: new Date(now + oauthTokenLifetimeMs),
            refreshExpiresAt: new Date(now + oauthRefreshTokenLifetimeMs),
            revokedAt: null,
          },
        })

        return res.json({
          access_token: tokenPair.accessToken,
          token_type: 'Bearer',
          expires_in: Math.round((new Date(updated.expiresAt).getTime() - now) / 1000),
          refresh_token: tokenPair.refreshToken,
          scope: Array.isArray(updated.scopes) ? updated.scopes.join(' ') : '',
        })
      }

      return res.status(400).json({ error: 'Unsupported grant_type' })
    } catch (e) {
      console.error('POST /api/oauth/token error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/oauth/revoke', async (req, res) => {
    try {
      const { clientId, clientSecret } = parseClientCredentials(req)
      const token = String(req.body?.token || '').trim()
      if (!clientId || !clientSecret || !token) return res.status(400).json({ error: 'Missing client credentials or token' })
      if (!prisma.apiApplication || !prisma.oauthAccessToken) return apiApplicationsUnavailable(res)

      const application = await prisma.apiApplication.findUnique({ where: { clientId } })
      if (!application || !application.clientSecretHash || !timingSafeStringEqual(application.clientSecretHash, hashSecret(clientSecret))) {
        return res.status(401).json({ error: 'Client authentication failed' })
      }

      const tokenHash = hashSecret(token)
      const accessToken = await prisma.oauthAccessToken.findFirst({
        where: {
          applicationId: application.id,
          OR: [{ accessTokenHash: tokenHash }, { refreshTokenHash: tokenHash }],
        },
      })
      if (accessToken) {
        await prisma.oauthAccessToken.update({ where: { id: accessToken.id }, data: { revokedAt: new Date() } })
      }
      return res.status(200).json({ revoked: true })
    } catch (e) {
      console.error('POST /api/oauth/revoke error:', e)
      if (isMissingApiApplicationTable(e)) return apiApplicationsUnavailable(res)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/oauth/userinfo', requireApiScope('profile:read'), async (req, res) => {
    const actor = req.externalAuth
    if (actor?.kind !== 'oauth_token' || !actor.user) {
      return res.status(403).json({ error: 'OAuth bearer token required' })
    }
    return res.json({
      sub: String(actor.user.id),
      id: actor.user.id,
      email: actor.user.email,
      name: actor.user.name || null,
      role: actor.user.role || null,
      application: actor.application,
      scope: Array.isArray(actor.scopes) ? actor.scopes.join(' ') : '',
      expiresAt: actor.expiresAt || null,
    })
  })

  router.get('/seller/application', ensureAuth, async (req, res) => {
    try {
      if (MARKETPLACE_CONSUMER_MODE) {
        return res.json({
          application: null,
          status: sellerStatusFromConsumerSession(req),
        })
      }
      await ensureSellerApplicationsSeeded()
      const actor = await resolveSellerActor(req)
      if (!actor.email && !actor.userId) {
        return res.status(400).json({ error: 'Unable to resolve seller profile' })
      }
      const application = await findSellerApplicationForActor(actor)
      if (!application) {
        return res.json({ application: null, status: 'not_submitted' })
      }
      if (!application.userId && actor.userId) {
        await prisma.sellerApplication.update({ where: { id: application.id }, data: { userId: actor.userId } })
        application.userId = actor.userId
      }
      return res.json({ application: sellerApplicationToResponse(application), status: application.status })
    } catch (e) {
      console.error('GET /api/seller/application error:', e)
      return res.status(500).json({ error: 'Unable to load seller verification right now.' })
    }
  })

  router.post('/seller/application', ensureAuth, async (req, res) => {
    try {
      const parsed = sellerApplicationInputSchema.safeParse(req.body || {})
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid seller verification payload', details: parsed.error.flatten() })
      }
      if (MARKETPLACE_CONSUMER_MODE) {
        const application = buildConsumerSellerApplication(req, parsed.data)
        if (!application) return res.status(400).json({ error: 'Signed-in email is required for seller verification.' })
        return res.status(200).json({ application, status: application.status })
      }
      const actor = await resolveSellerActor(req)
      if (!actor.email) return res.status(400).json({ error: 'Signed-in email is required for seller verification.' })

      const existing = await findSellerApplicationForActor(actor)
      const preserveApproved = existing?.status === 'approved' && !parsed.data.resubmitForReview
      const nextStatus = preserveApproved ? 'approved' : 'pending'
      const payload = {
        userId: actor.userId ?? existing?.userId ?? null,
        email: actor.email,
        companyName: String(parsed.data.companyName || '').trim(),
        contactName: String(parsed.data.contactName || '').trim(),
        phone: String(parsed.data.phone || '').trim(),
        location: parsed.data.location ? String(parsed.data.location).trim() : null,
        documents: normalizeSellerDocuments(parsed.data.documents),
        pitch: parsed.data.pitch ? String(parsed.data.pitch).trim() : null,
        status: nextStatus,
        submittedAt: new Date(),
        reviewedAt: preserveApproved ? existing?.reviewedAt ?? null : null,
        reviewerNotes: preserveApproved ? existing?.reviewerNotes ?? null : null,
      }

      const application = existing
        ? await prisma.sellerApplication.update({
            where: { id: existing.id },
            data: payload,
          })
        : await prisma.sellerApplication.create({
            data: payload,
          })

      return res.status(existing ? 200 : 201).json({
        application: sellerApplicationToResponse(application),
        status: application.status,
      })
    } catch (e) {
      console.error('POST /api/seller/application error:', e)
      return res.status(500).json({ error: 'Unable to submit seller verification right now.' })
    }
  })

  router.get('/seller/applications', ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      if (MARKETPLACE_CONSUMER_MODE) {
        return res.json({ applications: [] })
      }
      await ensureSellerApplicationsSeeded()
      const applications = await prisma.sellerApplication.findMany({ orderBy: [{ submittedAt: 'desc' }] })
      return res.json({ applications: applications.map(sellerApplicationToResponse) })
    } catch (e) {
      console.error('GET /api/seller/applications error:', e)
      return res.status(500).json({ error: 'Unable to load seller applications right now.' })
    }
  })

  router.post('/seller/applications/:id/review', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      if (MARKETPLACE_CONSUMER_MODE) {
        return notSupportedInConsumerMode(res, 'Seller verification review is managed through Gang Ledger.')
      }
      const applicationId = String(req.params.id || '').trim()
      if (!applicationId) return res.status(400).json({ error: 'Missing seller application id' })
      const parsed = sellerApplicationReviewSchema.safeParse(req.body || {})
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid seller review payload', details: parsed.error.flatten() })
      }
      const application = await prisma.sellerApplication.findUnique({ where: { id: applicationId } })
      if (!application) return res.status(404).json({ error: 'Seller application not found' })
      const status = parsed.data.action === 'approve' ? 'approved' : 'rejected'
      const updated = await prisma.sellerApplication.update({
        where: { id: applicationId },
        data: {
          status,
          reviewedAt: new Date(),
          reviewerNotes: parsed.data.reviewerNotes ? String(parsed.data.reviewerNotes).trim() : null,
        },
      })
      return res.json({ application: sellerApplicationToResponse(updated), status: updated.status })
    } catch (e) {
      console.error('POST /api/seller/applications/:id/review error:', e)
      return res.status(500).json({ error: 'Unable to review seller application right now.' })
    }
  })

  router.get('/admin/drivers', ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      const drivers = await prisma.user.findMany({ select: { id: true, email: true, name: true, image: true, role: true }, orderBy: { id: 'asc' } })
      res.json(drivers)
    } catch (e) {
      console.error('GET /api/admin/drivers error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  async function fetchProductsWithMeta({ limit } = {}) {
    const take = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : undefined
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take })
    const ownerIds = [...new Set(products.map((p) => p.ownerId).filter((v) => v != null))]
    let ownersMap = new Map()
    let repMap = new Map()
    let avgMap = new Map()
    if (ownerIds.length > 0) {
      const owners = await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true, image: true, paymentInstructions: true } })
      ownersMap = new Map(owners.map((u) => [u.id, u]))
      const reps = await prisma.userReputation.findMany({ where: { userId: { in: ownerIds } } })
      repMap = new Map(reps.map((r) => [r.userId, r]))
      try {
        if (prisma?.orderReview?.groupBy) {
          const avgs = await prisma.orderReview.groupBy({ by: ['sellerId'], where: { sellerId: { in: ownerIds } }, _avg: { rating: true } })
          avgMap = new Map(avgs.map((a) => [a.sellerId, a._avg.rating || 0]))
        } else if (prisma?.orderReview?.aggregate) {
          const avgs = await Promise.all(
            ownerIds.map(async (sellerId) => {
              const r = await prisma.orderReview.aggregate({ where: { sellerId }, _avg: { rating: true } })
              return { sellerId, _avg: { rating: r._avg?.rating || 0 } }
            })
          )
          avgMap = new Map(avgs.map((a) => [a.sellerId, a._avg.rating || 0]))
        }
      } catch (_e) {
        avgMap = new Map()
      }
    }
    return products.map((p) => {
      const owner = ownersMap.get(p.ownerId)
      const rep = repMap.get(p.ownerId)
      const ownerName = owner?.name || (owner?.email ? owner.email.split('@')[0] : undefined)
      const ownerImage = owner?.image || null
      const ownerAvgRating = avgMap.get(p.ownerId) || null
      const negCount = rep?.negativeCount || 0
      const ownerRating = compositeRating(ownerAvgRating ?? 5, negCount)
      return { ...p, ownerName, ownerImage, ownerRating, ownerAvgRating, ownerNegativeCount: negCount, ownerPaymentInstructions: owner?.paymentInstructions || null }
    })
  }

  function sanitiseProductForExternal(product) {
    const image = product.img || imageForServer(product.title, 640, 640)
    const gallery = Array.isArray(product.images) ? product.images.filter(Boolean) : []
    const tags = Array.isArray(product.tags) ? product.tags.filter(Boolean) : []
    const rating = Number.isFinite(product.ownerRating) ? product.ownerRating : product.rating ?? null
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      price: Number(product.price) || 0,
      type: product.type,
      image,
      images: gallery,
      seller: product.ownerName || product.seller || 'Marketplace seller',
      rating,
      tags,
      vertical: product.vertical || 'commerce',
      sharedSpace: product.vertical === 'shared_space' ? product.spaceProfile || null : null,
      owner: product.ownerName
        ? { name: product.ownerName, image: product.ownerImage || null }
        : null,
      updatedAt: product.updatedAt?.toISOString?.() || null,
    }
  }

  async function generateProductSlug(title, preferredSlug) {
    const base = normalizeSlug(preferredSlug || title || 'product', 'product')
    let candidate = base
    let counter = 2
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.product.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${counter}`
      counter += 1
    }
    return candidate
  }

  function normalizeProductRating(value) {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    const rating = Number(value)
    if (!Number.isFinite(rating)) return null
    return Math.max(0, Math.min(5, rating))
  }

  function normalizeProductOwnerId(value) {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    return parseIntOrNull(value, { min: 1 })
  }

  async function buildExternalProductCreateData(input = {}) {
    const title = String(input.title || '').trim()
    if (!title) return { error: 'Product title is required' }

    const vertical = input.vertical === 'shared_space' ? 'shared_space' : 'commerce'
    const spaceProfile = normalizeSpaceProfile(input.spaceProfile)
    const data = {
      slug: await generateProductSlug(title, input.slug),
      title,
      price: parseIntOrDefault(input.price, 0, { min: 0 }),
      seller: String(input.seller || '').trim() || 'External seller',
      rating: normalizeProductRating(input.rating) ?? null,
      type: input.type === 'service' ? 'service' : 'goods',
      img: String(input.img || '').trim() || imageForServer(title),
      barcode: input.barcode === undefined ? null : String(input.barcode || '').trim() || null,
      description: input.description === undefined ? null : String(input.description || '').trim() || null,
      images: normalizeStringArray(input.images),
      stockCount: parseIntOrDefault(input.stockCount, 0, { min: 0 }),
      serviceOpenDays: normalizeOpenDays(input.serviceOpenDays),
      serviceDurationMinutes: parseIntOrNull(input.serviceDurationMinutes, { min: 0 }),
      serviceOpenTime: normalizeTimeString(input.serviceOpenTime),
      serviceCloseTime: normalizeTimeString(input.serviceCloseTime),
      serviceDailyCapacity: parseIntOrNull(input.serviceDailyCapacity, { min: 0 }),
      ownerId: normalizeProductOwnerId(input.ownerId) ?? null,
      categoryId: input.categoryId ? String(input.categoryId).trim() : null,
      vertical,
      spaceProfile: vertical === 'shared_space' ? spaceProfile : null,
    }
    if (vertical === 'shared_space' && spaceProfile) {
      data.price = parseIntOrDefault(spaceProfile.rentPerWeek ?? data.price, 0, { min: 0 })
    }
    return { data }
  }

  function buildExternalProductUpdateData(input = {}) {
    const vertical = input.vertical === undefined ? undefined : (input.vertical === 'shared_space' ? 'shared_space' : 'commerce')
    const spaceProfile = input.spaceProfile === undefined ? undefined : normalizeSpaceProfile(input.spaceProfile)
    const data = stripUndefined({
      slug: input.slug === undefined ? undefined : normalizeSlug(input.slug, 'product'),
      title: input.title === undefined ? undefined : String(input.title || '').trim(),
      price: input.price === undefined ? undefined : parseIntOrDefault(input.price, 0, { min: 0 }),
      seller: input.seller === undefined ? undefined : String(input.seller || '').trim(),
      rating: normalizeProductRating(input.rating),
      type: input.type === undefined ? undefined : (input.type === 'service' ? 'service' : 'goods'),
      img: input.img === undefined ? undefined : String(input.img || '').trim(),
      barcode: input.barcode === undefined ? undefined : String(input.barcode || '').trim() || null,
      description: input.description === undefined ? undefined : String(input.description || '').trim() || null,
      images: input.images === undefined ? undefined : normalizeStringArray(input.images),
      stockCount: input.stockCount === undefined ? undefined : parseIntOrDefault(input.stockCount, 0, { min: 0 }),
      serviceOpenDays: input.serviceOpenDays === undefined ? undefined : normalizeOpenDays(input.serviceOpenDays),
      serviceDurationMinutes:
        input.serviceDurationMinutes === undefined ? undefined : parseIntOrNull(input.serviceDurationMinutes, { min: 0 }),
      serviceOpenTime: input.serviceOpenTime === undefined ? undefined : normalizeTimeString(input.serviceOpenTime),
      serviceCloseTime: input.serviceCloseTime === undefined ? undefined : normalizeTimeString(input.serviceCloseTime),
      serviceDailyCapacity:
        input.serviceDailyCapacity === undefined ? undefined : parseIntOrNull(input.serviceDailyCapacity, { min: 0 }),
      ownerId: normalizeProductOwnerId(input.ownerId),
      categoryId: input.categoryId === undefined ? undefined : (input.categoryId ? String(input.categoryId).trim() : null),
      vertical,
      spaceProfile,
    })
    if (vertical === 'shared_space' && spaceProfile) {
      data.price = parseIntOrDefault(spaceProfile.rentPerWeek ?? data.price ?? input.price, 0, { min: 0 })
    } else if (vertical === 'commerce') {
      data.spaceProfile = spaceProfile ?? null
    }
    return data
  }

  async function findCategoryByIdentifier(identifier) {
    const id = String(identifier || '').trim()
    if (!id) return null
    return prisma.category.findUnique({ where: { id } })
      .then((category) => category || prisma.category.findUnique({ where: { slug: id } }))
  }

  const orderStatusValues = ['pending', 'scheduled', 'paid', 'shipped', 'completed', 'cancelled', 'refunded']

  function normalizeExternalOrderStatus(status, fallback) {
    if (status === undefined) return fallback
    const next = String(status || '').trim()
    return orderStatusValues.includes(next) ? next : fallback
  }

  function normalizeExternalOrderItems(items) {
    if (!Array.isArray(items)) return []
    return items
      .map((item) => {
        const productId = String(item?.productId || '').trim()
        const title = String(item?.title || '').trim()
        if (!productId || !title) return null
        const appointmentAt = item.appointmentAt ? new Date(item.appointmentAt) : null
        return {
          productId,
          title,
          price: parseIntOrDefault(item.price, 0, { min: 0 }),
          quantity: Math.max(1, parseIntOrDefault(item.quantity, 1, { min: 1 })),
          appointmentAt: appointmentAt && !Number.isNaN(appointmentAt.getTime()) ? appointmentAt : null,
          appointmentStatus: item.appointmentStatus ? String(item.appointmentStatus).trim() : null,
          appointmentAlternates: Array.isArray(item.appointmentAlternates) ? JSON.stringify(item.appointmentAlternates) : null,
        }
      })
      .filter(Boolean)
  }

  function buildExternalOrderPatch(input = {}, { fallbackStatus } = {}) {
    return stripUndefined({
      buyerId: normalizeProductOwnerId(input.buyerId),
      sellerId: normalizeProductOwnerId(input.sellerId),
      total: input.total === undefined ? undefined : parseIntOrDefault(input.total, 0, { min: 0 }),
      status: normalizeExternalOrderStatus(input.status, fallbackStatus),
      customerName: input.customerName === undefined ? undefined : String(input.customerName || '').trim() || null,
      customerEmail: input.customerEmail === undefined ? undefined : String(input.customerEmail || '').trim() || null,
      address: input.address === undefined ? undefined : String(input.address || '').trim() || null,
      customerPhone: input.customerPhone === undefined ? undefined : String(input.customerPhone || '').trim() || null,
      paymentInstructions:
        input.paymentInstructions === undefined ? undefined : String(input.paymentInstructions || '').trim() || null,
      accessCode: input.accessCode === undefined ? undefined : String(input.accessCode || '').trim() || null,
    })
  }

  function getExternalActorUserId(req) {
    const candidate = Number(req.externalAuth?.user?.id)
    return Number.isFinite(candidate) && candidate > 0 ? candidate : null
  }

  function isOAuthUserScopedRequest(req) {
    return req.externalAuth?.kind === 'oauth_token' && Number.isFinite(Number(req.externalAuth?.user?.id))
  }

  function buildSellerOrderWhere(userId) {
    return {
      OR: [
        { sellerId: userId },
        { items: { some: { product: { ownerId: userId } } } },
      ],
    }
  }

  router.get('/products', async (req, res) => {
    try {
      const enriched = await fetchProductsWithMeta({ limit: req.query.limit })
      res.json(enriched)
    } catch (e) {
      console.error('GET /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })
  
  // Fetch a product by barcode
  router.get('/products/barcode/:code', async (req, res) => {
    try {
      const code = String(req.params.code || '').trim()
      if (!code) return res.status(400).json({ error: 'Missing barcode' })
      const p = await prisma.product.findFirst({ where: { barcode: code } })
      if (!p) return res.status(404).json({ error: 'Not found' })
      res.json(p)
    } catch (e) {
      console.error('GET /api/products/barcode/:code error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/products', requireApiScope('products:read'), async (req, res) => {
    try {
      const enriched = await fetchProductsWithMeta({ limit: req.query.limit })
      const payload = enriched.map(sanitiseProductForExternal)
      res.json({ products: payload })
    } catch (e) {
      console.error('GET /api/external/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/products/:id', requireApiScope('products:read'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing product id' })
      const enriched = await fetchProductsWithMeta()
      const match = enriched.find((item) => item.id === id || item.slug === id)
      if (!match) return res.status(404).json({ error: 'Not found' })
      res.json({ product: sanitiseProductForExternal(match) })
    } catch (e) {
      console.error('GET /api/external/products/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/external/products', requireApiScope('products:write'), async (req, res) => {
    try {
      const built = await buildExternalProductCreateData(req.body || {})
      if (built.error) return res.status(400).json({ error: built.error })
      if (isOAuthUserScopedRequest(req)) {
        built.data.ownerId = getExternalActorUserId(req)
      }
      const created = await prisma.product.create({ data: built.data })
      res.status(201).json({ product: sanitiseProductForExternal(created) })
    } catch (e) {
      console.error('POST /api/external/products error:', e)
      if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate product slug or barcode' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/external/products/:id', requireApiScope('products:write'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing product id' })
      const data = buildExternalProductUpdateData(req.body || {})
      if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No product fields supplied' })
      const where = isOAuthUserScopedRequest(req)
        ? { AND: [{ OR: [{ id }, { slug: id }] }, { ownerId: getExternalActorUserId(req) }] }
        : { OR: [{ id }, { slug: id }] }
      const existing = await prisma.product.findFirst({ where })
      if (!existing) return res.status(404).json({ error: 'Product not found' })
      if (isOAuthUserScopedRequest(req)) delete data.ownerId
      const updated = await prisma.product.update({ where: { id: existing.id }, data })
      res.json({ product: sanitiseProductForExternal(updated) })
    } catch (e) {
      console.error('PUT /api/external/products/:id error:', e)
      if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate product slug or barcode' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/external/products/:id', requireApiScope('products:write'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing product id' })
      const where = isOAuthUserScopedRequest(req)
        ? { AND: [{ OR: [{ id }, { slug: id }] }, { ownerId: getExternalActorUserId(req) }] }
        : { OR: [{ id }, { slug: id }] }
      const existing = await prisma.product.findFirst({ where })
      if (!existing) return res.status(404).json({ error: 'Product not found' })
      await prisma.product.delete({ where: { id: existing.id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/external/products/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/categories', requireApiScope('categories:read'), async (_req, res) => {
    try {
      const records = await prisma.category.findMany({ orderBy: { name: 'asc' } })
      res.json({ categories: records.map((item) => item.name).filter(Boolean), records })
    } catch (e) {
      console.error('GET /api/external/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/external/categories', requireApiScope('categories:write'), async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim()
      if (!name) return res.status(400).json({ error: 'Category name is required' })
      const slug = normalizeSlug(req.body?.slug || name, 'category')
      const category = await prisma.category.create({ data: { name, slug } })
      res.status(201).json({ category })
    } catch (e) {
      console.error('POST /api/external/categories error:', e)
      if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate category slug' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/external/categories/:id', requireApiScope('categories:write'), async (req, res) => {
    try {
      const category = await findCategoryByIdentifier(req.params.id)
      if (!category) return res.status(404).json({ error: 'Category not found' })
      const data = stripUndefined({
        name: req.body?.name === undefined ? undefined : String(req.body.name || '').trim(),
        slug: req.body?.slug === undefined ? undefined : normalizeSlug(req.body.slug, 'category'),
      })
      if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No category fields supplied' })
      const updated = await prisma.category.update({ where: { id: category.id }, data })
      res.json({ category: updated })
    } catch (e) {
      console.error('PUT /api/external/categories/:id error:', e)
      if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate category slug' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/external/categories/:id', requireApiScope('categories:write'), async (req, res) => {
    try {
      const category = await findCategoryByIdentifier(req.params.id)
      if (!category) return res.status(404).json({ error: 'Category not found' })
      await prisma.category.delete({ where: { id: category.id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/external/categories/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/orders', requireApiScope('orders:read'), async (req, res) => {
    try {
      const take = Number.isFinite(Number(req.query.limit)) && Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : undefined
      const status = req.query.status ? normalizeExternalOrderStatus(req.query.status) : undefined
      let where
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        const mode = String(req.query.mode || 'all').trim().toLowerCase()
        const branches = []
        if (mode === 'buyer' || mode === 'all') branches.push({ buyerId: userId })
        if (mode === 'seller' || mode === 'all') branches.push(buildSellerOrderWhere(userId))
        where = { ...(status ? { status } : {}), OR: branches }
      } else {
        where = stripUndefined({
          buyerId: req.query.buyerId ? Number(req.query.buyerId) : undefined,
          sellerId: req.query.sellerId ? Number(req.query.sellerId) : undefined,
          status,
        })
      }
      const orders = await prisma.order.findMany({
        where,
        take,
        orderBy: { createdAt: 'desc' },
        include: { items: true, buyer: true, seller: true },
      })
      res.json({ orders })
    } catch (e) {
      console.error('GET /api/external/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/orders/:id', requireApiScope('orders:read'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing order id' })
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, buyer: true, seller: true },
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        const canAccess = order.buyerId === userId || order.sellerId === userId || order.items.some((item) => item.product?.ownerId === userId)
        if (!canAccess) return res.status(403).json({ error: 'Forbidden' })
      }
      res.json({ order })
    } catch (e) {
      console.error('GET /api/external/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/external/orders', requireApiScope('orders:write'), async (req, res) => {
    try {
      const items = normalizeExternalOrderItems(req.body?.items)
      if (Array.isArray(req.body?.items) && req.body.items.length !== items.length) {
        return res.status(400).json({ error: 'Every order item requires productId and title' })
      }
      const data = buildExternalOrderPatch(req.body || {}, { fallbackStatus: 'pending' })
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        data.sellerId = data.sellerId ?? userId
      }
      data.total = data.total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      if (items.length) data.items = { create: items }
      const order = await prisma.order.create({
        data,
        include: { items: true, buyer: true, seller: true },
      })
      res.status(201).json({ order })
    } catch (e) {
      console.error('POST /api/external/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/external/orders/:id', requireApiScope('orders:write'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing order id' })
      const exists = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      })
      if (!exists) return res.status(404).json({ error: 'Order not found' })
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        const canAccess = exists.buyerId === userId || exists.sellerId === userId || exists.items.some((item) => item.product?.ownerId === userId)
        if (!canAccess) return res.status(403).json({ error: 'Forbidden' })
      }
      const items = req.body?.items === undefined ? undefined : normalizeExternalOrderItems(req.body.items)
      if (Array.isArray(req.body?.items) && req.body.items.length !== items.length) {
        return res.status(400).json({ error: 'Every order item requires productId and title' })
      }
      const data = buildExternalOrderPatch(req.body || {}, { fallbackStatus: undefined })
      if (isOAuthUserScopedRequest(req)) {
        delete data.buyerId
        delete data.sellerId
      }
      if (items) data.total = data.total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      const updateOrder = async (tx) => {
        if (items) await tx.orderItem.deleteMany({ where: { orderId: id } })
        return tx.order.update({
          where: { id },
          data: items ? { ...data, items: { create: items } } : data,
          include: { items: true, buyer: true, seller: true },
        })
      }
      const order = prisma.$transaction ? await prisma.$transaction(updateOrder) : await updateOrder(prisma)
      res.json({ order })
    } catch (e) {
      console.error('PUT /api/external/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/external/orders/:id', requireApiScope('orders:write'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing order id' })
      if (isOAuthUserScopedRequest(req)) {
        const order = await prisma.order.findUnique({
          where: { id },
          include: { items: { include: { product: true } } },
        })
        if (!order) return res.status(404).json({ error: 'Order not found' })
        const userId = getExternalActorUserId(req)
        const canAccess = order.buyerId === userId || order.sellerId === userId || order.items.some((item) => item.product?.ownerId === userId)
        if (!canAccess) return res.status(403).json({ error: 'Forbidden' })
      }
      await prisma.order.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/external/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/sales/summary', requireApiScope('sales:read'), async (req, res) => {
    try {
      const ownerId = isOAuthUserScopedRequest(req) ? getExternalActorUserId(req) : normalizeProductOwnerId(req.query.ownerId)
      if (!ownerId) return res.status(400).json({ error: 'ownerId required' })
      const orders = await prisma.order.findMany({
        where: buildSellerOrderWhere(ownerId),
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const revenueOrders = orders.filter((order) => ['paid', 'shipped', 'completed'].includes(order.status))
      const refundedOrders = orders.filter((order) => order.status === 'refunded')
      const summary = {
        ownerId,
        orderCount: orders.length,
        revenueOrderCount: revenueOrders.length,
        refundedOrderCount: refundedOrders.length,
        totalRevenue: revenueOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        totalRefunded: refundedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        latestOrderAt: orders[0]?.createdAt?.toISOString?.() || null,
      }
      res.json({ summary, orders })
    } catch (e) {
      console.error('GET /api/external/sales/summary error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/external/refunds', requireApiScope('refunds:read'), async (req, res) => {
    try {
      const scope = String(req.query.scope || 'all').trim().toLowerCase()
      let where = {}
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        if (scope === 'buyer') where = { buyerId: userId }
        else if (scope === 'seller') where = { sellerId: userId }
        else where = { OR: [{ buyerId: userId }, { sellerId: userId }] }
      }
      const refunds = await prisma.refundRequest.findMany({
        where,
        include: { order: true, orderItem: true, buyer: true, seller: true },
        orderBy: { createdAt: 'desc' },
      })
      res.json({ refunds })
    } catch (e) {
      console.error('GET /api/external/refunds error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/external/orders/:id/refund', requireApiScope('refunds:write'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing order id' })
      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      const reason = String(req.body?.reason || '').trim()
      if (!reason) return res.status(400).json({ error: 'Refund reason required' })

      let buyerId = normalizeProductOwnerId(req.body?.buyerId) ?? order.buyerId ?? null
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        if (order.buyerId && order.buyerId !== userId) return res.status(403).json({ error: 'Only the buyer can create this refund request' })
        buyerId = userId
      }
      if (!buyerId) return res.status(400).json({ error: 'buyerId required for refund creation' })

      const refund = await prisma.refundRequest.create({
        data: {
          orderId: order.id,
          orderItemId: req.body?.orderItemId ? String(req.body.orderItemId).trim() : null,
          buyerId,
          sellerId: order.sellerId ?? null,
          amount: req.body?.amount == null ? null : parseIntOrDefault(req.body.amount, 0, { min: 0 }),
          reason,
          status: 'requested',
        },
        include: { order: true, orderItem: true, buyer: true, seller: true },
      })
      res.status(201).json({ refund })
    } catch (e) {
      console.error('POST /api/external/orders/:id/refund error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/external/refunds/:id/review', requireApiScope('refunds:write'), async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Missing refund id' })
      const refund = await prisma.refundRequest.findUnique({ where: { id }, include: { order: true, buyer: true, seller: true } })
      if (!refund) return res.status(404).json({ error: 'Refund not found' })
      if (isOAuthUserScopedRequest(req)) {
        const userId = getExternalActorUserId(req)
        if (refund.sellerId && refund.sellerId !== userId) return res.status(403).json({ error: 'Only the seller can review this refund request' })
      }

      const action = String(req.body?.action || '').trim().toLowerCase()
      if (!['accept', 'reject', 'refund'].includes(action)) return res.status(400).json({ error: 'Invalid refund action' })
      const nextStatus = action === 'accept' ? 'accepted' : action === 'refund' ? 'refunded' : 'rejected'
      const updated = await prisma.refundRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          resolution: req.body?.notes ? String(req.body.notes).trim() : refund.resolution,
          amount: req.body?.amount == null ? refund.amount : parseIntOrDefault(req.body.amount, 0, { min: 0 }),
        },
        include: { order: true, orderItem: true, buyer: true, seller: true },
      })
      if (['accepted', 'refunded'].includes(updated.status)) {
        await prisma.order.update({ where: { id: updated.orderId }, data: { status: 'refunded' } }).catch(() => {})
      }
      res.json({ refund: updated })
    } catch (e) {
      console.error('POST /api/external/refunds/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/land/listings', async (_req, res) => {
    try {
      await ensureLandListingsSeeded()
      const listings = await prisma.landListing.findMany({ orderBy: { createdAt: 'desc' } })
      res.json({ listings: listings.map(landRecordToResponse) })
    } catch (e) {
      console.error('GET /api/land/listings error:', e)
      res.status(500).json({ error: 'Unable to load real estate listings right now.' })
    }
  })

  router.get('/land/listings/:slug', async (req, res) => {
    try {
      const slug = String(req.params.slug || '').trim()
      if (!slug) return res.status(400).json({ error: 'Missing real estate listing slug' })
      const listing = await prisma.landListing.findUnique({ where: { slug } })
      if (!listing) return res.status(404).json({ error: 'Real estate listing not found' })
      res.json({ listing: landRecordToResponse(listing) })
    } catch (e) {
      console.error('GET /api/land/listings/:slug error:', e)
      res.status(500).json({ error: 'Unable to fetch real estate listing yet.' })
    }
  })

  router.post('/land/listings', ensureAuth, async (req, res) => {
    try {
      const parsed = landListingInputSchema.safeParse(req.body || {})
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid real estate listing payload', details: parsed.error.flatten() })
      }
      const slug = await generateLandSlug(parsed.data.title, parsed.data.town)
      const data = buildLandListingData(parsed.data, { slug })
      const created = await prisma.landListing.create({ data })
      return res.status(201).json({ listing: landRecordToResponse(created) })
    } catch (e) {
      console.error('POST /api/land/listings error:', e)
      return res.status(500).json({ error: 'Unable to save real estate listing yet.' })
    }
  })

  async function fetchServiceAvailability(product, startDate, rangeDays) {
    const start = startOfDay(startDate)
    const span = Number.isFinite(rangeDays) && rangeDays > 0 ? Math.min(rangeDays, 90) : 14
    const end = addDays(start, span)
    const openDays = product.serviceOpenDays?.length ? product.serviceOpenDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const openTime = product.serviceOpenTime || '09:00'
    const closeTime = product.serviceCloseTime || '17:00'
    const durationMinutes = Math.max(15, product.serviceDurationMinutes || 60)
    const durationMs = durationMinutes * 60 * 1000
    let exampleOpen = combineDateAndTime(start, openTime)
    let exampleClose = combineDateAndTime(start, closeTime)
    if (exampleClose <= exampleOpen) exampleClose = new Date(exampleOpen.getTime() + durationMs)
    const slotsPerDay = Math.max(1, Math.floor((exampleClose.getTime() - exampleOpen.getTime()) / durationMs))
    const existingBookings = await prisma.orderItem.findMany({
      where: {
        productId: product.id,
        appointmentAt: { not: null, gte: start, lt: end },
        appointmentStatus: { notIn: ['cancelled', 'rejected'] },
      },
      select: { id: true, appointmentAt: true },
    })
    const bookingsByDay = new Map()
    for (const booking of existingBookings) {
      if (!booking.appointmentAt) continue
      const at = new Date(booking.appointmentAt)
      const dayKey = at.toISOString().slice(0, 10)
      const slotKeyDate = new Date(at)
      slotKeyDate.setSeconds(0, 0)
      const slotKey = slotKeyDate.getTime()
      if (!bookingsByDay.has(dayKey)) bookingsByDay.set(dayKey, { total: 0, slots: new Map() })
      const entry = bookingsByDay.get(dayKey)
      entry.total += 1
      entry.slots.set(slotKey, (entry.slots.get(slotKey) || 0) + 1)
    }

    const days = []
    for (let offset = 0; offset < span; offset += 1) {
      const dayDate = addDays(start, offset)
      const dayKey = dayDate.toISOString().slice(0, 10)
      const weekday = WEEKDAY_FROM_INDEX[dayDate.getDay()]
      const isOpen = openDays.includes(weekday)
      const booked = bookingsByDay.get(dayKey) || { total: 0, slots: new Map() }
      let dayOpen = combineDateAndTime(dayDate, openTime)
      let dayClose = combineDateAndTime(dayDate, closeTime)
      if (dayClose <= dayOpen) dayClose = new Date(dayOpen.getTime() + durationMs)
      const maxSlots = Math.max(1, Math.floor((dayClose.getTime() - dayOpen.getTime()) / durationMs))
      const dailyCapacity = product.serviceDailyCapacity ?? maxSlots
      const effectiveSlots = Math.min(maxSlots, dailyCapacity)
      const slots = []
      if (isOpen) {
        let slotIndex = 0
        let cursor = new Date(dayOpen)
        while (cursor < dayClose && slotIndex < effectiveSlots) {
          const slotStart = new Date(cursor)
          const slotEnd = new Date(cursor.getTime() + durationMs)
          const slotKey = slotStart.getTime()
          const slotBookings = booked.slots.get(slotKey) || 0
          const available = slotBookings === 0 && booked.total < dailyCapacity
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available,
            booked: slotBookings,
          })
          cursor = new Date(cursor.getTime() + durationMs)
          slotIndex += 1
        }
      }
      const remaining = Math.max(0, dailyCapacity - (booked.total || 0))
      days.push({
        date: dayKey,
        weekday,
        isOpen,
        remaining,
        capacity: dailyCapacity,
        slots,
      })
  }

  return {
    productId: product.id,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    openTime,
    closeTime,
    openDays,
    days,
  }
}

  const ASSISTANT_INFO_FIELDS = [
    'customer_name',
    'customer_email',
    'customer_phone',
    'address',
    'service_time',
    'product_preference',
    'budget',
  ]

  const AssistantAttachmentSchema = z.object({
    name: z.string().min(1).max(200),
    type: z.string().min(1),
    size: z.number().int().min(1).max(5 * 1024 * 1024),
    data: z.string().min(1),
  })

  const AssistantCartItemInputSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).default(1),
    appointmentSlot: z.string().optional(),
    note: z.string().optional(),
  })

  const AssistantRecommendationSchema = z.object({
    productId: z.string().min(1),
    reason: z.string().optional(),
    matchScore: z.number().optional(),
  })

  const AssistantPendingInfoSchema = z.object({
    fields: z.array(z.enum(ASSISTANT_INFO_FIELDS)).min(1),
    reason: z.string().optional(),
  })

  const AssistantAppointmentSchema = z.object({
    productId: z.string().min(1),
    slot: z.string().min(1),
    status: z.string().optional(),
    orderId: z.string().optional(),
    note: z.string().optional(),
  })

  const AssistantOrderSummarySchema = z.object({
    id: z.string().min(1),
    total: z.number(),
    status: z.string().min(1),
    paymentInstructions: z.string().optional(),
    accessCode: z.string().optional(),
    createdAt: z.string().optional(),
  })

  const SalesAssistantStateSchema = z.object({
    cart: z.array(AssistantCartItemInputSchema).default([]),
    recommendations: z.array(AssistantRecommendationSchema).default([]),
    orders: z.array(AssistantOrderSummarySchema).default([]),
    appointments: z.array(AssistantAppointmentSchema).default([]),
    pendingInfoRequests: z.array(AssistantPendingInfoSchema).default([]),
    metadata: z.record(z.any()).optional(),
  })

  const AssistantConversationMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    actions: z.any().optional(),
    createdAt: z.string().optional(),
  })

  const AssistantCartItemForOrderSchema = AssistantCartItemInputSchema.extend({
    quantity: AssistantCartItemInputSchema.shape.quantity.default(1),
  })

  const SalesAssistantActionSchema = z.discriminatedUnion('type', [
    z.object({
      type: z.literal('recommend_products'),
      products: z.array(AssistantRecommendationSchema).min(1),
    }),
    z.object({
      type: z.literal('add_to_cart'),
      items: z.array(AssistantCartItemInputSchema).min(1),
      replace: z.boolean().optional(),
    }),
    z.object({
      type: z.literal('book_service'),
      productId: z.string().min(1),
      slot: z.string().min(1),
      note: z.string().optional(),
    }),
    z.object({
      type: z.literal('create_order'),
      items: z.array(AssistantCartItemForOrderSchema).min(1).optional(),
      useCart: z.boolean().optional(),
      customerName: z.string().optional(),
      customerEmail: z.string().optional(),
      customerPhone: z.string().optional(),
      address: z.string().optional(),
      note: z.string().optional(),
    }),
    z.object({
      type: z.literal('ask_information'),
      fields: z.array(z.enum(ASSISTANT_INFO_FIELDS)).min(1),
      reason: z.string().optional(),
    }),
    z.object({
      type: z.literal('clear_cart'),
      note: z.string().optional(),
    }),
    z.object({
      type: z.literal('update_metadata'),
      patch: z.record(z.any()),
      scope: z.string().optional(),
    }),
  ])

  const AssistantLLMResponseSchema = z.object({
    reply: z.string(),
    actions: z.array(SalesAssistantActionSchema).default([]),
    suggestions: z.array(z.string()).default([]),
    summary: z.string().optional(),
    sentiment: z.string().optional(),
  })

  function normalizeAssistantResponse(raw) {
    if (!raw || typeof raw !== 'object') return raw
    const normalized = { ...raw }
    normalized.actions = normalizeAssistantActions(raw.actions)
    normalized.suggestions = Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((item) => typeof item === 'string')
      : []
    normalized.reply = typeof raw.reply === 'string' ? raw.reply : String(raw.reply ?? '')
    return normalized
  }

  function normalizeAssistantActions(actions) {
    if (!Array.isArray(actions)) return []
    return actions
      .map((action) => {
        if (!action || typeof action !== 'object') return action
        if (typeof action.action === 'string' && !action.type) {
          const rawType = String(action.action)
          const value = Object.prototype.hasOwnProperty.call(action, rawType) ? action[rawType] : action
          switch (rawType) {
            case 'recommend_products': {
              const products = Array.isArray(value)
                ? value
                : value && typeof value === 'object'
                  ? Array.isArray(value.products)
                    ? value.products
                    : value.productId
                      ? [{ productId: value.productId, reason: value.reason }]
                      : []
                  : []
              return { type: 'recommend_products', products }
            }
            case 'add_to_cart': {
              let itemsArray = []
              if (Array.isArray(value)) {
                itemsArray = value
              } else if (value && typeof value === 'object') {
                const entry = normalizeCartItem(value)
                if (entry) itemsArray = [entry]
              }
              if (!itemsArray.length) return null
              return { type: 'add_to_cart', items: itemsArray, replace: Boolean(value?.replace) }
            }
            case 'book_service': {
              if (value && typeof value === 'object') {
                return {
                  type: 'book_service',
                  productId: value.productId,
                  slot: value.slot ?? value.appointmentSlot,
                  note: value.note,
                }
              }
              return null
            }
            case 'create_order': {
              if (value && typeof value === 'object') {
                return {
                  type: 'create_order',
                  items: Array.isArray(value.items) ? value.items : undefined,
                  useCart: value.useCart,
                  customerName: value.customerName,
                  customerEmail: value.customerEmail,
                  customerPhone: value.customerPhone,
                  address: value.address,
                  note: value.note,
                }
              }
              return null
            }
            case 'ask_information': {
              if (value && typeof value === 'object') {
                return { type: 'ask_information', fields: Array.isArray(value.fields) ? value.fields : [], reason: value.reason }
              }
              if (Array.isArray(value)) {
                return { type: 'ask_information', fields: value, reason: undefined }
              }
              return null
            }
            case 'clear_cart':
              return { type: 'clear_cart', note: value?.note }
            case 'update_metadata': {
              if (value && typeof value === 'object') {
                return { type: 'update_metadata', patch: value.patch || value, scope: value.scope }
              }
              return null
            }
            default:
              return null
          }
        }
        if ('type' in action) return action
        const keys = Object.keys(action).filter((key) => typeof key === 'string')
        if (keys.length !== 1) return action
        const key = keys[0]
        const value = action[key]
        switch (key) {
          case 'recommend_products':
            return {
              type: 'recommend_products',
              products: Array.isArray(value) ? value : [],
            }
          case 'add_to_cart': {
            const payload = Array.isArray(value)
              ? { items: value, replace: false }
              : typeof value === 'object' && value !== null
                ? {
                    items: Array.isArray(value.items) ? value.items : [],
                    replace: Boolean(value.replace),
                  }
                : { items: [] }
            return { type: 'add_to_cart', ...payload }
          }
          case 'book_service': {
            if (Array.isArray(value) && value.length > 0) {
              const entry = value[0]
              return {
                type: 'book_service',
                productId: entry?.productId,
                slot: entry?.slot,
                note: entry?.note,
              }
            }
            if (value && typeof value === 'object') {
              return {
                type: 'book_service',
                productId: value.productId,
                slot: value.slot,
                note: value.note,
              }
            }
            break
          }
          case 'create_order': {
            if (Array.isArray(value) && value.length > 0) {
              return { type: 'create_order', items: value }
            }
            if (value && typeof value === 'object') {
              return {
                type: 'create_order',
                items: Array.isArray(value.items) ? value.items : undefined,
                useCart: value.useCart,
                customerName: value.customerName,
                customerEmail: value.customerEmail,
                customerPhone: value.customerPhone,
                address: value.address,
                note: value.note,
              }
            }
            break
          }
          case 'ask_information': {
            if (Array.isArray(value)) {
              return { type: 'ask_information', fields: value, reason: undefined }
            }
            if (value && typeof value === 'object') {
              return { type: 'ask_information', fields: Array.isArray(value.fields) ? value.fields : [], reason: value.reason }
            }
            break
          }
          case 'clear_cart': {
            if (value && typeof value === 'object') {
              return { type: 'clear_cart', note: value.note }
            }
            return { type: 'clear_cart' }
          }
          case 'update_metadata': {
            if (value && typeof value === 'object') {
              return { type: 'update_metadata', patch: value.patch || value, scope: value.scope }
            }
            return null
          }
          default:
            return action
        }
        return action
      })
      .filter(Boolean)
  }

  function normalizeCartItem(value) {
    if (!value || typeof value !== 'object') return null
    const productId = value.productId ?? value.id
    if (!productId) return null
    const qty = Number(value.quantity)
    const quantity = Number.isFinite(qty) ? Math.max(1, Math.trunc(qty)) : 1
    return {
      productId: String(productId),
      quantity,
      appointmentSlot: value.appointmentSlot ?? value.slot ?? undefined,
      note: value.note ?? undefined,
    }
  }

  function safeParseAssistant(raw) {
    const normalized = normalizeAssistantResponse(raw)
    const parsed = AssistantLLMResponseSchema.safeParse(normalized)
    if (parsed.success) return { data: parsed.data, normalized, warning: null }
    const fallback = {
      reply: typeof normalized?.reply === 'string' ? normalized.reply : '',
      actions: [],
      suggestions: Array.isArray(normalized?.suggestions) ? normalized.suggestions.filter((item) => typeof item === 'string') : [],
      summary: typeof normalized?.summary === 'string' ? normalized.summary : undefined,
      sentiment: typeof normalized?.sentiment === 'string' ? normalized.sentiment : undefined,
    }
    return { data: AssistantLLMResponseSchema.parse(fallback), normalized, warning: parsed.error }
  }

  const SalesAssistantRequestSchema = z.object({
    message: z.string().min(1),
    conversation: z.array(AssistantConversationMessageSchema).max(30).default([]),
    state: SalesAssistantStateSchema.optional(),
    customer: z
      .object({
        id: z.number().int().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    attachments: z.array(AssistantAttachmentSchema).max(3).optional(),
  })

  function cloneAssistantState(state) {
    if (!state) return { cart: [], recommendations: [], orders: [], appointments: [], pendingInfoRequests: [] }
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(state)
      } catch (e) {
        console.error('structuredClone failed for assistant state:', e)
      }
    }
    return JSON.parse(JSON.stringify(state))
  }

  function randomAssistantAccessCode() {
    return randomBytes(12).toString('hex')
  }

  const assistantFallbackCatalog = [
    {
      id: 'demo-anc-headphones',
      slug: 'demo-anc-headphones',
      title: 'Wireless ANC Headphones',
      price: 229,
      type: 'goods',
      seller: 'Nova Audio',
      rating: 4.8,
      vertical: 'commerce',
      image: imageForServer('modern headphones product', 640, 640),
      description: 'Immersive over-ear wireless headphones with adaptive noise cancelling and 28-hour battery life.',
      stockCount: 38,
      tags: ['audio', 'electronics'],
      paymentInstructions: 'Bank transfer — BSB 123-456, Account 987654. Use your order ID as the reference.',
    },
    {
      id: 'demo-smartphone-128',
      slug: 'demo-smartphone-128',
      title: 'Smartphone 128GB',
      price: 699,
      type: 'goods',
      seller: 'Metro Gadgets',
      rating: 4.7,
      vertical: 'commerce',
      image: imageForServer('modern smartphone product', 640, 640),
      description: '6.7" OLED display, triple camera system, and 128GB storage. Ships unlocked with 24-month warranty.',
      stockCount: 22,
      tags: ['electronics', 'mobile'],
      paymentInstructions: 'Pay seller via PayID gadgetspay@metro.example. Include your order ID in the note.',
    },
    {
      id: 'demo-cleaning-2h',
      slug: 'demo-cleaning-2h',
      title: 'Apartment Cleaning (2h)',
      price: 89,
      type: 'service',
      seller: 'Sparkle Pro',
      rating: 4.9,
      vertical: 'commerce',
      image: imageForServer('apartment cleaning service', 640, 640),
      description: 'Two-hour professional clean covering kitchen, bathroom, and living spaces. Eco-friendly supplies included.',
      service: {
        openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        openTime: '09:00',
        closeTime: '18:00',
        durationMinutes: 120,
        dailyCapacity: 4,
        availability: {
          days: ['2025-01-10T09:00:00Z', '2025-01-10T11:30:00Z', '2025-01-11T09:00:00Z'],
        },
      },
      tags: ['home', 'service'],
      paymentInstructions: '50% deposit via bank transfer (BSB 082-123, Account 445566) within 24h to confirm the slot.',
    },
    {
      id: 'demo-portrait-photo',
      slug: 'demo-portrait-photo',
      title: 'Portrait Photography (1h)',
      price: 150,
      type: 'service',
      seller: 'LensCraft',
      rating: 4.8,
      vertical: 'commerce',
      image: imageForServer('portrait photography studio', 640, 640),
      description: 'Studio portrait session with professional lighting, 10 retouched images delivered within 72 hours.',
      service: {
        openDays: ['wednesday', 'thursday', 'friday', 'saturday'],
        openTime: '10:00',
        closeTime: '17:00',
        durationMinutes: 60,
        dailyCapacity: 5,
        availability: {
          days: ['2025-01-11T10:00:00Z', '2025-01-11T12:00:00Z', '2025-01-12T14:00:00Z'],
        },
      },
      tags: ['creative', 'service'],
      paymentInstructions: 'Pay in full via PayPal to portraits@lenscraft.example or bank transfer referencing your order.',
    },
    {
      id: 'demo-space-surry',
      slug: 'surry-hills-terrace',
      title: 'Room in Surry Hills terrace',
      price: 420,
      type: 'service',
      seller: 'Mia (Host)',
      rating: 4.9,
      vertical: 'shared_space',
      image: imageForServer('sunny sharehouse bedroom surry hills', 640, 480),
      description: 'Light-filled queen room with creative housemates, courtyard dinners, and fibre internet.',
      spaceProfile: {
        type: 'room',
        rentPerWeek: 420,
        bond: 840,
        suburb: 'Surry Hills',
        city: 'Sydney',
        state: 'NSW',
        availableFrom: '2025-12-01',
        stayLength: '6-12 months',
        occupancy: { current: 2, total: 3 },
        furnished: true,
        amenities: ['Queen bed', 'High-speed fibre', 'Cleaner included'],
        vibe: ['Design crew', 'Pet friendly'],
        host: { name: 'Mia', avatar: imageForServer('creative host portrait', 200, 200), bio: 'Product designer & weekend market lover.' },
        conciergeIntro: 'Looking for a respectful founder/creator who enjoys community dinners and hybrid work.',
      },
      paymentInstructions: 'Bond and first week rent by bank transfer (BSB 013-999, Account 112233). Email remittance to Mia.',
    },
    {
      id: 'demo-space-loft',
      slug: 'fintech-loft-desk',
      title: 'Desk in fintech founder loft',
      price: 180,
      type: 'service',
      seller: 'Arjun (Host)',
      rating: 4.8,
      vertical: 'shared_space',
      image: imageForServer('modern loft workspace', 640, 480),
      description: 'Dedicated desk inside a Collingwood loft with fellow operators, podcast booth, and investor demo nights.',
      spaceProfile: {
        type: 'desk',
        rentPerWeek: 180,
        suburb: 'Collingwood',
        city: 'Melbourne',
        state: 'VIC',
        availableFrom: '2025-11-20',
        stayLength: 'Flexible / month-to-month',
        occupancy: { current: 4, total: 6 },
        furnished: true,
        amenities: ['27" monitor', 'Meeting pods', 'Locker storage'],
        vibe: ['Operator community', 'Late-night builds'],
        host: { name: 'Arjun', avatar: imageForServer('startup founder portrait', 200, 200), bio: 'Cofounder at LoopPay. Loves dumpling runs.' },
        conciergeIntro: 'Great for fintech or marketplace teams needing a plugged-in desk with instant community.',
      },
      paymentInstructions: 'Pay monthly via Stripe invoice or bank transfer (BSB 032-111, Account 556677). Include desk ID.',
    },
  ]

  async function loadAssistantCatalog({ limit = 25 } = {}) {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { category: { select: { name: true } } },
    })
    if (!products.length) {
      return { list: [], map: new Map() }
    }

    const ownerIds = [...new Set(products.map((p) => p.ownerId).filter((v) => v != null))]
    let ownersMap = new Map()
    let repMap = new Map()
    let avgMap = new Map()
    if (ownerIds.length > 0) {
      const owners = await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true, paymentInstructions: true } })
      ownersMap = new Map(owners.map((u) => [u.id, u]))
      const reps = await prisma.userReputation.findMany({ where: { userId: { in: ownerIds } } })
      repMap = new Map(reps.map((r) => [r.userId, r]))
      try {
        if (prisma?.orderReview?.groupBy) {
          const avgs = await prisma.orderReview.groupBy({ by: ['sellerId'], where: { sellerId: { in: ownerIds } }, _avg: { rating: true } })
          avgMap = new Map(avgs.map((a) => [a.sellerId, a._avg.rating || 0]))
        }
      } catch {}
    }

    const enriched = []
    for (const product of products) {
      const owner = ownersMap.get(product.ownerId)
      const rep = repMap.get(product.ownerId)
      const ownerAvgRating = avgMap.get(product.ownerId) || null
      const negCount = rep?.negativeCount || 0
      const ownerRating = compositeRating(ownerAvgRating ?? 5, negCount)
      const base = {
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        type: product.type,
        sellerId: product.ownerId,
        seller: owner?.name || (owner?.email ? owner.email.split('@')[0] : product.seller || 'Verified seller'),
        rating: product.rating ?? ownerRating ?? 4.7,
        image: product.img || imageForServer(product.title, 640, 640),
        description: product.description || '',
        stockCount: product.stockCount,
        paymentInstructions: owner?.paymentInstructions || null,
        category: product.category?.name || null,
        tags: product.category?.name ? [product.category.name] : [],
      }
      if (product.type === 'service') {
        try {
          const availability = await fetchServiceAvailability(product, new Date(), 14)
          base.service = {
            openDays: availability.openDays,
            openTime: availability.openTime,
            closeTime: availability.closeTime,
            durationMinutes: availability.durationMinutes,
            dailyCapacity: product.serviceDailyCapacity ?? null,
            availability: (availability.days || [])
              .filter((d) => d.isOpen)
              .flatMap((d) => (d.slots || []).filter((s) => s.available).slice(0, 2))
              .slice(0, 6)
              .map((slot) => slot.start),
          }
        } catch (e) {
          base.service = {
            openDays: product.serviceOpenDays || [],
            openTime: product.serviceOpenTime || null,
            closeTime: product.serviceCloseTime || null,
            durationMinutes: product.serviceDurationMinutes || null,
            dailyCapacity: product.serviceDailyCapacity || null,
            availability: [],
          }
        }
      }
      enriched.push(base)
    }

    const map = new Map()
    for (const item of enriched) map.set(item.id, item)
    return { list: enriched, map }
  }

  async function createAssistantOrders({
    items,
    buyerId,
    customerName,
    customerEmail,
    customerPhone,
    address,
  }) {
    if (!Array.isArray(items) || !items.length) throw new Error('No items to create an order with')
    const productIds = [...new Set(items.map((item) => item.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        ownerId: true,
        title: true,
        price: true,
        type: true,
        stockCount: true,
        serviceOpenDays: true,
        serviceOpenTime: true,
        serviceCloseTime: true,
        serviceDurationMinutes: true,
        serviceDailyCapacity: true,
      },
    })
    const productById = new Map(products.map((p) => [p.id, p]))
    for (const productId of productIds) {
      if (!productById.has(productId)) throw new Error(`Product ${productId} is no longer available`)
    }

    const normalizedItems = []
    const goodsAdjustments = new Map()
    const pendingServiceSlots = new Set()

    for (const item of items) {
      const product = productById.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} is unavailable`)
      const quantity = Math.max(1, Number(item.quantity || 1))
      if (product.type === 'goods') {
        const stock = Number(product.stockCount ?? 0)
        if (quantity > stock) throw new Error(`"${product.title}" only has ${stock} in stock.`)
        goodsAdjustments.set(product.id, (goodsAdjustments.get(product.id) || 0) + quantity)
        normalizedItems.push({
          productId: product.id,
          quantity,
          price: Number(product.price) || 0,
          sellerId: product.ownerId ?? null,
          title: product.title,
          type: 'goods',
        })
      } else {
        const slotString = item.appointmentSlot || item.meta || item.note
        if (!slotString) throw new Error(`Select a valid appointment time for "${product.title}".`)
        const slot = new Date(slotString)
        if (Number.isNaN(slot.getTime())) throw new Error(`Invalid appointment time for "${product.title}".`)
        slot.setSeconds(0, 0)
        const slotKey = `${product.id}:${slot.getTime()}`
        if (pendingServiceSlots.has(slotKey)) throw new Error(`Duplicate appointment time selected for "${product.title}".`)
        pendingServiceSlots.add(slotKey)
        const availability = await fetchServiceAvailability(product, slot, 1)
        const slotAvailable = (availability.days || []).some((day) =>
          (day.slots || []).some((entry) => entry.available && new Date(entry.start).getTime() === slot.getTime())
        )
        if (!slotAvailable) throw new Error(`That time for "${product.title}" was just taken. Please choose a different slot.`)
        normalizedItems.push({
          productId: product.id,
          quantity: 1,
          price: Number(product.price) || 0,
          sellerId: product.ownerId ?? null,
          title: product.title,
          type: 'service',
          appointmentAt: slot,
        })
      }
    }

    const groups = new Map()
    for (const item of normalizedItems) {
      const key = item.sellerId == null ? 'null' : String(item.sellerId)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }

    const createdOrders = []
    const sellerInstructionsCache = new Map()
    for (const [key, groupItems] of groups) {
      const sellerId = key === 'null' ? null : Number(key)
      const total = groupItems.reduce((sum, entry) => sum + Number(entry.price || 0) * Number(entry.quantity || 1), 0)
      const normalizedBuyerId = typeof buyerId === 'number' && Number.isFinite(buyerId) ? buyerId : null
      let sellerInstructions = null
      if (sellerId) {
        if (!sellerInstructionsCache.has(sellerId)) {
          const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { paymentInstructions: true } })
          sellerInstructionsCache.set(sellerId, seller?.paymentInstructions || null)
        }
        sellerInstructions = sellerInstructionsCache.get(sellerId)
      }
      const order = await prisma.order.create({
        data: {
          buyerId: normalizedBuyerId,
          sellerId,
          total: Math.max(0, Math.round(total)),
          status: 'pending',
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          address: address || null,
          paymentInstructions: sellerInstructions || null,
          accessCode: randomAssistantAccessCode(),
          items: {
            create: groupItems.map((entry) => ({
              productId: entry.productId,
              title: entry.title,
              price: Number(entry.price) || 0,
              quantity: Number(entry.quantity) || 1,
              appointmentAt: entry.type === 'service' && entry.appointmentAt ? new Date(entry.appointmentAt) : null,
              appointmentStatus: entry.type === 'service' ? 'requested' : null,
            })),
          },
        },
        include: { items: true },
      })
      createdOrders.push(order)
    }

    for (const [productId, decrement] of goodsAdjustments) {
      await prisma.product.update({ where: { id: productId }, data: { stockCount: { decrement } } })
    }

    return createdOrders
  }

  async function applyAssistantActions({
    actions,
    state,
    catalogMap,
    customer,
    buyerId,
  }) {
    const nextState = cloneAssistantState(state || {})
    if (!Array.isArray(nextState.cart)) nextState.cart = []
    if (!Array.isArray(nextState.recommendations)) nextState.recommendations = []
    if (!Array.isArray(nextState.orders)) nextState.orders = []
    if (!Array.isArray(nextState.appointments)) nextState.appointments = []
    if (!Array.isArray(nextState.pendingInfoRequests)) nextState.pendingInfoRequests = []

    const catalogEntries = Array.from(catalogMap.values())
    const catalogSlugMap = new Map()
    const catalogIdLowerMap = new Map()
    for (const item of catalogEntries) {
      if (item?.slug) catalogSlugMap.set(String(item.slug).toLowerCase(), item)
      if (item?.id) catalogIdLowerMap.set(String(item.id).toLowerCase(), item)
    }

    const productCache = new Map()

    function registerCatalogProduct(item) {
      if (!item || !item.id) return item
      if (!catalogMap.has(item.id)) catalogMap.set(item.id, item)
      catalogIdLowerMap.set(String(item.id).toLowerCase(), item)
      if (item.slug) catalogSlugMap.set(String(item.slug).toLowerCase(), item)
      return item
    }

    async function resolveCatalogProduct(identifier) {
      if (identifier == null) return null
      const raw = String(identifier).trim()
      if (!raw) return null
      const direct = catalogMap.get(raw)
      if (direct) return direct
      const lower = raw.toLowerCase()
      if (catalogSlugMap.has(lower)) return catalogSlugMap.get(lower)
      if (catalogIdLowerMap.has(lower)) return catalogIdLowerMap.get(lower)
      if (productCache.has(lower)) return productCache.get(lower)

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: raw },
            { slug: raw },
            { id: lower },
            { slug: lower },
          ],
        },
        select: {
          id: true,
          slug: true,
          title: true,
          price: true,
          type: true,
          img: true,
          description: true,
          stockCount: true,
          seller: true,
          ownerId: true,
          rating: true,
        },
      })

      if (!product) {
        productCache.set(lower, null)
        return null
      }

      const normalized = {
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        type: product.type,
        sellerId: product.ownerId ?? null,
        seller: product.seller || 'Marketplace seller',
        rating: product.rating ?? null,
        image: product.img || imageForServer(product.title, 640, 640),
        description: product.description || '',
        stockCount: product.stockCount,
      }

      registerCatalogProduct(normalized)
      productCache.set(lower, normalized)
      productCache.set(product.id.toLowerCase(), normalized)
      if (product.slug) productCache.set(product.slug.toLowerCase(), normalized)
      return normalized
    }

    const results = []
    const createdOrders = []

    for (const action of actions) {
      try {
        if (action.type === 'recommend_products') {
          const resolved = []
          for (const item of action.products) {
            const product = await resolveCatalogProduct(item.productId)
            if (!product) continue
            resolved.push({
              ...item,
              productId: product.id,
              title: product.title,
              price: product.price,
              type: product.type,
              image: product.image,
              slug: product.slug,
            })
          }
          if (resolved.length) {
            const existingIds = new Set(nextState.recommendations.map((r) => r.productId))
            for (const rec of resolved) {
              if (!existingIds.has(rec.productId)) {
                nextState.recommendations.push({ productId: rec.productId, reason: rec.reason, matchScore: rec.matchScore })
                existingIds.add(rec.productId)
              }
            }
          }
          results.push({ ...action, status: 'applied', products: resolved })
        } else if (action.type === 'add_to_cart') {
          if (!Array.isArray(action.items) || action.items.length === 0) {
            throw new Error('No cart items supplied')
          }
          const payload = []
          for (const entry of action.items) {
            const product = await resolveCatalogProduct(entry.productId)
            if (!product) throw new Error(`Product ${entry.productId} could not be found`)
            const quantity = Math.max(1, Number(entry.quantity || 1))
            payload.push({
              productId: product.id,
              quantity,
              appointmentSlot: entry.appointmentSlot,
              note: entry.note,
              title: product.title,
              price: product.price,
              type: product.type,
              slug: product.slug,
            })
          }
          if (Number.isFinite(buyerId)) {
            let cart = await prisma.cart.findFirst({ where: { userId: Number(buyerId) } })
            if (!cart) {
              cart = await prisma.cart.create({ data: { userId: Number(buyerId) } })
            }
            for (const entry of payload) {
              const metaObject = entry.appointmentSlot || entry.note ? { appointmentSlot: entry.appointmentSlot, note: entry.note } : null
              const metaString = metaObject ? JSON.stringify(metaObject) : null
              const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: entry.productId } })
              if (existing) {
                await prisma.cartItem.update({
                  where: { id: existing.id },
                  data: {
                    quantity: Math.min(99, (existing.quantity || 0) + entry.quantity),
                    meta: metaString ?? existing.meta,
                  },
                })
              } else {
                await prisma.cartItem.create({
                  data: {
                    cartId: cart.id,
                    productId: entry.productId,
                    quantity: entry.quantity,
                    meta: metaString,
                  },
                })
              }
            }
          }
          if (action.replace) {
            nextState.cart = payload.map((item) => ({ productId: item.productId, quantity: item.quantity, appointmentSlot: item.appointmentSlot, note: item.note }))
          } else {
            const byId = new Map(nextState.cart.map((item) => [item.productId, item]))
            for (const entry of payload) {
              if (byId.has(entry.productId)) {
                const existing = byId.get(entry.productId)
                existing.quantity = Math.min(99, Math.max(1, Number(existing.quantity || 1) + Number(entry.quantity || 1)))
                if (entry.appointmentSlot) existing.appointmentSlot = entry.appointmentSlot
                if (entry.note) existing.note = entry.note
              } else {
                const item = { productId: entry.productId, quantity: entry.quantity, appointmentSlot: entry.appointmentSlot, note: entry.note }
                nextState.cart.push(item)
                byId.set(entry.productId, item)
              }
            }
          }
          results.push({ ...action, status: 'applied', items: payload })
        } else if (action.type === 'book_service') {
          const product = await resolveCatalogProduct(action.productId)
          if (!product) throw new Error(`Service ${action.productId} not found`)
          const slot = new Date(action.slot)
          if (Number.isNaN(slot.getTime())) throw new Error('Invalid appointment time provided')
          const dbProduct = await prisma.product.findUnique({ where: { id: product.id } })
          if (!dbProduct) throw new Error('Selected service is not available in the live catalogue')
          const availability = await fetchServiceAvailability(dbProduct, slot, 1)
          const slotAvailable = (availability?.days || []).some((day) =>
            (day.slots || []).some((entry) => entry.available && new Date(entry.start).getTime() === slot.getTime())
          )
          if (!slotAvailable) throw new Error('Selected appointment is no longer available')
          nextState.appointments.push({
            productId: product.id,
            slot: slot.toISOString(),
            status: 'requested',
            note: action.note,
          })
          nextState.cart.push({ productId: product.id, quantity: 1, appointmentSlot: slot.toISOString() })
          results.push({ ...action, productId: product.id, status: 'applied', slot: slot.toISOString(), title: product.title })
        } else if (action.type === 'create_order') {
          const sourceItems = action.useCart || !action.items?.length ? nextState.cart : action.items
          if (!sourceItems || !sourceItems.length) throw new Error('No items available to create an order')
          const normalized = []
          for (const item of sourceItems) {
            const product = await resolveCatalogProduct(item.productId)
            if (!product) throw new Error(`Product ${item.productId} is no longer available`)
            normalized.push({
              productId: product.id,
              quantity: Math.max(1, Number(item.quantity || 1)),
              appointmentSlot: item.appointmentSlot,
              note: item.note,
            })
          }
          const orders = await createAssistantOrders({
            items: normalized,
            buyerId,
            customerName: action.customerName || customer?.name || null,
            customerEmail: action.customerEmail || customer?.email || null,
            customerPhone: action.customerPhone || customer?.phone || null,
            address: action.address || null,
          })
          createdOrders.push(...orders)
          for (const order of orders) {
            nextState.orders.push({
              id: order.id,
              total: order.total,
              status: order.status,
              paymentInstructions: order.paymentInstructions || null,
              accessCode: order.accessCode || null,
              createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
            })
          }
          nextState.cart = []
          nextState.pendingInfoRequests = []
          results.push({
            ...action,
            status: 'applied',
            orders: orders.map((o) => ({ id: o.id, total: o.total, paymentInstructions: o.paymentInstructions || null })),
          })
        } else if (action.type === 'ask_information') {
          nextState.pendingInfoRequests.push({ fields: action.fields, reason: action.reason })
          results.push({ ...action, status: 'applied' })
        } else if (action.type === 'clear_cart') {
          nextState.cart = []
          results.push({ ...action, status: 'applied' })
        } else if (action.type === 'update_metadata') {
          nextState.metadata = { ...(nextState.metadata || {}), ...action.patch }
          results.push({ ...action, status: 'applied' })
        } else {
          results.push({ ...action, status: 'ignored' })
        }
      } catch (err) {
        results.push({ ...action, status: 'error', error: err?.message || 'Unknown error' })
      }
    }

    return { state: nextState, results, createdOrders }
  }

  router.post('/assistant/chat', async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return res.status(503).json({ error: 'Assistant not configured. Provide OPENAI_API_KEY.' })

      const parseResult = SalesAssistantRequestSchema.safeParse(req.body || {})
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid assistant payload', detail: parseResult.error.flatten() })
      }

      const { message, conversation, state, customer, attachments = [] } = parseResult.data
      const { list: catalog, map: catalogMap } = await loadAssistantCatalog({ limit: 20 })
      const buyerId = Number.isFinite(Number(req.user?.uid)) ? Number(req.user.uid) : null
      const sanitizedState = cloneAssistantState(state || {})

      const attachmentSummaries = []
      const attachmentImages = []

      for (const attachment of attachments) {
        const mime = String(attachment.type || '').toLowerCase()
        if (!mime) continue
        if (mime.startsWith('image/')) {
          const dataUrl = attachment.data.startsWith('data:')
            ? attachment.data
            : `data:${mime};base64,${attachment.data}`
          attachmentImages.push({ name: attachment.name, dataUrl })
          attachmentSummaries.push(`${attachment.name} (image, ${(attachment.size / 1024).toFixed(1)} kB)`)
        } else if (mime === 'application/pdf') {
          attachmentSummaries.push(
            `${attachment.name} (PDF, ${(attachment.size / 1024).toFixed(1)} kB). Summarise the likely requirements based on the buyer's request and clarify any specifics in your reply.`,
          )
        } else {
          attachmentSummaries.push(
            `${attachment.name} (${mime}) provided. Describe its key points in your reply if relevant.`,
          )
        }
      }

      const systemPrompt = `You are Hedgetech's AI commerce assistant helping buyers discover products and services, collect missing details, and trigger marketplace actions.
Respond with valid JSON only. Never include markdown or plain text outside JSON. Stay friendly, concise, and human — imagine a knowledgeable retail concierge in Australia.

JSON response schema:
{
  "reply": string; // conversational response for the buyer in Australian English
  "actions": Action[]; // see action specs below
  "suggestions": string[]; // optional follow-up quick replies (≤4, succinct)
}

Action types you can request:
- recommend_products: suggest SKUs from the provided catalog. Include productId and optional reason/matchScore.
- add_to_cart: stage one or more products with quantity and optional appointmentSlot for services. Always use catalog productId and include quantity.
- book_service: reserve a service slot (requires slot ISO timestamp from availability window).
- create_order: when buyer is ready. Supply customer details (if known) and items or set useCart true to consume current cart. Provide productId and quantity per item.
- ask_information: request mandatory details (e.g., customer_email, address, service_time) you are missing.
- clear_cart: remove staged items when buyer changes direction.
- update_metadata: store facts about buyer preferences to guide future recommendations.

Rules:
- Only recommend or sell items present in "catalog". Use productId exactly as provided.
- If info is missing to proceed (like email, service time), emit ask_information before create_order.
- Services require appointmentSlot aligned with availability. Use ISO strings from availability data.
- When you create an order for goods that need shipping, make sure an address is collected.
- Hedgetech never processes payments. Share the seller's paymentInstructions verbatim (from catalog.ownerPaymentInstructions or order.paymentInstructions) so the buyer knows how to pay them directly, and remind them to send proof to the seller.
- The moment the buyer clearly confirms they want to place an order, immediately issue create_order (prefer useCart: true) with any known customer_name/email/phone. Do not ask the buyer to check out manually once you have their go-ahead.
- Keep reply warm, factual, and helpful. Reference seller or service details when useful.
- Respect prior conversation context supplied.
- Use attachment notes and images to inform your reply and actions.
- Some catalog items include "vertical": "shared_space" with a "spaceProfile" containing rent per week, suburb, stay length, vibe tags, and host info. Reference those details when buyers ask about rooms/desks and mention rent + availability in your reply.`

      const sharedSpaceContext = catalog
        .filter((item) => item?.vertical === 'shared_space' && item?.spaceProfile)
        .map((item) => ({
          id: item.id,
          title: item.title,
          rentPerWeek: item.spaceProfile.rentPerWeek,
          location: `${item.spaceProfile.suburb}, ${item.spaceProfile.city || item.spaceProfile.state}`,
          stayLength: item.spaceProfile.stayLength,
          vibe: item.spaceProfile.vibe,
          amenities: item.spaceProfile.amenities,
          host: item.spaceProfile.host,
        }))

      const historyMessages = (conversation || [])
        .slice(-8)
        .map((entry) => ({
          role: entry.role,
          content: String(entry.content || '').slice(0, 2000),
        }))

      const assistantContext = {
        customer: customer || null,
        state: {
          cart: sanitizedState.cart || [],
          recommendations: sanitizedState.recommendations || [],
          orders: sanitizedState.orders || [],
          appointments: sanitizedState.appointments || [],
          pendingInfoRequests: sanitizedState.pendingInfoRequests || [],
        },
        catalog,
        sharedSpaces: sharedSpaceContext,
        attachments: attachments.map((file) => ({ name: file.name, type: file.type, size: file.size })),
      }

      const userContent = [
        'Customer message:',
        message,
        '',
        'Assistant context JSON:',
        JSON.stringify(assistantContext, null, 2),
        attachmentSummaries.length ? '' : null,
        attachmentSummaries.length ? 'Attachment notes:' : null,
        ...attachmentSummaries,
      ].filter(Boolean).join('\n')

      const userContentParts = [
        { type: 'text', text: userContent },
        ...attachmentImages.map((image) => ({ type: 'image_url', image_url: { url: image.dataUrl } })),
      ]

      const body = {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userContentParts },
        ],
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const detail = await resp.text().catch(() => '')
        return res.status(502).json({ error: 'OpenAI error', detail })
      }

      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) return res.status(502).json({ error: 'Assistant returned no content' })

      let raw
      try {
        raw = JSON.parse(content)
      } catch (e) {
        return res.status(502).json({ error: 'Assistant produced invalid JSON', detail: e?.message || 'parse error', raw: content })
      }

      const { data: assistantData, warning } = safeParseAssistant(raw)
      if (warning) console.warn('Assistant response normalized with warnings')

      const { state: nextState, results, createdOrders } = await applyAssistantActions({
        actions: assistantData.actions || [],
        state: sanitizedState,
        catalogMap,
        customer,
        buyerId,
      })

      const assistantMessage = {
        id: `assistant-${randomAssistantAccessCode().slice(0, 8)}`,
        role: 'assistant',
        content: assistantData.reply,
        actions: results,
        suggestions: assistantData.suggestions || [],
        createdAt: new Date().toISOString(),
      }

      res.json({
        message: assistantMessage,
        state: nextState,
        usage: data?.usage || null,
        raw: assistantData,
        createdOrders: (createdOrders || []).map((order) => ({
          id: order.id,
          total: order.total,
          status: order.status,
          paymentInstructions: order.paymentInstructions || null,
          accessCode: order.accessCode || null,
        })),
      })
    } catch (e) {
      console.error('POST /api/assistant/chat error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/products/:id/availability', async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing product id' })
      const product = await prisma.product.findUnique({ where: { id } })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      if (product.type !== 'service') return res.status(400).json({ error: 'Availability only applies to services' })
      const startParam = req.query.start ? new Date(String(req.query.start)) : new Date()
      if (Number.isNaN(startParam.getTime())) return res.status(400).json({ error: 'Invalid start date' })
      const windowParam = req.query.days ? Number(req.query.days) : undefined
      const availability = await fetchServiceAvailability(product, startParam, windowParam)
      res.json(availability)
    } catch (e) {
      console.error('GET /api/products/:id/availability error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/products', ensureAuth, async (req, res) => {
    try {
      let {
        images,
        description,
        barcode,
        stockCount,
        serviceOpenDays,
        serviceDurationMinutes,
        serviceOpenTime,
        serviceCloseTime,
        serviceDailyCapacity,
        spaceProfile,
        vertical,
        ...rest
      } = req.body || {}
      if (typeof images === 'string') {
        images = images
          .split(/\n|,/) // split on newlines or commas
          .map((s) => String(s).trim())
          .filter(Boolean)
      }
      if (!Array.isArray(images)) images = undefined
      const normalizedDescription = typeof description === 'string' ? description.trim() || null : description ?? null
      const normalizedBarcode = typeof barcode === 'string' ? barcode.trim() || null : undefined
      const normalizedSpaceProfile = normalizeSpaceProfile(spaceProfile)
      const normalizedVertical = vertical === 'shared_space' ? 'shared_space' : 'commerce'
      const data = {
        ...rest,
        stockCount: parseIntOrDefault(stockCount, 0, { min: 0 }),
        serviceOpenDays: normalizeOpenDays(serviceOpenDays),
        serviceDurationMinutes: parseIntOrNull(serviceDurationMinutes, { min: 0 }),
        serviceDailyCapacity: parseIntOrNull(serviceDailyCapacity, { min: 0 }),
        serviceOpenTime: normalizeTimeString(serviceOpenTime),
        serviceCloseTime: normalizeTimeString(serviceCloseTime),
        description: normalizedDescription,
        images,
        barcode: normalizedBarcode === undefined ? undefined : normalizedBarcode,
        ownerId: req.user.uid,
        vertical: normalizedVertical,
        spaceProfile: normalizedSpaceProfile,
      }
      if (normalizedVertical === 'shared_space' && normalizedSpaceProfile) {
        data.price = parseIntOrDefault(normalizedSpaceProfile.rentPerWeek ?? data.price, 0, { min: 0 })
      }
      const created = await prisma.product.create({ data })
      res.status(201).json(created)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/products error:', e)
      if (e?.code === 'P2002') {
        return res.status(409).json({ error: 'Duplicate barcode for this seller' })
      }
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/products', ensureAuth, async (req, res) => {
    try {
      const {
        id,
        images,
        description,
        barcode,
        stockCount,
        serviceOpenDays,
        serviceDurationMinutes,
        serviceOpenTime,
        serviceCloseTime,
        serviceDailyCapacity,
        spaceProfile,
        vertical,
        ...rest
      } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      let imagesArr = images
      if (typeof images === 'string') {
        imagesArr = images
          .split(/\n|,/) // split on newlines or commas
          .map((s) => String(s).trim())
          .filter(Boolean)
      }
      const normalizedDescription =
        description === undefined ? undefined : typeof description === 'string' ? description.trim() || null : description
      const normalizedBarcode =
        barcode === undefined ? undefined : typeof barcode === 'string' ? barcode.trim() || null : barcode
      const normalizedSpaceProfile = spaceProfile === undefined ? undefined : normalizeSpaceProfile(spaceProfile)
      const normalizedVertical = vertical === undefined ? undefined : (vertical === 'shared_space' ? 'shared_space' : 'commerce')
      const data = {
        ...rest,
        description: normalizedDescription,
        barcode: normalizedBarcode,
        images: Array.isArray(imagesArr) ? imagesArr : undefined,
        stockCount: stockCount === undefined ? undefined : parseIntOrDefault(stockCount, 0, { min: 0 }),
        serviceOpenDays:
          serviceOpenDays === undefined ? undefined : normalizeOpenDays(serviceOpenDays),
        serviceDurationMinutes:
          serviceDurationMinutes === undefined
            ? undefined
            : parseIntOrNull(serviceDurationMinutes, { min: 0 }),
        serviceDailyCapacity:
          serviceDailyCapacity === undefined ? undefined : parseIntOrNull(serviceDailyCapacity, { min: 0 }),
        serviceOpenTime:
          serviceOpenTime === undefined ? undefined : normalizeTimeString(serviceOpenTime),
        serviceCloseTime:
          serviceCloseTime === undefined ? undefined : normalizeTimeString(serviceCloseTime),
        spaceProfile: normalizedSpaceProfile,
        vertical: normalizedVertical,
      }
      if (normalizedVertical === 'shared_space' && normalizedSpaceProfile) {
        data.price = parseIntOrDefault(normalizedSpaceProfile.rentPerWeek ?? rest.price, 0, { min: 0 })
      } else if (normalizedVertical === 'commerce') {
        data.spaceProfile = normalizedSpaceProfile ?? null
      }
      let updated
      try {
        updated = await prisma.product.update({ where: { id }, data })
      } catch (e) {
        if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate barcode for this seller' })
        throw e
      }
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PUT /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/products', ensureAuth, async (req, res) => {
    try {
      const { id } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      await prisma.product.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Categories
  router.get('/categories', async (_req, res) => {
    try {
      const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } })
      res.json(cats)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/categories', ensureAuth, async (req, res) => {
    try {
      const created = await prisma.category.create({ data: req.body })
      res.status(201).json(created)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/categories', ensureAuth, async (req, res) => {
    try {
      const { id, ...patch } = req.body
      if (!id) return res.status(400).send('Missing id')
      const updated = await prisma.category.update({ where: { id }, data: patch })
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PUT /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/categories', ensureAuth, async (req, res) => {
    try {
      const { id } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      await prisma.category.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Announcements -----------------------------------------------------------
  router.get('/announcements', async (req, res) => {
    try {
      const audiences = ['all', 'buyers', 'sellers', 'drivers', 'admins']
      const requested = String(req.query.audience || '').toLowerCase()
      const filterAudience = audiences.includes(requested) ? requested : null
      const now = new Date()
      const baseWhere = {
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      }
      if (filterAudience && filterAudience !== 'all') {
        baseWhere.AND.push({ audience: { in: ['all', filterAudience] } })
      }
      const list = await prisma.announcement.findMany({
        where: baseWhere,
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 50,
        include: { author: { select: { id: true, name: true, email: true } } },
      })
      res.json(list)
    } catch (e) {
      console.error('GET /api/announcements error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/admin/announcements', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { title, body, audience = 'all', pinned = false, startAt, endAt } = req.body || {}
      if (!title || !body) return res.status(400).json({ error: 'Title and body are required' })
      const normalizedAudience = ['all', 'buyers', 'sellers', 'drivers', 'admins'].includes(String(audience)) ? String(audience) : 'all'
      const startDate = startAt ? new Date(startAt) : null
      const endDate = endAt ? new Date(endAt) : null
      if (startDate && Number.isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid startAt' })
      if (endDate && Number.isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid endAt' })
      const created = await prisma.announcement.create({
        data: {
          title: String(title).trim(),
          body: String(body),
          audience: normalizedAudience,
          pinned: Boolean(pinned),
          startAt: startDate,
          endAt: endDate,
          authorId: Number.isFinite(Number(req.user?.uid)) ? Number(req.user.uid) : null,
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/admin/announcements error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/admin/announcements/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })
      const { title, body, audience, pinned, startAt, endAt } = req.body || {}
      const patch = {}
      if (title !== undefined) patch.title = String(title).trim()
      if (body !== undefined) patch.body = String(body)
      if (audience !== undefined && ['all', 'buyers', 'sellers', 'drivers', 'admins'].includes(String(audience))) patch.audience = String(audience)
      if (pinned !== undefined) patch.pinned = Boolean(pinned)
      if (startAt !== undefined) {
        const startDate = startAt ? new Date(startAt) : null
        if (startDate && Number.isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid startAt' })
        patch.startAt = startDate
      }
      if (endAt !== undefined) {
        const endDate = endAt ? new Date(endAt) : null
        if (endDate && Number.isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid endAt' })
        patch.endAt = endDate
      }
      const updated = await prisma.announcement.update({ where: { id }, data: patch })
      res.json(updated)
    } catch (e) {
      console.error('PUT /api/admin/announcements/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/admin/announcements/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })
      await prisma.announcement.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/admin/announcements/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Support tickets ---------------------------------------------------------
  function canViewTicket(user, ticket) {
    if (!user || !ticket) return false
    if (user.role === 'admin') return true
    const uid = Number(user.uid)
    if (!Number.isFinite(uid)) return false
    if (ticket.requesterId === uid) return true
    if (ticket.sellerId && ticket.sellerId === uid) return true
    return false
  }

  const ticketInclude = {
    requester: { select: { id: true, name: true, email: true, image: true } },
    seller: { select: { id: true, name: true, email: true, image: true } },
    order: { select: { id: true, status: true } },
    orderItem: { select: { id: true, title: true } },
    messages: {
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    },
  }

  router.get('/support/tickets', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user.uid)
      const role = req.user.role
      const where = role === 'admin'
        ? {}
        : { OR: [{ requesterId: uid }, { sellerId: uid }] }
      const list = await prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: ticketInclude,
      })
      res.json(list)
    } catch (e) {
      console.error('GET /api/support/tickets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/support/tickets/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing ticket id' })
      const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: ticketInclude })
      if (!ticket) return res.status(404).json({ error: 'Not found' })
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Forbidden' })
      res.json(ticket)
    } catch (e) {
      console.error('GET /api/support/tickets/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/support/tickets', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user.uid)
      if (!Number.isFinite(uid)) return res.status(401).json({ error: 'Unauthorized' })
      const { subject, body, type = 'general', orderId, orderItemId, priority = 'normal' } = req.body || {}
      if (!subject) return res.status(400).json({ error: 'Subject required' })
      if (!body) return res.status(400).json({ error: 'Message required' })
      let sellerId = null
      let order = null
      if (orderId) {
        order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
        if (order) {
          sellerId = order.sellerId ?? null
        }
      }
      if (!sellerId && orderItemId) {
        const orderItem = await prisma.orderItem.findUnique({ where: { id: orderItemId }, include: { product: true } })
        if (orderItem?.product?.ownerId) sellerId = orderItem.product.ownerId
      }
      const created = await prisma.supportTicket.create({
        data: {
          subject: String(subject).trim(),
          type: ['general', 'order', 'service', 'billing'].includes(String(type)) ? String(type) : 'general',
          priority: String(priority || 'normal'),
          orderId: order?.id || (orderId || null),
          orderItemId: orderItemId || null,
          requesterId: uid,
          sellerId,
          messages: {
            create: [{ body: String(body), authorId: uid }],
          },
        },
        include: ticketInclude,
      })
      if (created.seller?.email) {
        await sendMarketplaceEmail({
          to: created.seller.email,
          subject: 'New Hedgetech support ticket',
          html: `<p>You have a new support ticket from ${created.requester?.name || created.requester?.email || 'a buyer'}.</p><p><strong>${created.subject}</strong></p><p>${body}</p>`,
        })
      }
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/support/tickets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/support/tickets/:id/messages', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing ticket id' })
      const ticket = await prisma.supportTicket.findUnique({ where: { id } })
      if (!ticket) return res.status(404).json({ error: 'Not found' })
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Forbidden' })
      const { body, attachments } = req.body || {}
      if (!body) return res.status(400).json({ error: 'Message body required' })
      const message = await prisma.supportMessage.create({
        data: {
          ticketId: id,
          authorId: Number.isFinite(Number(req.user.uid)) ? Number(req.user.uid) : null,
          body: String(body),
          attachments: Array.isArray(attachments) ? attachments.map((item) => String(item)) : [],
        },
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
      })
      await prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date(), status: ticket.status === 'closed' ? 'in_progress' : ticket.status } })
      res.status(201).json(message)
    } catch (e) {
      console.error('POST /api/support/tickets/:id/messages error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/support/tickets/:id/status', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      const { status } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Missing ticket id' })
      const ticket = await prisma.supportTicket.findUnique({ where: { id } })
      if (!ticket) return res.status(404).json({ error: 'Not found' })
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Forbidden' })
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
      if (!validStatuses.includes(String(status))) return res.status(400).json({ error: 'Invalid status' })
      const updated = await prisma.supportTicket.update({ where: { id }, data: { status: String(status) }, include: ticketInclude })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/support/tickets/:id/status error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Refunds & disputes -------------------------------------------------------
  router.post('/orders/:id/refund', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing order id' })
      const uid = Number(req.user.uid)
      if (!Number.isFinite(uid)) return res.status(401).json({ error: 'Unauthorized' })
      const { orderItemId, amount, reason } = req.body || {}
      if (!reason) return res.status(400).json({ error: 'Reason required' })
      const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      if (req.user.role !== 'admin' && order.buyerId !== uid) return res.status(403).json({ error: 'Forbidden' })
      let sellerId = order.sellerId
      if (!sellerId) {
        const firstItem = order.items[0]
        if (firstItem) {
          const product = await prisma.product.findUnique({ where: { id: firstItem.productId } })
          if (product?.ownerId) sellerId = product.ownerId
        }
      }
      if (orderItemId) {
        const match = order.items.find((item) => item.id === orderItemId)
        if (!match) return res.status(400).json({ error: 'Order item not found on order' })
      }
      const refund = await prisma.refundRequest.create({
        data: {
          orderId: order.id,
          orderItemId: orderItemId || null,
          buyerId: order.buyerId ?? uid,
          sellerId,
          amount: amount != null ? Number(amount) : null,
          reason: String(reason),
        },
        include: {
          order: { select: { id: true, status: true, customerName: true } },
          orderItem: { select: { id: true, title: true } },
        },
      })
      if (sellerId) {
        const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
        if (seller?.email) {
          await sendMarketplaceEmail({
            to: seller.email,
            subject: 'Refund request awaiting review',
            html: `<p>A buyer requested a refund for order ${order.id}.</p><p>Reason: ${refund.reason}</p>`,
          })
        }
      }
      res.status(201).json(refund)
    } catch (e) {
      console.error('POST /api/orders/:id/refund error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/refunds', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user.uid)
      const role = req.user.role
      const scope = String(req.query.scope || '').toLowerCase()
      let where
      if (role === 'admin' || scope === 'all') {
        where = {}
      } else if (scope === 'buyers' || scope === 'buyer') {
        where = { buyerId: uid }
      } else if (scope === 'sellers' || scope === 'seller') {
        where = { sellerId: uid }
      } else {
        where = { OR: [{ buyerId: uid }, { sellerId: uid }] }
      }
      const refunds = await prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, status: true, customerName: true } },
          orderItem: { select: { id: true, title: true } },
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
        },
      })
      res.json(refunds)
    } catch (e) {
      console.error('GET /api/refunds error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/refunds/:id/review', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing refund id' })
      const refund = await prisma.refundRequest.findUnique({ where: { id }, include: { order: true, buyer: true, seller: true } })
      if (!refund) return res.status(404).json({ error: 'Not found' })
      const uid = Number(req.user.uid)
      if (req.user.role !== 'admin' && refund.sellerId && refund.sellerId !== uid) return res.status(403).json({ error: 'Forbidden' })
      const { action, notes, amount } = req.body || {}
      const normalizedAction = String(action || '').toLowerCase()
      const allowed = ['accept', 'reject', 'refund']
      if (!allowed.includes(normalizedAction)) return res.status(400).json({ error: 'Invalid action' })
      let nextStatus = refund.status
      if (normalizedAction === 'reject') nextStatus = 'rejected'
      if (normalizedAction === 'accept') nextStatus = 'accepted'
      if (normalizedAction === 'refund') nextStatus = 'refunded'
      const patch = {
        status: nextStatus,
        resolution: notes ? String(notes) : refund.resolution,
        amount: amount != null ? Number(amount) : refund.amount,
      }
      const updated = await prisma.refundRequest.update({ where: { id }, data: patch, include: {
        order: true,
        orderItem: { select: { id: true, title: true } },
        buyer: { select: { email: true, name: true } },
        seller: { select: { email: true, name: true } },
      } })
      if (updated.status === 'accepted' || updated.status === 'refunded') {
        await prisma.order.update({ where: { id: updated.orderId }, data: { status: 'refunded' } })
      }
      if (updated.buyer?.email) {
        await sendMarketplaceEmail({
          to: updated.buyer.email,
          subject: 'Refund request update',
          html: `<p>Your refund request for order ${updated.orderId} is now ${updated.status}.</p>${updated.resolution ? `<p>${updated.resolution}</p>` : ''}`,
        })
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/refunds/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/cart', async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      let cart = await prisma.cart.findFirst({ where: { userId: ownerId }, include: { items: true } })
      if (!cart) cart = await prisma.cart.create({ data: { userId: ownerId }, include: { items: true } })
      res.json(cart)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/cart error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/cart', ensureAuth, async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      const { productId, quantity = 1, meta } = req.body || {}
      let cart = await prisma.cart.findFirst({ where: { userId: ownerId } })
      if (!cart) cart = await prisma.cart.create({ data: { userId: ownerId } })
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } })
      let item
      if (existing) {
        item = await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: (existing.quantity || 0) + quantity, meta: meta ?? existing.meta } })
      } else {
        item = await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, meta } })
      }
      res.json(item)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/cart error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/cart', ensureAuth, async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      const id = String(req.query.id || '')
      if (!id) return res.status(400).send('id required')
      await prisma.cartItem.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/cart error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/checkout', async (req, res) => {
    try {
      const { items = [], customerName, customerEmail, address, customerPhone } = req.body || {}
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items to checkout' })
      const uid = req.user?.uid ? Number(req.user.uid) : null
      const productIds = items.map((i) => i.productId).filter(Boolean)
      if (!productIds.length) return res.status(400).json({ error: 'Invalid cart items' })

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          ownerId: true,
          type: true,
          title: true,
          stockCount: true,
          serviceOpenDays: true,
          serviceOpenTime: true,
          serviceCloseTime: true,
          serviceDurationMinutes: true,
          serviceDailyCapacity: true,
        },
      })
      const productById = new Map(products.map((p) => [p.id, p]))
      for (const productId of productIds) {
        if (!productById.has(productId)) {
          return res.status(400).json({ error: 'One or more items are no longer available.' })
        }
      }

      const goodsAdjustments = new Map()
      const serviceRequests = new Map()
      const serviceRanges = new Map()

      for (const item of items) {
        const product = productById.get(item.productId)
        if (!product) return res.status(400).json({ error: 'Product not found' })
        const quantity = Math.max(1, Number(item.quantity || 1))

        if (product.type === 'goods') {
          const stock = Number(product.stockCount ?? 0)
          if (quantity > stock) {
            return res.status(409).json({ error: `"${product.title}" only has ${stock} in stock.` })
          }
          goodsAdjustments.set(product.id, (goodsAdjustments.get(product.id) || 0) + quantity)
        } else if (product.type === 'service') {
          if (quantity !== 1) {
            return res.status(400).json({ error: `"${product.title}" appointments must be booked one at a time.` })
          }
          const slotString = item.meta || item.appointmentAt
          if (!slotString) {
            return res.status(400).json({ error: `Select an appointment time for "${product.title}".` })
          }
          const slot = new Date(slotString)
          if (Number.isNaN(slot.getTime())) {
            return res.status(400).json({ error: `Invalid appointment time for "${product.title}".` })
          }
          slot.setSeconds(0, 0)
          const weekday = WEEKDAY_FROM_INDEX[slot.getDay()] || ''
          const openDays = product.serviceOpenDays?.length ? product.serviceOpenDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          if (!openDays.includes(weekday)) {
            return res.status(400).json({ error: `"${product.title}" does not accept bookings on ${weekday}.` })
          }
          const durationMinutes = Math.max(15, product.serviceDurationMinutes || 60)
          const durationMs = durationMinutes * 60 * 1000
          const dayStart = startOfDay(slot)
          let dayOpen = combineDateAndTime(dayStart, product.serviceOpenTime || '09:00')
          let dayClose = combineDateAndTime(dayStart, product.serviceCloseTime || '17:00')
          if (dayClose <= dayOpen) dayClose = new Date(dayOpen.getTime() + durationMs)
          if (slot < dayOpen || slot >= dayClose) {
            return res.status(400).json({ error: `"${product.title}" offers appointments between ${product.serviceOpenTime || '09:00'} and ${product.serviceCloseTime || '17:00'}.` })
          }
          const offset = slot.getTime() - dayOpen.getTime()
          if (offset % durationMs !== 0) {
            return res.status(400).json({ error: `"${product.title}" uses ${durationMinutes}-minute slots. Please choose a valid time.` })
          }
          const maxSlots = Math.max(1, Math.floor((dayClose.getTime() - dayOpen.getTime()) / durationMs))
          const dailyCapacity = product.serviceDailyCapacity ?? maxSlots
          const dayKey = dayStart.toISOString().slice(0, 10)
          const normalizedSlot = new Date(slot)
          normalizedSlot.setSeconds(0, 0)
          if (!serviceRequests.has(product.id)) serviceRequests.set(product.id, [])
          serviceRequests.get(product.id).push({ slot: normalizedSlot, dayKey, dailyCapacity, title: product.title })
          const existingRange = serviceRanges.get(product.id)
          if (existingRange) {
            if (normalizedSlot < existingRange.min) existingRange.min = normalizedSlot
            if (normalizedSlot > existingRange.max) existingRange.max = normalizedSlot
          } else {
            serviceRanges.set(product.id, { min: normalizedSlot, max: normalizedSlot })
          }
          Object.assign(item, { __normalizedSlot: normalizedSlot })
        }
      }

      const pendingDayCounts = new Map()
      const pendingSlotCounts = new Map()
      for (const [productId, requests] of serviceRequests) {
        const product = productById.get(productId)
        if (!product) continue
        const range = serviceRanges.get(productId)
        const windowStart = startOfDay(range?.min || new Date())
        const windowEnd = addDays(startOfDay(range?.max || new Date()), 1)
        const existingItems = await prisma.orderItem.findMany({
          where: {
            productId,
            appointmentAt: { not: null, gte: windowStart, lt: windowEnd },
            appointmentStatus: { notIn: ['cancelled', 'rejected'] },
          },
          select: { appointmentAt: true },
        })
        const bookedByDay = new Map()
        for (const entry of existingItems) {
          if (!entry.appointmentAt) continue
          const at = new Date(entry.appointmentAt)
          at.setSeconds(0, 0)
          const dayKey = at.toISOString().slice(0, 10)
          const slotKey = at.getTime()
          if (!bookedByDay.has(dayKey)) bookedByDay.set(dayKey, { total: 0, slots: new Map() })
          const bucket = bookedByDay.get(dayKey)
          bucket.total += 1
          bucket.slots.set(slotKey, (bucket.slots.get(slotKey) || 0) + 1)
        }

        for (const request of requests) {
          const slotKey = `${productId}:${request.slot.getTime()}`
          if ((pendingSlotCounts.get(slotKey) || 0) > 0) {
            return res.status(400).json({ error: `Duplicate time selected for "${request.title}".` })
          }
          pendingSlotCounts.set(slotKey, 1)
          const dayKey = request.dayKey
          const dayEntry = bookedByDay.get(dayKey) || { total: 0, slots: new Map() }
          const slotBooked = dayEntry.slots.get(request.slot.getTime()) || 0
          if (slotBooked > 0) {
            return res.status(409).json({ error: `That time for "${request.title}" was just taken. Please pick another slot.` })
          }
          const pendingKey = `${productId}:${dayKey}`
          const pendingTotal = pendingDayCounts.get(pendingKey) || 0
          if (dayEntry.total + pendingTotal >= request.dailyCapacity) {
            return res.status(409).json({ error: `Daily capacity reached for "${request.title}" on ${dayKey}.` })
          }
          pendingDayCounts.set(pendingKey, pendingTotal + 1)
        }
      }

      const groups = new Map()
      for (const item of items) {
        const ownerId = productById.get(item.productId)?.ownerId ?? null
        if (!groups.has(ownerId)) groups.set(ownerId, [])
        groups.get(ownerId).push(item)
      }

      const createdOrders = []
      const serviceOrders = []
      for (const [ownerId, groupItems] of groups) {
        const groupTotal = groupItems.reduce((sum, current) => sum + (Number(current.price) || 0) * (Number(current.quantity) || 0), 0)
        const hasService = groupItems.some((gi) => productById.get(gi.productId)?.type === 'service')
        const order = await prisma.order.create({
          data: {
            buyerId: uid,
            sellerId: ownerId || null,
            total: groupTotal,
            status: hasService ? 'pending' : 'paid',
            customerName,
            customerEmail,
            address,
            customerPhone,
            accessCode: uid == null ? randomBytes(12).toString('hex') : null,
            items: {
              create: groupItems.map((i) => ({
                productId: i.productId,
                title: i.title,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                appointmentAt:
                  productById.get(i.productId)?.type === 'service' && (i.__normalizedSlot || i.meta)
                    ? new Date(i.__normalizedSlot || i.meta)
                    : null,
                appointmentStatus: productById.get(i.productId)?.type === 'service' ? 'requested' : null,
              })),
            },
          },
          include: { items: true },
        })
        createdOrders.push(order)
        if (hasService) serviceOrders.push(order)
      }

      for (const [productId, qty] of goodsAdjustments) {
        await prisma.product.update({ where: { id: productId }, data: { stockCount: { decrement: qty } } })
      }

      if (uid != null) {
        const cart = await prisma.cart.findFirst({ where: { userId: uid }, include: { items: true } })
        if (cart?.items.length) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
      }

      const sellerCache = new Map()
      let buyerUser = null
      if (uid != null) {
        buyerUser = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } })
      }

      for (const order of serviceOrders) {
        try {
          const serviceItems = order.items.filter((it) => productById.get(it.productId)?.type === 'service')
          if (!serviceItems.length) continue
          let sellerContact = null
          if (order.sellerId) {
            sellerContact = sellerCache.get(order.sellerId)
            if (!sellerContact) {
              sellerContact = await prisma.user.findUnique({ where: { id: order.sellerId }, select: { email: true, name: true } })
              sellerCache.set(order.sellerId, sellerContact)
            }
          }
          const appointmentList = serviceItems
            .map((item) => {
              const at = item.appointmentAt ? new Date(item.appointmentAt) : null
              return `<li><strong>${item.title}</strong> — ${at ? at.toLocaleString() : 'Pending time'}</li>`
            })
            .join('')
          const sellerEmail = sellerContact?.email
          if (sellerEmail) {
            await sendMarketplaceEmail({
              to: sellerEmail,
              subject: 'New service booking request on Hedgetech',
              html: `
                <h2>New booking request</h2>
                <p>You have a new service booking request from ${customerName || customerEmail || buyerUser?.name || buyerUser?.email || 'a Hedgetech buyer'}.</p>
                <ul>${appointmentList}</ul>
                <p>Buyer contact: ${customerEmail || buyerUser?.email || 'Not provided'}${customerPhone ? ` | Phone: ${customerPhone}` : ''}</p>
              `,
            })
          }
          const buyerEmail = customerEmail || buyerUser?.email
          if (buyerEmail) {
            await sendMarketplaceEmail({
              to: buyerEmail,
              subject: 'Your service booking request is pending confirmation',
              html: `
                <h2>We received your service request</h2>
                <p>Thanks for booking with Hedgetech. The provider will confirm the appointment shortly.</p>
                <ul>${appointmentList}</ul>
                <p>We will email you once the provider confirms.</p>
              `,
            })
          }
        } catch (err) {
          console.error('Failed to send service booking email:', err)
        }
      }

      res.status(201).json(createdOrders[0] || null)
    } catch (e) {
      console.error('POST /api/checkout error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // POS: Seller creates an in-person order and records payment
  router.post('/pos/orders', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const { items = [], customerName, customerEmail, customerPhone } = req.body || {}
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items required' })

      const productIds = items.map((i) => i.productId).filter(Boolean)
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, ownerId: true } })
      const byId = new Map(products.map((p) => [p.id, p]))
      // Validate seller owns all products
      for (const i of items) {
        const p = byId.get(i.productId)
        if (!p || p.ownerId !== sellerId) return res.status(403).json({ error: 'Cannot sell items you do not own' })
      }

      const total = items.reduce((a, c) => a + Number(c.price || 0) * Number(c.quantity || 0), 0)
      const order = await prisma.order.create({
        data: {
          buyerId: null,
          sellerId,
          total: Math.max(0, Math.round(total)),
          status: 'paid',
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          items: { create: items.map((i) => ({
            productId: i.productId,
            title: i.title,
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 1),
          })) },
        },
        include: { items: true },
      })
      res.status(201).json(order)
    } catch (e) {
      console.error('POST /api/pos/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/orders', async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      const orders = await prisma.order.findMany({
        where: { buyerId: ownerId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          seller: { select: { id: true, name: true, email: true, paymentInstructions: true } },
        },
      })
      res.json(orders)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Public order tracking by access code (must be before '/orders/:id')
  router.get('/orders/track', async (req, res) => {
    try {
      const code = String(req.query.code || '')
      if (!code) return res.status(400).json({ error: 'Missing code' })
      let order = await prisma.order.findFirst({
        where: { accessCode: code },
        include: {
          items: { include: { product: true } },
          seller: { select: { id: true, name: true, email: true, paymentInstructions: true } },
        },
      })
      // Fallback for convenience: if a guest pastes the order id instead of the access code,
      // allow tracking by id as long as the order has an accessCode (guest checkout only).
      if (!order) {
        const byId = await prisma.order.findUnique({
          where: { id: code },
          include: {
            items: { include: { product: true } },
            seller: { select: { id: true, name: true, email: true, paymentInstructions: true } },
          },
        })
        if (byId?.accessCode) order = byId
      }
      if (!order) return res.status(404).json({ error: 'Not found' })
      res.json({ ...order, sellerPaymentInstructions: order.seller?.paymentInstructions || null })
    } catch (e) {
      console.error('GET /api/orders/track error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/orders/pay-with-code', (_req, res) => {
    return res.status(410).json({
      error: 'Direct card payments are disabled. Please pay the seller using the instructions shared with your order.',
    })
  })

  router.post('/orders/:id/mark-paid', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      if (!['pending', 'scheduled'].includes(order.status)) {
        return res.status(400).json({ error: 'Only pending or scheduled orders can be marked as paid' })
      }
      const updated = await prisma.order.update({ where: { id }, data: { status: 'paid' } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/mark-paid error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Secure single-order fetch for buyer or seller
  router.get('/orders/:id', ensureAuth, async (req, res) => {
    try {
      const uid = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(uid)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      // Fetch order with relations
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          buyer: true,
          seller: { select: { id: true, name: true, email: true, paymentInstructions: true } },
        },
      })
      if (!order) return res.status(404).json({ error: 'Not found' })
      // Authorize: buyer or seller (explicit or via product owner)
      const isBuyer = order.buyerId === uid
      const isSeller = order.sellerId === uid || order.items.some((it) => it.product?.ownerId === uid)
      if (!isBuyer && !isSeller) return res.status(403).json({ error: 'Forbidden' })
      res.json(order)
    } catch (e) {
      console.error('GET /api/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  

  // Admin: list all orders across buyers and sellers
  router.get('/admin/orders', ensureAuth, async (_req, res) => {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true, buyer: true, seller: true },
      })
      res.json(orders)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/admin/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller orders listing for dashboard
  router.get('/seller/orders', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { sellerId },
            { items: { some: { product: { ownerId: sellerId } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } }, buyer: true },
      })
      res.json(orders)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/seller/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller confirms service appointments for an order (sets appointmentStatus to 'confirmed' and order to 'scheduled')
  router.post('/orders/:id/confirm-appointment', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          buyer: { select: { email: true, name: true } },
        },
      })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      if (serviceItemIds.length === 0) return res.status(400).json({ error: 'No service items to confirm' })
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: 'confirmed' } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
      const buyerEmail = order.customerEmail || order.buyer?.email
      if (buyerEmail) {
        try {
          const appointments = order.items
            .filter((item) => item.product?.type === 'service')
            .map((item) => {
              const when = item.appointmentAt ? new Date(item.appointmentAt).toLocaleString() : 'Pending time'
              return `<li><strong>${item.title}</strong> — ${when}</li>`
            })
            .join('')
          await sendMarketplaceEmail({
            to: buyerEmail,
            subject: 'Your Hedgetech appointment is confirmed',
            html: `
              <h2>Appointment confirmed</h2>
              <p>Your provider confirmed the following service booking:</p>
              <ul>${appointments}</ul>
              <p>We look forward to seeing you.</p>
            `,
          })
        } catch (err) {
          console.error('Failed to send confirmation email:', err)
        }
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/confirm-appointment error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller marks service as completed
  router.post('/orders/:id/complete-service', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'completed' } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/complete-service error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller rejects requested appointment and optionally proposes alternates (array of ISO strings)
  router.post('/orders/:id/appointment/reject-propose', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { proposals } = req.body || {}
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          buyer: { select: { email: true, name: true } },
        },
      })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      if (serviceItemIds.length === 0) return res.status(400).json({ error: 'No service items to update' })
      const alternatesJson = Array.isArray(proposals) ? JSON.stringify(proposals) : JSON.stringify([])
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: proposals && proposals.length ? 'proposed' : 'rejected', appointmentAlternates: alternatesJson } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'pending' } })
      const buyerEmail = order.customerEmail || order.buyer?.email
      if (buyerEmail) {
        try {
          const proposalList = Array.isArray(proposals) && proposals.length
            ? proposals
                .map((p) => {
                  const dt = new Date(p)
                  return Number.isNaN(dt.getTime()) ? null : `<li>${dt.toLocaleString()}</li>`
                })
                .filter(Boolean)
                .join('')
            : ''
          await sendMarketplaceEmail({
            to: buyerEmail,
            subject: proposals && proposals.length ? 'New appointment times proposed' : 'Appointment request declined',
            html: proposals && proposals.length
              ? `
                <h2>New appointment options</h2>
                <p>Your provider proposed new times for your service booking:</p>
                <ul>${proposalList}</ul>
                <p>Sign in to Hedgetech to choose one of the proposed slots.</p>
              `
              : `
                <h2>Appointment update</h2>
                <p>Your provider was unable to accept the requested time. Please sign in to propose a new slot.</p>
              `,
          })
        } catch (err) {
          console.error('Failed to send appointment proposal email:', err)
        }
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/appointment/reject-propose error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Buyer accepts one of seller's proposed alternates
  router.post('/orders/:id/appointment/accept', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { date } = req.body || {}
      if (!date) return res.status(400).json({ error: 'Missing date' })
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          seller: { select: { email: true, name: true } },
          buyer: { select: { email: true, name: true } },
        },
      })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentAt: new Date(date), appointmentStatus: 'scheduled', appointmentAlternates: null } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
      try {
        const appointmentTime = new Date(date)
        const formatted = Number.isNaN(appointmentTime.getTime()) ? null : appointmentTime.toLocaleString()
        const serviceTitles = order.items.filter((it) => it.product?.type === 'service').map((it) => it.title).join(', ')
        const sellerEmail = order.seller?.email
        if (sellerEmail) {
          await sendMarketplaceEmail({
            to: sellerEmail,
            subject: 'A buyer accepted your proposed appointment',
            html: `
              <h2>Appointment scheduled</h2>
              <p>Your buyer confirmed ${serviceTitles || 'the service booking'} for ${formatted || 'the selected time'}.</p>
              <p>Get ready to deliver the service.</p>
            `,
          })
        }
        const buyerEmail = order.customerEmail || order.buyer?.email
        if (buyerEmail) {
          await sendMarketplaceEmail({
            to: buyerEmail,
            subject: 'Appointment scheduled with your provider',
            html: `
              <h2>Appointment locked in</h2>
              <p>You scheduled ${serviceTitles || 'your service'} for ${formatted || 'the selected time'}.</p>
              <p>If you need to make any changes, contact your provider.</p>
            `,
          })
        }
      } catch (err) {
        console.error('Failed to send appointment acceptance emails:', err)
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/appointment/accept error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Buyer pays for a completed service
  router.post('/orders/:id/pay', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      if (order.status !== 'completed') return res.status(400).json({ error: 'Order not completed' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'paid' } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/pay error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller marks order as shipped (must acknowledge paid)
  router.post('/orders/:id/ship', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { ackPaid } = req.body || {}
      if (ackPaid !== true) return res.status(400).json({ error: 'Must acknowledge payment before shipping' })
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      if (order.status !== 'paid') return res.status(400).json({ error: 'Order not in paid status' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'shipped' } })
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/orders/:id/ship error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Buyer confirms receipt
  router.post('/orders/:id/received', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      if (order.status !== 'shipped') return res.status(400).json({ error: 'Order not in shipped status' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'completed' } })
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/orders/:id/received error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })


  // Buyer leaves a review (rating + feedback) on a paid/shipped/completed order
  router.get('/orders/:id/review', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const review = await prisma.orderReview.findUnique({ where: { orderId: id } })
      if (!review || review.buyerId !== buyerId) return res.json(null)
      res.json({ rating: review.rating, feedback: review.feedback })
    } catch (e) {
      console.error('GET /api/orders/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/orders/:id/review', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { rating, feedback } = req.body || {}
      const r = Number(rating)
      if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be 1-5' })
      if (!feedback || String(feedback).trim().length < 3) return res.status(400).json({ error: 'Feedback required' })
      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      if (!['paid', 'shipped', 'completed'].includes(order.status)) return res.status(400).json({ error: 'Order not eligible for review' })
      // Disallow multiple ratings for the same order
      const existing = await prisma.orderReview.findUnique({ where: { orderId: id } })
      if (existing) return res.status(400).json({ error: 'You have already rated this order' })
      const sellerId = order.sellerId ?? (order.items[0]?.product?.ownerId ?? null)
      if (!sellerId) return res.status(400).json({ error: 'Missing seller' })
      const saved = await prisma.orderReview.create({ data: { orderId: id, buyerId, sellerId, rating: r, feedback: String(feedback).trim() } })
      res.json({ rating: saved.rating, feedback: saved.feedback })
    } catch (e) {
      console.error('POST /api/orders/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Public user lookup by id for displaying seller summary
  router.get('/users/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      if (!Number.isFinite(id)) return res.status(400).send('Invalid id')
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, image: true, createdAt: true, phoneNo: true, ABN: true } })
      if (!user) return res.status(404).json(null)
      const rep = await prisma.userReputation.findUnique({ where: { userId: id } })
      let avg = 5
      try {
        const a = await prisma.orderReview.aggregate({ where: { sellerId: id }, _avg: { rating: true } })
        avg = a?._avg?.rating || 5
      } catch {}
      const negativeCount = rep?.negativeCount || 0
      const rating = compositeRating(avg, negativeCount)
      res.json({ ...user, rating, averageRating: avg, negativeCount })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/users/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Public: list seller reviews + summary
  router.get('/users/:id/reviews', async (req, res) => {
    try {
      const sellerId = Number(req.params.id)
      if (!Number.isFinite(sellerId)) return res.status(400).send('Invalid id')

      // Aggregate average and counts per rating
      let avg = 0
      let count = 0
      const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      try {
        if (prisma?.orderReview?.groupBy) {
          const byRating = await prisma.orderReview.groupBy({
            by: ['sellerId', 'rating'],
            where: { sellerId },
            _count: { _all: true },
          })
          for (const r of byRating) {
            const rt = Number(r.rating)
            const c = r._count?._all || 0
            if (histogram[rt] != null) histogram[rt] += c
            count += c
            avg += rt * c
          }
          avg = count > 0 ? avg / count : 0
        } else {
          // Fallback: fetch reviews and compute in JS
          const all = await prisma.orderReview.findMany({ where: { sellerId }, select: { rating: true } })
          for (const r of all) {
            const rt = Number(r.rating)
            if (histogram[rt] != null) histogram[rt] += 1
            count += 1
            avg += rt
          }
          avg = count > 0 ? avg / count : 0
        }
      } catch {
        // ignore aggregation errors
      }

      const reviews = await prisma.orderReview.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        select: {
          orderId: true,
          rating: true,
          feedback: true,
          createdAt: true,
          buyer: { select: { id: true, name: true, email: true, image: true } },
        },
      })

      // Include composite with negative report penalty
      const rep = await prisma.userReputation.findUnique({ where: { userId: sellerId } })
      const negativeCount = rep?.negativeCount || 0
      const composite = compositeRating(avg || 5, negativeCount)
      res.json({ avg, count, histogram, reviews, composite, negativeCount })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/users/:id/reviews error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/users/:id/rate-negative', ensureAuth, async (req, res) => {
    try {
      const sellerId = Number(req.params.id)
      if (!Number.isFinite(sellerId)) return res.status(400).send('Invalid id')
      const { reason } = req.body || {}
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return res.status(400).json({ error: 'Reason is required' })
      }
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')

      // Verify buyer has at least one PAID order containing a product by this seller
      const eligibleOrder = await prisma.order.findFirst({
        where: {
          buyerId,
          status: 'paid',
          items: { some: { product: { ownerId: sellerId } } },
        },
        select: { id: true },
      })
      if (!eligibleOrder) {
        return res.status(403).json({ error: 'Not eligible to report' })
      }

      // Record report and update reputation
      await prisma.negativeReport.create({ data: { buyerId, sellerId, orderId: eligibleOrder.id, reason: String(reason).trim() } })
      const updated = await prisma.userReputation.upsert({
        where: { userId: sellerId },
        update: { negativeCount: { increment: 1 } },
        create: { userId: sellerId, negativeCount: 1 },
      })
      const rating = Math.max(1, 5 - (updated?.negativeCount || 0))
      res.json({ negativeCount: updated.negativeCount, rating })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/users/:id/rate-negative error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Admin: update order status (confirm paid, posted/shipped, completed, cancelled)
  router.post('/admin/orders/:id/status', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      const { status } = req.body || {}
      const allowed = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })
      const exists = await prisma.order.findUnique({ where: { id } })
      if (!exists) return res.status(404).json({ error: 'Not found' })
      const updated = await prisma.order.update({ where: { id }, data: { status } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/admin/orders/:id/status error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Admin: delete an order
  router.delete('/admin/orders/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      await prisma.order.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/admin/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: list published posts or author posts
  router.get('/blog/posts', async (req, res) => {
    try {
      const author = req.query.authorId ? Number(req.query.authorId) : undefined
      const where = author ? { authorId: author } : { published: true }
      const posts = await prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, slug: true, title: true, coverImage: true, tags: true, createdAt: true, published: true, authorId: true },
      })
      res.json(posts)
    } catch (e) {
      console.error('GET /api/blog/posts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: fetch by slug
  router.get('/blog/posts/:slug', async (req, res) => {
    try {
      const slug = String(req.params.slug)
      const post = await prisma.blogPost.findUnique({ where: { slug } })
      if (!post || (!post.published && !req.user?.uid)) return res.status(404).json({ error: 'Not found' })
      res.json(post)
    } catch (e) {
      console.error('GET /api/blog/posts/:slug error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: create new post
  router.post('/blog/posts', ensureAuth, async (req, res) => {
    try {
      const { title, slug, content, coverImage, tags = [], published = false } = req.body || {}
      if (!title || !slug || !content) return res.status(400).json({ error: 'Missing required fields' })
      const data = { title, slug, content, coverImage: coverImage || null, tags: Array.isArray(tags) ? tags : [], published: !!published, authorId: req.user?.uid ? Number(req.user.uid) : null }
      const created = await prisma.blogPost.create({ data })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/blog/posts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: update post by id
  router.put('/blog/posts/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      const { title, slug, content, coverImage, tags, published } = req.body || {}
      const data = {
        title: title ?? undefined,
        slug: slug ?? undefined,
        content: content ?? undefined,
        coverImage: coverImage === undefined ? undefined : (coverImage || null),
        tags: Array.isArray(tags) ? tags : undefined,
        published: typeof published === 'boolean' ? published : undefined,
      }
      const updated = await prisma.blogPost.update({ where: { id }, data })
      res.json(updated)
    } catch (e) {
      console.error('PUT /api/blog/posts/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: delete post
  router.delete('/blog/posts/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      await prisma.blogPost.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/blog/posts/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // AI: generate a marketing description for a product
  router.post('/ai/description', async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return res.status(400).json({ error: 'Missing OPENAI_API_KEY' })

      const {
        title,
        price,
        type,
        categoryName,
        seller,
        tone = 'friendly',
        existing,
        existingDescription,
        description,
      } = req.body || {}

      if (!title) return res.status(400).json({ error: 'Missing title' })

      const sys = `You are a helpful product copywriter for an online marketplace in Australia. Write concise, persuasive descriptions (120–220 words) with short paragraphs.`
      const existingNotes = String(existing || existingDescription || description || '').trim()
      const user = `Write a ${tone} product description for the following item:

Name: ${title}
${Number.isFinite(Number(price)) ? `Price: A$${Number(price)}` : ''}
${type ? `Type: ${type}` : ''}
${categoryName ? `Category: ${categoryName}` : ''}
${seller ? `Seller: ${seller}` : ''}
${existingNotes ? `\nExisting notes/details (incorporate and improve):\n${existingNotes}` : ''}

Guidelines:
- Open with a strong single-sentence hook
- Summarise key benefits (not just features)
- Use clear, simple language; no hype words like “best ever”
- Add a short scannable list of 3 benefit bullets
- End with a one‑line call to action

Output as plain text with paragraphs separated by a blank line. Include the 3 bullets as a dash list.`

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: user },
          ],
          temperature: 0.7,
          max_tokens: 350,
        }),
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        return res.status(500).json({ error: 'OpenAI error', detail: text })
      }
      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content?.trim?.() || ''
      return res.json({ description: content })
    } catch (e) {
      console.error('POST /api/ai/description error:', e)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // One-off: apply missing Product columns (description TEXT, images TEXT[])
  // Protected via secret key. Invoke with: POST /api/admin/migrate/product-columns?key=STACK_SECRET_SERVER_KEY
  router.post('/admin/migrate/product-columns', async (req, res) => {
    try {
      const provided = String(req.query.key || req.headers['x-admin-key'] || '')
      const secret = String(process.env.STACK_SECRET_SERVER_KEY || '')
      if (!secret || provided !== secret) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const results = []
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "description" TEXT')
        results.push({ op: 'add_column', column: 'description', ok: true })
      } catch (e) {
        results.push({ op: 'add_column', column: 'description', ok: false, error: e?.message || String(e) })
      }
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[]')
        results.push({ op: 'add_column', column: 'images', ok: true })
      } catch (e) {
        results.push({ op: 'add_column', column: 'images', ok: false, error: e?.message || String(e) })
      }
      return res.json({ ok: true, results })
    } catch (e) {
      console.error('POST /api/admin/migrate/product-columns error:', e)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  function serializeTelegramIntegration(entry, req) {
    if (!entry) return null
    const base = baseUrlFromRequest(req)
    return {
      id: entry.id,
      botUsername: entry.botUsername,
      connectedAt: entry.updatedAt,
      webhookUrl: `${base}/api/integrations/telegram/webhook?secret=${entry.webhookSecret}`,
    }
  }

  router.get('/integrations/telegram', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user?.uid)
      if (!Number.isFinite(uid)) return res.status(401).json({ error: 'Unauthorized' })
      const integration = await prisma.telegramIntegration.findUnique({ where: { userId: uid } })
      if (!integration) return res.json(null)
      res.json(serializeTelegramIntegration(integration, req))
    } catch (e) {
      console.error('GET /api/integrations/telegram error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/integrations/telegram', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user?.uid)
      if (!Number.isFinite(uid)) return res.status(401).json({ error: 'Unauthorized' })
      const { botToken, botUsername } = req.body || {}
      if (!botToken || !botUsername) return res.status(400).json({ error: 'Missing bot token or username' })
      const normalizedUsername = String(botUsername).trim().replace(/^@/, '')
      if (!normalizedUsername) return res.status(400).json({ error: 'Invalid bot username' })

      // Validate token with Telegram getMe to ensure it's correct.
      try {
        const verifyResp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
        if (!verifyResp.ok) {
          const detail = await verifyResp.text().catch(() => '')
          return res.status(400).json({ error: 'Failed to verify bot token', detail })
        }
        const verifyJson = await verifyResp.json()
        if (!verifyJson?.ok) {
          return res.status(400).json({ error: 'Telegram rejected bot token', detail: verifyJson })
        }
      } catch (err) {
        console.error('Telegram token verification failed', err)
        return res.status(400).json({ error: 'Unable to verify bot token' })
      }

      const existing = await prisma.telegramIntegration.findUnique({ where: { userId: uid } })
      let record
      if (existing) {
        record = await prisma.telegramIntegration.update({
          where: { id: existing.id },
          data: {
            botToken,
            botUsername: normalizedUsername,
          },
        })
      } else {
        record = await prisma.telegramIntegration.create({
          data: {
            userId: uid,
            botToken,
            botUsername: normalizedUsername,
            webhookSecret: randomBytes(16).toString('hex'),
          },
        })
      }
      res.json(serializeTelegramIntegration(record, req))
    } catch (e) {
      console.error('POST /api/integrations/telegram error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Telegram webhook endpoint (public, per integration via secret query)
  router.post('/integrations/telegram/webhook', async (req, res) => {
    try {
      const secret = String(req.query.secret || '')
      if (!secret) return res.status(404).json({ ok: false })
      const integration = await prisma.telegramIntegration.findUnique({
        where: { webhookSecret: secret },
        include: { user: true },
      })
      if (!integration) return res.status(404).json({ ok: false })

      const update = req.body || {}
      const message = update.message || update.edited_message
      if (!message || !message.text) return res.json({ ok: true })

      const openaiKey = process.env.OPENAI_API_KEY
      const text = String(message.text || '')
      const catalog = await prisma.product.findMany({
        where: { ownerId: integration.userId },
        take: 20,
      })
      const catalogSummary = catalog
        .map((product) => {
          const price = product.price
          const priceText = Number.isFinite(price) ? `A$${price}` : 'Price on request'
          return `- ${product.title} (${product.type}) — ${priceText}. ${product.description || ''}`.trim()
        })
        .join('\n')

      let reply = 'Thanks for reaching out. A concierge will respond shortly.'
      if (openaiKey) {
        const systemPrompt = `You are Hedgetech's WhatsApp/Telegram concierge for ${integration.user?.name || 'our marketplace merchant'}.
You know the provided product catalog. Answer concisely, promote relevant items, and offer to connect them with the AI concierge or checkout links.
If a product fits, mention it and outline price and fulfilment timeline.`
        const userPrompt = [
          `Buyer message: ${text}`,
          '',
          'Product catalog:',
          catalogSummary || 'No products are currently synced. Offer to take details for manual follow-up.',
        ].join('\n')
        try {
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.5,
              max_tokens: 400,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          })
          if (resp.ok) {
            const data = await resp.json()
            reply = data?.choices?.[0]?.message?.content?.trim?.() || reply
          }
        } catch (err) {
          console.error('Telegram concierge OpenAI error', err)
        }
      }

      try {
        await fetch(`https://api.telegram.org/bot${integration.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: reply,
            reply_to_message_id: message.message_id,
          }),
        })
      } catch (err) {
        console.error('Failed to send Telegram reply', err)
      }

      return res.json({ ok: true })
    } catch (e) {
      console.error('POST /api/integrations/telegram/webhook error:', e)
      return res.status(500).json({ ok: false })
    }
  })

  router.get('/integrations/telegram/webhook', async (req, res) => {
    const secret = String(req.query.secret || '')
    if (!secret) return res.status(400).json({ ok: true, message: 'Provide ?secret=...' })
    const integration = await prisma.telegramIntegration.findUnique({ where: { webhookSecret: secret } })
    if (!integration) return res.status(404).json({ ok: false })
    return res.json({ ok: true, botUsername: integration.botUsername })
  })

  return router
}
