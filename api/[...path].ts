// Catch-all serverless function to serve all /api/* routes on Vercel
import express from 'express'
import { authMiddleware, createAuthRouter, createApiRouter } from './_bridge'

const app = express()

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Cookie + JWT session parsing
authMiddleware(app)

// Simple request log for debugging in Vercel logs
app.use((req, _res, next) => {
  console.log('[API]', req.method, req.url, req.headers['content-type'])
  next()
})

// Mount routers at root because this file already matches /api/*
app.use('/auth', createAuthRouter())
app.use('/', createApiRouter())

// Export a Node-style handler so Vercel invokes Express directly
export default function handler(req: any, res: any) {
  return (app as any)(req, res)
}
