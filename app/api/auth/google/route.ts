import { NextResponse, type NextRequest } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { getPrisma } from '../../../../server/prisma.js'
import { signSession } from '../../_lib/jwt'

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
const client = new OAuth2Client(GOOGLE_CLIENT_ID)

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()
    if (!credential) return NextResponse.json({ error: 'Missing credential' }, { status: 400 })
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    const googleSub = payload.sub
    const email = payload.email
    const name = payload.name || null
    const image = payload.picture || null

    const prisma = getPrisma()
    const user = await prisma.user.upsert({
      where: { email },
      update: { googleSub, name: name || null, image: image || null },
      create: { email, name: name || null, image: image || null, googleSub, phoneNo: 'N/A', ABN: 'N/A', bio: null },
    })

    const token = signSession({ uid: user.id, email: user.email })
    const res = NextResponse.json({ id: user.id, email: user.email, name: user.name, image: user.image })
    res.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (e: any) {
    console.error('POST /api/auth/google error:', e)
    return NextResponse.json({ error: e?.message || 'Auth error' }, { status: 500 })
  }
}

