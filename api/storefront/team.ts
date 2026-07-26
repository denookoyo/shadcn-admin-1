import { isMarketplaceConsumerMode, proxyGangLedgerJson } from '../../server/consumer.js'

export default function handler(req: any, res: any) {
  if (!isMarketplaceConsumerMode()) {
    return res.status(501).json({ ok: false, error: 'not_supported', message: 'Storefront staff are managed through Gang Ledger.' })
  }
  return proxyGangLedgerJson(req, res, '/api/integrations/marketplace/storefront/team', {
    allowMethods: ['GET', 'POST', 'PATCH'],
    notSupportedMessage: 'Storefront staff are managed through Gang Ledger.',
  })
}
