import path from 'path'
import express from 'express'
import sirv from 'sirv'
import { createApiRouter } from './api'

const port = Number(process.env.PORT || 5173)
const app = express()

app.use(express.json())
app.use('/api', createApiRouter())

const dist = path.resolve(process.cwd(), 'dist')
app.use(sirv(dist, { dev: false }))

// History API fallback: always serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${port}`)
})

