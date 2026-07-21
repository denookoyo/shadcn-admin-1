export function buildRemoteOrdersPath(req: any) {
  const incomingUrl = new URL(String(req?.url || '/api/orders'), 'http://localhost')
  const queryPath = Array.isArray(req?.query?.path) ? req.query.path.join('/') : req?.query?.path
  const rewrittenPath = String(queryPath || incomingUrl.searchParams.get('path') || '').trim().replace(/^\/+/, '')
  const normalizedPath = rewrittenPath ? `/${rewrittenPath}` : incomingUrl.pathname.replace(/^\/api\/orders/, '') || ''
  return `/api/integrations/marketplace/orders${normalizedPath}`
}
