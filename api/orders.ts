import express from 'express'
import { authMiddleware, createApiRouter } from './_bridge.js'
import { isMarketplaceConsumerMode, proxyGangLedgerJson } from '../server/consumer.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())
const MARKETPLACE_CONSUMER_MODE = isMarketplaceConsumerMode()

function buildRemoteOrdersPath(req: any) {
  const incomingUrl = new URL(String(req.url || '/api/orders'), 'http://localhost')
  const rewrittenPath = String(incomingUrl.searchParams.get('path') || '').trim().replace(/^\/+/, '')
  const normalizedPath = rewrittenPath ? `/${rewrittenPath}` : incomingUrl.pathname.replace(/^\/api\/orders/, '') || ''
  return `/api/integrations/marketplace/orders${normalizedPath}`
}

export default function handler(req: any, res: any) {
  if (MARKETPLACE_CONSUMER_MODE) {
    const remotePath = buildRemoteOrdersPath(req)
    return proxyGangLedgerJson(req, res, remotePath, {
      allowMethods: ['GET', 'POST'],
      notSupportedMessage: 'Marketplace orders are managed by Gang Ledger.',
    })
  }
  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/orders/, '/orders')
  } catch {}
  return (app as any)(req, res)
}
