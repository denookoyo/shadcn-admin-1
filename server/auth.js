import 'dotenv/config'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import express from 'express'
import { getPrisma } from './prisma.js'

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
const client = new OAuth2Client(GOOGLE_CLIENT_ID)
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'devsecret'

export function authMiddleware(app) {
  app.use(cookieParser())
  app.use((req, _res, next) => {
    const token = req.cookies?.session
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET)
        req.user = payload
      } catch {}
    }
    next()
  })
}

export function ensureAuth(req, res, next) {
  if (!req.user?.uid && !req.user?.email) return res.status(401).send('Unauthorized')
  next()
}

export function createAuthRouter() {
  const router = express.Router()
  const prisma = getPrisma()

  router.post('/google', async (req, res) => {
    try {
      const { credential } = req.body || {}
      if (!credential) return res.status(400).send('Missing credential')
      const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
      const payload = ticket.getPayload()
      if (!payload?.sub || !payload.email) return res.status(400).send('Invalid token')
      const googleSub = payload.sub
      const email = payload.email
      const name = payload.name || null
      const image = payload.picture || null
      // Upsert by email to avoid races and ensure creation
      const user = await prisma.user.upsert({
        where: { email },
        update: { googleSub, name: name || null, image: image || null },
        // Provide defaults for legacy NOT NULL columns (phoneNo/ABN) in existing DB
        create: { email, name: name || null, image: image || null, googleSub, phoneNo: 'N/A', ABN: 'N/A', bio: null },
      })

      const token = jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
      res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.json({ id: user.id, email: user.email, name: user.name, image: user.image })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/auth/google error:', e)
      res.status(500).json({ error: e?.message || 'Auth error' })
    }
  })

  router.post('/logout', (req, res) => {
    res.clearCookie('session')
    res.status(204).end()
  })

  router.get('/me', async (req, res) => {
    if (!req.user?.email && !req.user?.uid) return res.status(200).json(null)
    try {
      const where = req.user?.email ? { email: req.user.email } : undefined
      if (!where) {
        // Old tokens might not include email and may have numeric IDs incompatible with current schema
        return res.status(200).json(null)
      }
      const user = await prisma.user.findUnique({ where })
      return res.json(user ? { id: user.id, email: user.email, name: user.name, image: user.image, phoneNo: user.phoneNo, ABN: user.ABN, bio: user.bio } : null)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/auth/me error:', e)
      // On any mismatch, clear session and force re-auth
      res.clearCookie('session')
      return res.status(200).json(null)
    }
  })

  // Update current user profile
  router.put('/me', ensureAuth, async (req, res) => {
    try {
      const { name, image, phoneNo, ABN, bio } = req.body || {}
      const hasEmail = !!req.user?.email
      const where = hasEmail ? { email: req.user.email } : { id: Number(req.user.uid) }
      const data = { name, image, phoneNo, ABN, bio }
      // Upsert to avoid 500 when record doesn't exist yet (e.g., after DB reset)
      const updated = await prisma.user.upsert({
        where,
        update: data,
        create: { email: req.user.email || `user${Date.now()}@local`, ...data },
      })
      res.json({ id: updated.id, email: updated.email, name: updated.name, image: updated.image, phoneNo: updated.phoneNo, ABN: updated.ABN, bio: updated.bio })
    } catch (e) {
      console.error('PUT /api/auth/me error:', e)
      res.status(500).json({ error: e?.message || 'Auth update error' })
    }
  })

  // Fallback for clients that use POST instead of PUT
  router.post('/me', ensureAuth, async (req, res) => {
    try {
      const { name, image, phoneNo, ABN, bio } = req.body || {}
      const hasEmail = !!req.user?.email
      const where = hasEmail ? { email: req.user.email } : { id: Number(req.user.uid) }
      const data = { name, image, phoneNo, ABN, bio }
      const updated = await prisma.user.upsert({
        where,
        update: data,
        create: { email: req.user.email || `user${Date.now()}@local`, ...data },
      })
      res.json({ id: updated.id, email: updated.email, name: updated.name, image: updated.image, phoneNo: updated.phoneNo, ABN: updated.ABN, bio: updated.bio })
    } catch (e) {
      console.error('POST /api/auth/me error:', e)
      res.status(500).json({ error: e?.message || 'Auth update error' })
    }
  })

  // DEV ONLY: refresh (truncate) the users table
  router.post('/dev/refresh-users', async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not allowed in production' })
      }
      const del = await prisma.user.deleteMany({})
      return res.json({ deleted: del.count })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/auth/dev/refresh-users error:', e)
      return res.status(500).json({ error: e?.message || 'Auth dev error' })
    }
  })

  // Convenience GET alias for dev refresh
  router.get('/dev/refresh-users', async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not allowed in production' })
      }
      const del = await prisma.user.deleteMany({})
      return res.json({ deleted: del.count })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/auth/dev/refresh-users error:', e)
      return res.status(500).json({ error: e?.message || 'Auth dev error' })
    }
  })

  // DEV ONLY: relax legacy NOT NULL constraints on User(phoneNo, ABN)
  router.post('/dev/relax-user-constraints', async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not allowed in production' })
      }
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ALTER COLUMN "phoneNo" DROP NOT NULL')
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ALTER COLUMN "ABN" DROP NOT NULL')
      return res.json({ ok: true })
    } catch (e) {
      console.error('POST /api/auth/dev/relax-user-constraints error:', e)
      return res.status(500).json({ error: e?.message || 'DDL error' })
    }
  })

  return router
}
