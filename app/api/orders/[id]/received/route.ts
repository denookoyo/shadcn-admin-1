import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../../server/prisma.js'
import { getUserFromRequest } from '../../../_lib/jwt'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const buyerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(buyerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = String(params.id)
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order || order.buyerId !== buyerId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status !== 'shipped') return NextResponse.json({ error: 'Order not in shipped status' }, { status: 400 })
    const updated = await prisma.order.update({ where: { id }, data: { status: 'completed' } })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('POST /api/orders/:id/received error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}

