import { proxyGangLedgerJson } from '../../server/consumer.js'

function remotePath(req: any) {
  const url = new URL(String(req.url || '/api/land/listings'), 'http://localhost')
  const queryPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path
  const rewritten = String(queryPath || url.searchParams.get('path') || '').replace(/^\/+/, '')
  const path = rewritten || url.pathname.replace(/^\/api\/land\/listings\/?/, '')
  return `/api/integrations/marketplace/real-estate${path ? `/${path}` : ''}`
}

export default function handler(req: any, res: any) {
  return proxyGangLedgerJson(req, res, remotePath(req), {
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    notSupportedMessage: 'Real estate listings are managed by Gang Ledger.',
  })
}
