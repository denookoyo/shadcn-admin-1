import { proxyGangLedgerJson } from '../../../server/consumer.js'

export default function handler(req: any, res: any) {
  const queryPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path
  const path = String(queryPath || '').replace(/^\/+/, '')
  const remotePath = `/api/integrations/marketplace/real-estate${path ? `/${path}` : ''}`
  return proxyGangLedgerJson(req, res, remotePath, {
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    notSupportedMessage: 'Real estate listings are managed by Gang Ledger.',
  })
}
