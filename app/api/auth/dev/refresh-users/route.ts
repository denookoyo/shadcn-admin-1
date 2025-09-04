import { NextResponse } from 'next/server'
import { getPrisma } from '../../../../../server/prisma.js'

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    const prisma = getPrisma()
    const del = await prisma.user.deleteMany({})
    return NextResponse.json({ deleted: del.count })
  } catch (e: any) {
    console.error('POST /api/auth/dev/refresh-users error:', e)
    return NextResponse.json({ error: e?.message || 'Auth dev error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    const prisma = getPrisma()
    const del = await prisma.user.deleteMany({})
    return NextResponse.json({ deleted: del.count })
  } catch (e: any) {
    console.error('GET /api/auth/dev/refresh-users error:', e)
    return NextResponse.json({ error: e?.message || 'Auth dev error' }, { status: 500 })
  }
}

