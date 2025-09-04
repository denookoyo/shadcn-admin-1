import { NextResponse, type NextRequest } from 'next/server'
import { getPrisma } from '../../../../_lib/prisma'
import { getUserFromRequest } from '../../../../_lib/jwt'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prisma = getPrisma()
    const sess = getUserFromRequest(req)
    const sellerId = sess?.uid ? Number(sess.uid) : NaN
    if (!Number.isFinite(sellerId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = String(params.id)
    const { proposals } = await req.json()
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
    if (!order || order.sellerId !== sellerId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    const serviceItemIds = order.items.filter((it: any) => it.product?.type === 'service').map((it: any) => it.id)
    if (serviceItemIds.length === 0) return NextResponse.json({ error: 'No service items to update' }, { status: 400 })
    const alternatesJson = Array.isArray(proposals) ? JSON.stringify(proposals) : JSON.stringify([])
    await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: proposals && proposals.length ? 'proposed' : 'rejected', appointmentAlternates: alternatesJson } })
    const updated = await prisma.order.update({ where: { id }, data: { status: 'pending' } })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('POST /api/orders/:id/appointment/reject-propose error:', e)
    return NextResponse.json({ error: e?.message || 'Internal Error' }, { status: 500 })
  }
}
