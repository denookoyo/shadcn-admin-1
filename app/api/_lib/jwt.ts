import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

export type SessionUser = { uid?: number; email?: string }

export function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'devsecret'
}

export function signSession(payload: SessionUser) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token) return null
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser
  } catch {
    return null
  }
}

export function getUserFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get('session')?.value
  return verifySessionToken(token)
}

