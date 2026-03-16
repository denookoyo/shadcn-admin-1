// Catch-all serverless function to serve all /api/* routes on Vercel
import express from 'express'
import { authMiddleware, createAuthRouter, createApiRouter } from './_bridge.js'

const app = express()

// When Vercel rewrites /api/(.*) -> /api?path=$1 preserve the original path
app.use((req, _res, next) => {
  const originalPath = req.query?.path
  if (typeof originalPath === 'string' && originalPath.length) {
    const searchIndex = req.url.indexOf('?')
    const queryString = searchIndex > -1 ? req.url.slice(searchIndex) : ''
    req.url = `/${originalPath}${queryString.replace(/(^\?path=[^&]*&?)|(&?path=[^&]*)/g, '').replace(/^[?]&/, '?').replace(/\?$/, '')}`
    if (req.query && typeof req.query === 'object') {
      delete (req.query as Record<string, unknown>).path
    }
  }
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

authMiddleware(app)

app.use((req, _res, next) => {
  console.log('[API]', req.method, req.url, req.headers['content-type'])
  next()
})

app.use('/auth', createAuthRouter())
app.use('/', createApiRouter())

export default function handler(req: any, res: any) {
  return (app as any)(req, res)
}
