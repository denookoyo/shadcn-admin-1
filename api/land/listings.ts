import { proxyGangLedgerJson } from '../../server/consumer.js'

export default function handler(req: any, res: any) {
  return proxyGangLedgerJson(req, res, '/api/integrations/marketplace/real-estate', {
    allowMethods: ['GET', 'POST'],
    notSupportedMessage: 'Real estate listings are managed by Gang Ledger.',
  })
}
