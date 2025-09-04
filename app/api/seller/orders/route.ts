import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../_lib/prisma'
import { getUserFromRequest } from '../../_lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const sellerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(sellerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { sellerId },
          { items: { some: { product: { ownerId: sellerId } } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, buyer: true },
    })
    return NextResponse.json(orders)
  } catch (e: any) {
    console.error('GET /api/seller/orders error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
