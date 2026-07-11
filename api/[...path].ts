import express from 'express'
import { authMiddleware, createAuthRouter, createApiRouter } from './_bridge.js'

const app = express()

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
