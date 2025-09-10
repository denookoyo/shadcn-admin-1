import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { createApiRouter } from './api.js'
import { authMiddleware, createAuthRouter } from './auth.js'

async function start() {
  const port = Number(process.env.PORT || 5173)
  const app = express()

  app.use(express.json())
  authMiddleware(app)
  app.use('/api/auth', createAuthRouter())
  app.use('/api', createApiRouter())

  // Serve documentation at /docs from public
  app.get('/docs', (_req, res) => {
    const docPath = path.resolve(process.cwd(), 'public', 'docs', 'index.html')
    res.sendFile(docPath)
  })

  // Developer integration docs
  app.get('/docs/developers', (_req, res) => {
    const pagePath = path.resolve(process.cwd(), 'public', 'docs', 'developers', 'index.html')
    res.sendFile(pagePath)
  })

  // Serve user guide at /docs/user-guides from public
  app.get('/docs/user-guides', (_req, res) => {
    const guidePath = path.resolve(process.cwd(), 'public', 'docs', 'user-guides', 'index.html')
    res.sendFile(guidePath)
  })

  app.get('/docs/user-guides/marketplace-rules', (_req, res) => {
    const pagePath = path.resolve(process.cwd(), 'public', 'docs', 'user-guides', 'marketplace-rules.html')
    res.sendFile(pagePath)
  })

  app.get('/docs/user-guides/seller-guide', (_req, res) => {
    const pagePath = path.resolve(process.cwd(), 'public', 'docs', 'user-guides', 'seller-guide.html')
    res.sendFile(pagePath)
  })

  // Basic error logger
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled server error:', err)
    res.status(500).send('Internal Server Error')
  })

  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' })
  app.use(vite.middlewares)

  // SPA fallback for any non-API request
  app.get(/^(?!\/api).*/, async (req, res) => {
    try {
      const url = req.originalUrl
      const indexPath = path.resolve(process.cwd(), 'index.html')
      let html = fs.readFileSync(indexPath, 'utf-8')
      html = await vite.transformIndexHtml(url, html)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      vite.ssrFixStacktrace(e)
      console.error(e)
      res.status(500).end(e?.message || 'Internal error')
    }
  })

  app.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}`)
  })
}

start()
