// api/index.js
import express from 'express'
import serverless from 'serverless-http'

// If your routers are FACTORY functions (return a Router):
import { createAuthRouter } from '../server/auth.js'
import { createApiRouter } from '../server/api.js'

const app = express()

app.use(express.json())

const authRouter = createAuthRouter()
const apiRouter = createApiRouter()

app.use('/api/auth', authRouter)
app.use('/api', apiRouter)

export default serverless(app)
