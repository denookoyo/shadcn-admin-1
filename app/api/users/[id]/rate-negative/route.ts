import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../../server/prisma.js'
import { getUserFromRequest } from '../../../_lib/jwt'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sellerId = Number(params.id)
    if (!Number.isFinite(sellerId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const { reason } = await req.json()
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }
    const sess = getUserFromRequest(req)
    const buyerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(buyerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const eligibleOrder = await prisma.order.findFirst({
      where: { buyerId, status: 'paid', items: { some: { product: { ownerId: sellerId } } } },
      select: { id: true },
    })
    if (!eligibleOrder) {
      return NextResponse.json({ error: 'Not eligible to report' }, { status: 403 })
    }

    await prisma.negativeReport.create({ data: { buyerId, sellerId, orderId: eligibleOrder.id, reason: String(reason).trim() } })
    const updated = await prisma.userReputation.upsert({
      where: { userId: sellerId },
      update: { negativeCount: { increment: 1 } },
      create: { userId: sellerId, negativeCount: 1 },
    })
    const rating = Math.max(1, 5 - (updated?.negativeCount || 0))
    return NextResponse.json({ negativeCount: updated.negativeCount, rating })
  } catch (e: any) {
    console.error('POST /api/users/:id/rate-negative error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

