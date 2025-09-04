import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../server/prisma.js'
import { } from '../../_lib/jwt'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, image: true, createdAt: true, phoneNo: true, ABN: true } })
    if (!user) return NextResponse.json(null, { status: 404 })
    const rep = await prisma.userReputation.findUnique({ where: { userId: id } })
    let avg = 5
    try {
      const a = await prisma.orderReview.aggregate({ where: { sellerId: id }, _avg: { rating: true } })
      avg = a?._avg?.rating || 5
    } catch {}
    const negativeCount = rep?.negativeCount || 0
    const penalty = Math.min(2.5, Math.max(0, negativeCount) * 0.8)
    const rating = Math.max(1, Math.min(5, (Number.isFinite(avg) ? avg : 5) - penalty))
    return NextResponse.json({ ...user, rating, averageRating: avg, negativeCount })
  } catch (e: any) {
    console.error('GET /api/users/:id error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

