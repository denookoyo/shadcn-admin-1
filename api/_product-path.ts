export function buildRemoteProductsPath(req: any) {
  const incomingUrl = new URL(String(req.url || '/api/products'), 'http://localhost')
  const rewrittenPath = String(incomingUrl.searchParams.get('path') || '').trim().replace(/^\/+/, '')
  const normalizedPath = rewrittenPath ? `/${rewrittenPath}` : incomingUrl.pathname.replace(/^\/api\/products/, '') || ''
  const forwardedSearch = new URLSearchParams(incomingUrl.searchParams)
  forwardedSearch.delete('path')
  const query = forwardedSearch.toString()
  return `/api/integrations/marketplace/products${normalizedPath}${query ? `?${query}` : ''}`
}
