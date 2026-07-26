import express from 'express'
import { authMiddleware, createApiRouter } from './_bridge.js'
import { buildRemoteProductsPath } from './_product-path.js'
import { isMarketplaceConsumerMode, proxyGangLedgerJson } from '../server/consumer.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())
const MARKETPLACE_CONSUMER_MODE = isMarketplaceConsumerMode()

export default function handler(req: any, res: any) {
  if (MARKETPLACE_CONSUMER_MODE) {
    const incomingUrl = new URL(String(req.url || '/api/products'), 'http://localhost')
    const rewrittenPath = String(incomingUrl.searchParams.get('path') || '').trim().replace(/^\/+/, '')
    const normalizedPath = rewrittenPath ? `/${rewrittenPath}` : incomingUrl.pathname.replace(/^\/api\/products/, '') || ''
    const barcodeMatch = normalizedPath.match(/^\/barcode\/(.+)$/)
    const forwardedSearch = new URLSearchParams(incomingUrl.searchParams)
    forwardedSearch.delete('path')
    const query = forwardedSearch.toString()
    const remotePath = barcodeMatch
      ? `/api/integrations/marketplace/products/barcode/${encodeURIComponent(decodeURIComponent(barcodeMatch[1]).trim())}${query ? `?${query}` : ''}`
      : buildRemoteProductsPath(req)
    return proxyGangLedgerJson(req, res, remotePath, {
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      notSupportedMessage: 'Product edits are synchronized through Gang Ledger.',
    })
  }

  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/products/, '/products')
  } catch {}
  return (app as any)(req, res)
}
