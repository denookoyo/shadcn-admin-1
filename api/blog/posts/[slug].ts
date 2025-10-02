import express from 'express'
import { authMiddleware, createApiRouter } from '../../_bridge.ts'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/', createApiRouter())

export default function handler(req: any, res: any) {
  try {
    const url = String(req.url || '')
    // Normalize any single-segment under /api/blog/posts/* to /blog/posts/*
    ;(req as any).url = url.replace(/^\/api\/blog\/posts\//, '/blog/posts/')
  } catch {}
  return (app as any)(req, res)
}
