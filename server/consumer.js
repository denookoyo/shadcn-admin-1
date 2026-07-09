const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALLBACK_GANGLEDGER_BASE_URL = 'http://localhost:3000'

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

  const headers = { Accept: 'application/json' }
  if (req.headers?.['content-type']) headers['Content-Type'] = req.headers['content-type']

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
