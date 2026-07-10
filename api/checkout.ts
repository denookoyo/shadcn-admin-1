import express from 'express'
import { authMiddleware, createApiRouter } from './_bridge.js'
import { isMarketplaceConsumerMode, proxyGangLedgerJson } from '../server/consumer.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())
const MARKETPLACE_CONSUMER_MODE = isMarketplaceConsumerMode()

export default function handler(req: any, res: any) {
  if (MARKETPLACE_CONSUMER_MODE) {
    return proxyGangLedgerJson(req, res, '/api/integrations/marketplace/checkout', {
      allowMethods: ['POST'],
      notSupportedMessage: 'Checkout is managed through Gang Ledger.',
    })
  }
  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/checkout/, '/checkout')
  } catch {}
  return (app as any)(req, res)
}
