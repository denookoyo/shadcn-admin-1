import express from 'express'
import { authMiddleware, createApiRouter } from '../_bridge.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())

export default function handler(req: any, res: any) {
  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/pos\/orders/, '/pos/orders')
  } catch {}
  return (app as any)(req, res)
}
