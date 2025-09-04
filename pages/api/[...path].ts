// Next.js pages API bridge to existing Express routers
import type { NextApiRequest, NextApiResponse } from 'next'
import express from 'express'
import { authMiddleware, createAuthRouter } from '../../../server/auth.js'
import { createApiRouter } from '../../../server/api.js'

// Create a single Express app once per Lambda cold start
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
authMiddleware(app)
app.use('/auth', createAuthRouter())
app.use('/', createApiRouter())

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Strip the `/api` base path for Express routing
  ;(req as any).url = (req.url || '').replace(/^\/api\b/, '') || '/'
  return (app as any)(req, res)
}

