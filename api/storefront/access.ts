import { proxyGangLedgerJson } from '../../server/consumer.js'

export default function handler(req: any, res: any) {
  return proxyGangLedgerJson(req, res, '/api/integrations/marketplace/storefront/access', {
    allowMethods: ['GET'],
    notSupportedMessage: 'Storefront access is managed through Gang Ledger.',
  })
}
