import express from 'express'
import { authMiddleware, createAuthRouter } from '../_bridge.ts'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createAuthRouter())

export default function handler(req: any, res: any) {
  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/auth\/me/, '/me')
  } catch {}
  return (app as any)(req, res)
}
