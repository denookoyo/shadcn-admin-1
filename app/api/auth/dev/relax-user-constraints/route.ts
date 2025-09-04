import { NextResponse } from 'next/server'
import { getPrisma } from '../../../../../server/prisma.js'

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    const prisma = getPrisma()
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ALTER COLUMN "phoneNo" DROP NOT NULL')
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ALTER COLUMN "ABN" DROP NOT NULL')
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('POST /api/auth/dev/relax-user-constraints error:', e)
    return NextResponse.json({ error: e?.message || 'DDL error' }, { status: 500 })
  }
}

