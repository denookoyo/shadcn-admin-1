import fs from 'fs'
import path from 'path'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { createApiRouter } from './api'

async function start() {
  const port = Number(process.env.PORT || 5173)
  const app = express()

  // API first
  app.use(express.json())
  app.use('/api', createApiRouter())

  // Vite in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  app.use(vite.middlewares)

  // SPA fallback to index.html
  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl
      const indexPath = path.resolve(process.cwd(), 'index.html')
      let html = fs.readFileSync(indexPath, 'utf-8')
      html = await vite.transformIndexHtml(url, html)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e: any) {
      vite.ssrFixStacktrace(e)
      // eslint-disable-next-line no-console
      console.error(e)
      res.status(500).end(e?.message || 'Internal error')
    }
  })

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Dev server running at http://localhost:${port}`)
  })
}

start()

