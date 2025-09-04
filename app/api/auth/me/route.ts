import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../server/prisma.js'
import { getUserFromRequest } from '../../_lib/jwt'

export async function GET(req: NextRequest) {
  const sess = getUserFromRequest(req)
  if (!sess?.email && !sess?.uid) return NextResponse.json(null)
  try {
    const prisma = getPrisma()
    const where = sess.email ? { email: sess.email } : undefined
    if (!where) return NextResponse.json(null)
    const user = await prisma.user.findUnique({ where })
    return NextResponse.json(user ? { id: user.id, email: user.email, name: user.name, image: user.image, phoneNo: user.phoneNo, ABN: user.ABN, bio: user.bio } : null)
  } catch (e: any) {
    console.error('GET /api/auth/me error:', e)
    const res = NextResponse.json(null)
    res.cookies.set('session', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' })
    return res
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.email && !sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { name, image, phoneNo, ABN, bio } = await req.json()
    const prisma = getPrisma()
    const hasEmail = !!sess.email
    const where: any = hasEmail ? { email: sess.email } : { id: Number(sess.uid) }
    const data = { name, image, phoneNo, ABN, bio }
    const updated = await prisma.user.upsert({ where, update: data, create: { email: sess.email || `user${Date.now()}@local`, ...data } })
    return NextResponse.json({ id: updated.id, email: updated.email, name: updated.name, image: updated.image, phoneNo: updated.phoneNo, ABN: updated.ABN, bio: updated.bio })
  } catch (e: any) {
    console.error('PUT /api/auth/me error:', e)
    return NextResponse.json({ error: e?.message || 'Auth update error' }, { status: 500 })
  }
}

// Fallback for clients that use POST instead of PUT
export async function POST(req: NextRequest) {
  try {
    const sess = getUserFromRequest(req)
    if (!sess?.email && !sess?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { name, image, phoneNo, ABN, bio } = await req.json()
    const prisma = getPrisma()
    const hasEmail = !!sess.email
    const where: any = hasEmail ? { email: sess.email } : { id: Number(sess.uid) }
    const data = { name, image, phoneNo, ABN, bio }
    const updated = await prisma.user.upsert({ where, update: data, create: { email: sess.email || `user${Date.now()}@local`, ...data } })
    return NextResponse.json({ id: updated.id, email: updated.email, name: updated.name, image: updated.image, phoneNo: updated.phoneNo, ABN: updated.ABN, bio: updated.bio })
  } catch (e: any) {
    console.error('POST /api/auth/me error:', e)
    return NextResponse.json({ error: e?.message || 'Auth update error' }, { status: 500 })
  }
}

