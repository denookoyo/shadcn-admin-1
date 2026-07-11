import { isMarketplaceConsumerMode, proxyGangLedgerJson } from '../../server/consumer.js'

export default function handler(req: any, res: any) {
  if (!isMarketplaceConsumerMode()) {
    return res.status(501).json({
      ok: false,
      error: 'not_supported',
      message: 'Stripe Connect onboarding is managed through Gang Ledger.',
    })
  }

  return proxyGangLedgerJson(req, res, '/api/integrations/marketplace/stripe/connect', {
    allowMethods: ['POST'],
    notSupportedMessage: 'Stripe Connect onboarding is managed through Gang Ledger.',
  })
}
