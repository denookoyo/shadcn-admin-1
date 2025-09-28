import 'dotenv/config'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import express from 'express'
import { Prisma } from '@prisma/client'
import { getPrisma } from './prisma.js'
import { authenticator } from 'otplib'

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
const client = new OAuth2Client(GOOGLE_CLIENT_ID)
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'devsecret'
const ALLOWED_DOMAINS = (process.env.ALLOWED_GOOGLE_DOMAINS || '').split(',').map((s) => s.trim()).filter(Boolean)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

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
      // Optional domain restriction
      if (ALLOWED_DOMAINS.length > 0) {
        const domain = String(email.split('@')[1] || '').toLowerCase()
        const ok = ALLOWED_DOMAINS.includes(domain)
        if (!ok) return res.status(403).json({ error: 'Email domain not allowed' })
      }
      // Assign role: admin if email in ADMIN_EMAILS else driver by default
      const role = ADMIN_EMAILS.includes(String(email).toLowerCase()) ? 'admin' : 'driver'
      // Upsert by email to avoid races and ensure creation
      const baseUpdate = { googleSub, name: name || null, image: image || null }
      const baseCreate = { email, name: name || null, image: image || null, googleSub, phoneNo: 'N/A', ABN: 'N/A', bio: null }

      let user
      try {
        user = await prisma.user.upsert({
          where: { email },
          update: { ...baseUpdate, role },
          create: { ...baseCreate, role },
        })
      } catch (err) {
        // Some legacy databases may not yet have the `role` column; fall back gracefully
        if (err instanceof Prisma.PrismaClientValidationError && err.message.includes('Unknown argument `role`')) {
          user = await prisma.user.upsert({
            where: { email },
            update: baseUpdate,
            create: baseCreate,
          })
        } else {
          throw err
        }
      }

      // If MFA is enabled, set a temporary cookie and require OTP verification
      if (user.mfaEnabled && user.mfaSecret) {
        const pending = jwt.sign({ uid: user.id, email: user.email, mfa: true }, JWT_SECRET, { expiresIn: '10m' })
        res.cookie('mfa', pending, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 10 * 60 * 1000 })
        return res.json({ mfaRequired: true })
      }

      const token = jwt.sign({ uid: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
      res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.json({ id: user.id, email: user.email, name: user.name, image: user.image, role: user.role })
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
      return res.json(
        user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              phoneNo: user.phoneNo,
              ABN: user.ABN,
              bio: user.bio,
              mfaEnabled: Boolean(user.mfaEnabled),
              role: user.role,
            }
          : null
      )
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
      res.json({ id: updated.id, email: updated.email, name: updated.name, image: updated.image, phoneNo: updated.phoneNo, ABN: updated.ABN, bio: updated.bio, mfaEnabled: Boolean(updated.mfaEnabled), role: updated.role })
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
      res.json({ id: updated.id, email: updated.email, name: updated.name, image: updated.image, phoneNo: updated.phoneNo, ABN: updated.ABN, bio: updated.bio, mfaEnabled: Boolean(updated.mfaEnabled), role: updated.role })
    } catch (e) {
      console.error('POST /api/auth/me error:', e)
      res.status(500).json({ error: e?.message || 'Auth update error' })
    }
  })

  // 2FA: Get status for current user
  router.get('/mfa/status', ensureAuth, async (req, res) => {
    try {
      const where = req.user?.email ? { email: req.user.email } : { id: Number(req.user.uid) }
      const user = await prisma.user.findUnique({ where })
      return res.json({ enabled: Boolean(user?.mfaEnabled) })
    } catch (e) {
      console.error('GET /api/auth/mfa/status error:', e)
      res.status(500).json({ error: e?.message || 'MFA status error' })
    }
  })

  // 2FA: Begin setup, generate secret & otpauth URL
  router.post('/mfa/setup', ensureAuth, async (req, res) => {
    try {
      const where = req.user?.email ? { email: req.user.email } : { id: Number(req.user.uid) }
      const user = await prisma.user.findUnique({ where })
      const labelEmail = user?.email || 'user@example.com'
      // Use crypto to generate seed, then Base32 via otplib
      const secret = authenticator.generateSecret()
      const serviceName = process.env.MFA_ISSUER || 'Hedgetech Marketplace'
      const otpauth = authenticator.keyuri(labelEmail, serviceName, secret)
      await prisma.user.update({ where, data: { mfaTempSecret: secret } })
      res.json({ secret, otpauth })
    } catch (e) {
      console.error('POST /api/auth/mfa/setup error:', e)
      res.status(500).json({ error: e?.message || 'MFA setup error' })
    }
  })

  // 2FA: Enable with verification token
  router.post('/mfa/enable', ensureAuth, async (req, res) => {
    try {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'Missing token' })
      const where = req.user?.email ? { email: req.user.email } : { id: Number(req.user.uid) }
      const user = await prisma.user.findUnique({ where })
      const secret = user?.mfaTempSecret
      if (!secret) return res.status(400).json({ error: 'No setup in progress' })
      const isValid = authenticator.verify({ token: String(token), secret })
      if (!isValid) return res.status(400).json({ error: 'Invalid code' })
      const updated = await prisma.user.update({ where, data: { mfaSecret: secret, mfaEnabled: true, mfaTempSecret: null } })
      res.json({ enabled: true })
    } catch (e) {
      console.error('POST /api/auth/mfa/enable error:', e)
      res.status(500).json({ error: e?.message || 'MFA enable error' })
    }
  })

  // 2FA: Disable (requires valid current token)
  router.post('/mfa/disable', ensureAuth, async (req, res) => {
    try {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'Missing token' })
      const where = req.user?.email ? { email: req.user.email } : { id: Number(req.user.uid) }
      const user = await prisma.user.findUnique({ where })
      const secret = user?.mfaSecret
      if (!secret) return res.status(400).json({ error: 'MFA not enabled' })
      const isValid = authenticator.verify({ token: String(token), secret })
      if (!isValid) return res.status(400).json({ error: 'Invalid code' })
      await prisma.user.update({ where, data: { mfaSecret: null, mfaEnabled: false, mfaTempSecret: null } })
      res.json({ enabled: false })
    } catch (e) {
      console.error('POST /api/auth/mfa/disable error:', e)
      res.status(500).json({ error: e?.message || 'MFA disable error' })
    }
  })

  // 2FA: Verify during login (uses temporary cookie)
  router.post('/mfa/verify', async (req, res) => {
    try {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'Missing token' })
      const pending = req.cookies?.mfa
      if (!pending) return res.status(401).json({ error: 'No pending MFA' })
      let payload
      try {
        payload = jwt.verify(pending, JWT_SECRET)
      } catch {
        return res.status(401).json({ error: 'MFA expired' })
      }
      if (!payload?.uid || !payload?.email || !payload?.mfa) return res.status(401).json({ error: 'Invalid MFA session' })
      const prisma = getPrisma()
      const where = { email: payload.email }
      const user = await prisma.user.findUnique({ where })
      if (!user?.mfaEnabled || !user.mfaSecret) return res.status(400).json({ error: 'MFA not enabled' })
      const isValid = authenticator.verify({ token: String(token), secret: user.mfaSecret })
      if (!isValid) return res.status(400).json({ error: 'Invalid code' })
      // Issue a full session and clear pending MFA
      const session = jwt.sign({ uid: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
      res.clearCookie('mfa')
      res.cookie('session', session, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.json({ id: user.id, email: user.email, name: user.name, image: user.image, role: user.role })
    } catch (e) {
      console.error('POST /api/auth/mfa/verify error:', e)
      res.status(500).json({ error: e?.message || 'MFA verify error' })
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
