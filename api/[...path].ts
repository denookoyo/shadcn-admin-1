// Catch-all serverless function to serve all /api/* routes on Vercel
import express from 'express'
import { authMiddleware, createAuthRouter, createApiRouter } from './_bridge.js'

const app = express()

// Preserve original requested path when Vercel rewrites /api/(.*) to this file
app.use((req, _res, next) => {
  const originalPath = req.query?.path
  if (originalPath && typeof originalPath === 'string') {
    const searchIndex = req.url.indexOf('?')
    const queryString = searchIndex > -1 ? req.url.slice(searchIndex) : ''
    req.url = `/${originalPath}${queryString.replace(/(^\?path=[^&]*&?)|(&?path=[^&]*)/g, '').replace(/^\?&/, '?').replace(/\?$/, '')}`
    if (req.query && typeof req.query === 'object') {
      delete (req.query as Record<string, unknown>).path
    }
  }
  next()
})

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
