import 'dotenv/config'
import path from 'path'
import express from 'express'
import sirv from 'sirv'
import { createApiRouter } from './api.js'
import { authMiddleware, createAuthRouter } from './auth.js'

const port = Number(process.env.PORT || 5173)
const app = express()

app.use(express.json())
authMiddleware(app)
app.use('/api/auth', createAuthRouter())
app.use('/api', createApiRouter())

const dist = path.resolve(process.cwd(), 'dist')

// Static docs page at /docs (copied from public/docs to dist/docs by Vite)
app.get('/docs', (_req, res) => {
  res.sendFile(path.join(dist, 'docs', 'index.html'))
})

// Developer integration docs
app.get('/docs/developers', (_req, res) => {
  res.sendFile(path.join(dist, 'docs', 'developers', 'index.html'))
})

// User guides at /docs/user-guides
app.get('/docs/user-guides', (_req, res) => {
  res.sendFile(path.join(dist, 'docs', 'user-guides', 'index.html'))
})

app.get('/docs/user-guides/marketplace-rules', (_req, res) => {
  res.sendFile(path.join(dist, 'docs', 'user-guides', 'marketplace-rules.html'))
})

app.get('/docs/user-guides/seller-guide', (_req, res) => {
  res.sendFile(path.join(dist, 'docs', 'user-guides', 'seller-guide.html'))
})

app.use(sirv(dist, { dev: false }))

// History API fallback for any non-API route
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

// Basic error logger
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled server error:', err)
  res.status(500).send('Internal Server Error')
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
