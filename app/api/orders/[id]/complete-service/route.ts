import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../_lib/prisma'
import { getUserFromRequest } from '../../../_lib/jwt'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const sellerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(sellerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = String(params.id)
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order || order.sellerId !== sellerId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    const updated = await prisma.order.update({ where: { id }, data: { status: 'completed' } })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('POST /api/orders/:id/complete-service error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
