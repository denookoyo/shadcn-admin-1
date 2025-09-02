// api/index.js
import express from 'express'
import serverless from 'serverless-http'
import { createAuthRouter } from '../server/auth.js'
import { createApiRouter } from '../server/api.js'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true })) // handle form posts

// Log to verify we hit the function
app.use((req, _res, next) => {
  console.log('[API]', req.method, req.url, req.headers['content-type'])
  next()
})

app.use('/api/auth', createAuthRouter())
app.use('/api', createApiRouter())

export default serverless(app)
