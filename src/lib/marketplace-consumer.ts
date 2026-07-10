const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

function trimTrailingSlash(value?: string) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export const marketplaceConsumerMode = TRUE_VALUES.has(
  String(import.meta.env.VITE_MARKETPLACE_CONSUMER_MODE || '').trim().toLowerCase()
)

export const gangLedgerBaseUrl = trimTrailingSlash(import.meta.env.VITE_GANGLEDGER_BASE_URL)

export function normalizeMarketplaceRedirectTarget(value?: string | null, fallback = '/') {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('/')) return trimmed

  try {
    const url = new URL(trimmed)
    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}

export function buildGangLedgerSignInUrl(redirect?: string | null) {
  const baseUrl = gangLedgerBaseUrl || 'http://localhost:3000'
  const url = new URL('/api/integrations/marketplace/sso/start', baseUrl)
  url.searchParams.set('redirect', normalizeMarketplaceRedirectTarget(redirect))
  return url.toString()
}

export function buildGangLedgerAppUrl(path = '/', redirect?: string | null) {
  const baseUrl = gangLedgerBaseUrl || 'http://localhost:3000'
  const url = new URL(path.startsWith('/') ? path : `/${path}`, baseUrl)
  if (redirect) {
    url.searchParams.set('redirect', normalizeMarketplaceRedirectTarget(redirect))
  }
  return url.toString()
}
