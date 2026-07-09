import { isMarketplaceConsumerMode, notSupportedInConsumerMode, proxyGangLedgerMultipart } from '../../server/consumer.js'

const MARKETPLACE_CONSUMER_MODE = isMarketplaceConsumerMode()

export default function handler(req: any, res: any) {
  if (MARKETPLACE_CONSUMER_MODE) {
    return proxyGangLedgerMultipart(req, res, '/api/integrations/marketplace/uploads', {
      allowMethods: ['POST'],
      notSupportedMessage: 'Uploads are synchronized through Gang Ledger.',
    })
  }

  return notSupportedInConsumerMode(res, 'Marketplace uploads are not enabled in this environment.')
}
