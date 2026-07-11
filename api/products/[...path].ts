import express from 'express'
import { authMiddleware, createApiRouter } from '../_bridge.js'
import { isMarketplaceConsumerMode, proxyGangLedgerJson } from '../../server/consumer.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())
const MARKETPLACE_CONSUMER_MODE = isMarketplaceConsumerMode()

export default function handler(req: any, res: any) {
  if (MARKETPLACE_CONSUMER_MODE) {
    const requestUrl = String(req.url || '')
    const remotePath =
      requestUrl.replace(/^\/api\/products/, '/api/integrations/marketplace/products') ||
      '/api/integrations/marketplace/products'
    return proxyGangLedgerJson(req, res, remotePath, {
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      notSupportedMessage: 'Product reads and edits are synchronized through Gang Ledger.',
    })
  }

  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/products/, '/products')
  } catch {}
  return (app as any)(req, res)
}
