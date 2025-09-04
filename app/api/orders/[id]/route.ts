import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../server/prisma.js'
import { getUserFromRequest } from '../../_lib/jwt'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const id = String(params.id)
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, buyer: true, seller: true },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const sess = getUserFromRequest(_req)
    const uid = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(uid)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isBuyer = order.buyerId === uid
    const isSeller = order.sellerId === uid || order.items.some((it: any) => it.product?.ownerId === uid)
    if (!isBuyer && !isSeller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json(order)
  } catch (e: any) {
    console.error('GET /api/orders/:id error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

