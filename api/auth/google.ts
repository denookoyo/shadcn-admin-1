// Vercel Node function for POST /api/auth/google
import express from 'express'
import { createAuthRouter } from '../_bridge'

const app = express()
app.use(express.json())
app.use('/', createAuthRouter())

export default function handler(req: any, res: any) {
  // Normalize path to the router's route
  try {
    const url = (req.url || '')
    if (url.endsWith('/api/auth/google')) (req as any).url = '/google'
  } catch {}
  return (app as any)(req, res)
}
