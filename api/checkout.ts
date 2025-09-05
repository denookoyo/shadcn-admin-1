import express from 'express'
import { authMiddleware } from '../server/auth.js'
import { createApiRouter } from '../server/api.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())

export default function handler(req: any, res: any) {
  try {
    const url = String(req.url || '')
    ;(req as any).url = url.replace(/^\/api\/checkout/, '/checkout')
  } catch {}
  return (app as any)(req, res)
}

