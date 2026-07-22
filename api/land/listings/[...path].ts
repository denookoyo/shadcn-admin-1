import { proxyGangLedgerJson } from '../../../server/consumer.js'

function remotePath(req: any) {
  const queryPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path
  const path = String(queryPath || '').replace(/^\/+/, '')
  return `/api/integrations/marketplace/real-estate${path ? `/${path}` : ''}`
}

export default function handler(req: any, res: any) {
  return proxyGangLedgerJson(req, res, remotePath(req), {
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    notSupportedMessage: 'Real estate listings are managed by Gang Ledger.',
  })
}
