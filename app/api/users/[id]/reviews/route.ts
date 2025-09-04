import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../_lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sellerId = Number(params.id)
    if (!Number.isFinite(sellerId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    let avg = 0
    let count = 0
    const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    try {
      if ((prisma as any)?.orderReview?.groupBy) {
        const byRating = await (prisma as any).orderReview.groupBy({ by: ['sellerId', 'rating'], where: { sellerId }, _count: { _all: true } })
        for (const r of byRating) {
          const rt = Number(r.rating)
          const c = r._count?._all || 0
          if (histogram[rt] != null) histogram[rt] += c
          count += c
          avg += rt * c
        }
        avg = count > 0 ? avg / count : 0
      } else {
        const all = await prisma.orderReview.findMany({ where: { sellerId }, select: { rating: true } })
        for (const r of all) {
          const rt = Number(r.rating)
          if (histogram[rt] != null) histogram[rt] += 1
          count += 1
          avg += rt
        }
        avg = count > 0 ? avg / count : 0
      }
    } catch {}

    const reviews = await prisma.orderReview.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      select: {
        orderId: true,
        rating: true,
        feedback: true,
        createdAt: true,
        buyer: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    const rep = await prisma.userReputation.findUnique({ where: { userId: sellerId } })
    const negativeCount = rep?.negativeCount || 0
    const penalty = Math.min(2.5, Math.max(0, negativeCount) * 0.8)
    const composite = Math.max(1, Math.min(5, (Number.isFinite(avg) ? avg : 5) - penalty))
    return NextResponse.json({ avg, count, histogram, reviews, composite, negativeCount })
  } catch (e: any) {
    console.error('GET /api/users/:id/reviews error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
