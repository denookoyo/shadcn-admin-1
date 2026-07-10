import { createHmac } from 'node:crypto'
import jwt from 'jsonwebtoken'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALLBACK_GANGLEDGER_BASE_URL = 'http://localhost:3000'
const MARKETPLACE_API_TOKEN_ISSUER = 'marketplace'
const MARKETPLACE_API_TOKEN_AUDIENCE = 'gangledger-marketplace-api'
const MARKETPLACE_API_TOKEN_TTL_SECONDS = 5 * 60
const SESSION_COOKIE_NAME = 'session'

function normalizeFlag(value) {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase())
}

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function isMarketplaceConsumerMode() {
  return normalizeFlag(process.env.MARKETPLACE_CONSUMER_MODE || process.env.VITE_MARKETPLACE_CONSUMER_MODE)
}

export function getGangLedgerBaseUrl() {
  const configured = trimTrailingSlash(process.env.GANGLEDGER_BASE_URL || process.env.VITE_GANGLEDGER_BASE_URL)
  return configured || FALLBACK_GANGLEDGER_BASE_URL
}

export function getMarketplaceBridgeSecret() {
  return (
    String(process.env.MARKETPLACE_BRIDGE_SECRET || '').trim() ||
    String(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-marketplace-bridge-secret').trim()
  )
}

function getSessionSecret() {
  return String(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'devsecret').trim()
}

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) return {}
  return String(cookieHeader)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex <= 0) return cookies
      const key = entry.slice(0, separatorIndex).trim()
      const value = entry.slice(separatorIndex + 1).trim()
      cookies[key] = decodeURIComponent(value)
      return cookies
    }, {})
}

function ensureRequestUser(req) {
  if (req?.user?.email || req?.user?.uid || req?.user?.sub) return req.user
  const cookies = parseCookieHeader(req?.headers?.cookie)
  const sessionToken = cookies[SESSION_COOKIE_NAME]
  if (!sessionToken) return null
  try {
    const payload = jwt.verify(sessionToken, getSessionSecret())
    if (payload && typeof payload === 'object') {
      req.user = payload
      return req.user
    }
  } catch {
    return null
  }
  return null
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function signGangLedgerBridgeToken(req, audience = MARKETPLACE_API_TOKEN_AUDIENCE) {
  ensureRequestUser(req)
  if (!req.user?.email && !req.user?.uid && !req.user?.sub) {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const role = String(req.user?.role || 'buyer').toLowerCase()
  const isAdmin = Boolean(req.user?.isAdmin) || ['admin', 'manager', 'superadmin'].includes(role)
  const payload = {
    sub: String(req.user?.uid || req.user?.sub || ''),
    email: req.user?.email || null,
    name: req.user?.name || null,
    image: req.user?.image || null,
    role,
    isAdmin,
    marketplaceEligible: Boolean(req.user?.marketplaceEligible) || Boolean(req.user?.marketplaceCatalog) || Boolean(req.user?.marketplaceApi) || isAdmin,
    marketplaceCatalog: Boolean(req.user?.marketplaceCatalog) || isAdmin,
    marketplaceApi: Boolean(req.user?.marketplaceApi) || isAdmin,
    iss: MARKETPLACE_API_TOKEN_ISSUER,
    aud: audience,
    iat: now,
    exp: now + MARKETPLACE_API_TOKEN_TTL_SECONDS,
  }
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', getMarketplaceBridgeSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest()

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`
}

function buildGangLedgerProxyHeaders(req, { accept = 'application/json', includeJsonContentType = true } = {}) {
  const headers = {}
  if (accept) headers.Accept = accept

  if (includeJsonContentType && req.headers?.['content-type']) {
    headers['Content-Type'] = req.headers['content-type']
  }

  const token = signGangLedgerBridgeToken(req)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export function normalizeMarketplaceRedirectTarget(value, fallback = '/') {
  if (!value) return fallback
  const trimmed = String(value).trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('/')) return trimmed
  try {
    const url = new URL(trimmed)
    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}

export function buildGangLedgerSsoStartUrl(redirect) {
  const url = new URL('/api/integrations/marketplace/sso/start', getGangLedgerBaseUrl())
  url.searchParams.set('redirect', normalizeMarketplaceRedirectTarget(redirect))
  return url.toString()
}

export function notSupportedInConsumerMode(res, message = 'This action is managed by Gang Ledger.') {
  return res.status(501).json({
    ok: false,
    error: 'not_supported',
    message,
  })
}

export async function proxyGangLedgerJson(req, res, remotePath, options = {}) {
  const { allowMethods = ['GET'], notSupportedMessage } = options

  if (!allowMethods.includes(req.method)) {
    return notSupportedInConsumerMode(res, notSupportedMessage)
  }

  const incomingUrl = new URL(req.url || '/', 'http://localhost')
  const targetUrl = new URL(remotePath, getGangLedgerBaseUrl())
  targetUrl.search = incomingUrl.search

  const headers = buildGangLedgerProxyHeaders(req)

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
  })

  const text = await response.text()
  const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8'
  res.status(response.status)
  res.setHeader('content-type', contentType)
  return res.send(text)
}

export async function proxyGangLedgerMultipart(req, res, remotePath, options = {}) {
  const { allowMethods = ['POST'], notSupportedMessage } = options

  if (!allowMethods.includes(req.method)) {
    return notSupportedInConsumerMode(res, notSupportedMessage)
  }

  const incomingUrl = new URL(req.url || '/', 'http://localhost')
  const targetUrl = new URL(remotePath, getGangLedgerBaseUrl())
  targetUrl.search = incomingUrl.search

  const headers = buildGangLedgerProxyHeaders(req, {
    accept: 'application/json',
    includeJsonContentType: false,
  })

  if (req.headers?.['content-type']) headers['Content-Type'] = req.headers['content-type']

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req,
    duplex: 'half',
  })

  const arrayBuffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8'
  res.status(response.status)
  res.setHeader('content-type', contentType)
  return res.send(Buffer.from(arrayBuffer))
}
