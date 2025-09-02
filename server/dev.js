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
